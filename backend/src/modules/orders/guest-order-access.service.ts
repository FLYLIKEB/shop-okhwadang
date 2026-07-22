import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { applyLocale } from '../../common/utils/locale.util';
import { LookupGuestOrderDto } from './dto/lookup-guest-order.dto';
import { GuestOrderAccess } from './entities/guest-order-access.entity';
import { Order } from './entities/order.entity';

const GUEST_ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GUEST_ACCESS_UNAUTHORIZED_MESSAGE = '비회원 주문 접근 토큰이 유효하지 않습니다.';

type GuestAccessIssueResult = {
  access: GuestOrderAccess;
  guestAccessToken: string;
  guestAccessTokenExpiresAt: Date;
};

@Injectable()
export class GuestOrderAccessService {
  private readonly logger = new Logger(GuestOrderAccessService.name);

  constructor(
    @InjectRepository(GuestOrderAccess)
    private readonly guestOrderAccessRepository: Repository<GuestOrderAccess>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async issueAccessToken(orderId: number, manager?: EntityManager): Promise<GuestAccessIssueResult> {
    const now = new Date();
    const guestAccessToken = randomBytes(32).toString('hex');
    const guestAccessTokenExpiresAt = new Date(now.getTime() + GUEST_ACCESS_TOKEN_TTL_MS);
    const repository = this.getGuestOrderAccessRepository(manager);

    const access = repository.create({
      orderId,
      tokenDigest: this.hashToken(guestAccessToken),
      expiresAt: guestAccessTokenExpiresAt,
      supersededAt: null,
      supersededById: null,
    });

    const savedAccess = await repository.save(access);
    return {
      access: savedAccess,
      guestAccessToken,
      guestAccessTokenExpiresAt,
    };
  }

  async getValidAccessOrThrow(
    orderId: number,
    rawToken: string | null | undefined,
    manager?: EntityManager,
  ): Promise<GuestOrderAccess> {
    const token = this.normalizePresentedToken(rawToken);
    const access = await this.getGuestOrderAccessRepository(manager).findOne({
      where: {
        orderId,
        tokenDigest: this.hashToken(token),
      },
    });

    if (!access || access.supersededAt || access.supersededById || access.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(GUEST_ACCESS_UNAUTHORIZED_MESSAGE);
    }

    return access;
  }

  async getOrderForAccessOrThrow(
    orderId: number,
    rawToken: string | null | undefined,
    locale?: string,
    manager?: EntityManager,
  ): Promise<Order> {
    await this.getValidAccessOrThrow(orderId, rawToken, manager);

    const order = await this.getOrderRepository(manager)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.option', 'option')
      .where('order.id = :id', { id: orderId })
      .getOne();

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    return this.localizeOrder(order, locale);
  }

  async lookupOrderOrThrow(dto: LookupGuestOrderDto): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.option', 'option')
      .where('order.orderNumber = :orderNumber', { orderNumber: dto.orderNumber.trim() })
      .andWhere('order.guestEmailNormalized = :guestEmailNormalized', {
        guestEmailNormalized: this.normalizeEmail(dto.email),
      })
      .getOne();

    if (!order) {
      throw new NotFoundException('주문 번호와 이메일이 일치하는 주문을 찾을 수 없습니다.');
    }

    return this.localizeOrder(order, dto.locale);
  }

  async lookupAndIssueAccessToken(
    dto: LookupGuestOrderDto,
  ): Promise<GuestAccessIssueResult & { order: Order }> {
    const matchedOrder = await this.lookupOrderOrThrow(dto);

    return this.withOrderAccessLock(matchedOrder.id, async (manager) => {
      const repository = this.getGuestOrderAccessRepository(manager);
      const order = await this.getOrderRepository(manager)
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'item')
        .leftJoinAndSelect('item.product', 'product')
        .leftJoinAndSelect('item.option', 'option')
        .where('order.id = :orderId', { orderId: matchedOrder.id })
        .andWhere('order.orderNumber = :orderNumber', { orderNumber: dto.orderNumber.trim() })
        .andWhere('order.guestEmailNormalized = :guestEmailNormalized', {
          guestEmailNormalized: this.normalizeEmail(dto.email),
        })
        .getOne();

      if (!order) {
        throw new NotFoundException('주문 번호와 이메일이 일치하는 주문을 찾을 수 없습니다.');
      }

      const currentActiveAccess = await repository
        .createQueryBuilder('guestOrderAccess')
        .setLock('pessimistic_write')
        .where('guestOrderAccess.orderId = :orderId', { orderId: order.id })
        .andWhere('guestOrderAccess.supersededAt IS NULL')
        .getOne();

      const issued = await this.issueAccessToken(order.id, manager);
      if (currentActiveAccess && currentActiveAccess.expiresAt.getTime() > Date.now()) {
        currentActiveAccess.supersededAt = new Date();
        currentActiveAccess.supersededById = issued.access.id;
        await repository.save(currentActiveAccess);
      }

      return {
        order: this.localizeOrder(order, dto.locale),
        ...issued,
      };
    });
  }

  async rotateAccessTokenForOrder(
    orderId: number,
    currentRawToken: string,
    manager: EntityManager,
  ): Promise<GuestAccessIssueResult> {
    if (!manager.queryRunner) {
      throw new InternalServerErrorException('게스트 주문 접근 토큰 회전에는 QueryRunner가 필요합니다.');
    }

    const repository = this.getGuestOrderAccessRepository(manager);
    const currentTokenDigest = this.hashToken(this.normalizePresentedToken(currentRawToken));
    const currentAccess = await repository
      .createQueryBuilder('guestOrderAccess')
      .setLock('pessimistic_write')
      .where('guestOrderAccess.orderId = :orderId', { orderId })
      .andWhere('guestOrderAccess.tokenDigest = :tokenDigest', { tokenDigest: currentTokenDigest })
      .getOne();

    if (
      !currentAccess
      || currentAccess.supersededAt
      || currentAccess.supersededById
      || currentAccess.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException(GUEST_ACCESS_UNAUTHORIZED_MESSAGE);
    }

    const issued = await this.issueAccessToken(orderId, manager);
    currentAccess.supersededAt = new Date();
    currentAccess.supersededById = issued.access.id;
    await repository.save(currentAccess);

    return issued;
  }

  async withOrderAccessLock<T>(orderId: number, operation: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await this.acquireOrderAccessLock(queryRunner, orderId);
      await queryRunner.startTransaction();

      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await this.releaseOrderAccessLock(queryRunner, orderId);
      await queryRunner.release();
    }
  }

  private getGuestOrderAccessRepository(manager?: EntityManager): Repository<GuestOrderAccess> {
    return manager ? manager.getRepository(GuestOrderAccess) : this.guestOrderAccessRepository;
  }

  private getOrderRepository(manager?: EntityManager): Repository<Order> {
    return manager ? manager.getRepository(Order) : this.orderRepository;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizePresentedToken(rawToken: string | null | undefined): string {
    const token = rawToken?.trim();
    if (!token) {
      throw new UnauthorizedException(GUEST_ACCESS_UNAUTHORIZED_MESSAGE);
    }

    return token;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async acquireOrderAccessLock(
    queryRunner: QueryRunner,
    orderId: number,
  ): Promise<void> {
    const rows = await queryRunner.query('SELECT GET_LOCK(?, 10) AS acquired', [
      this.orderAccessLockName(orderId),
    ]) as Array<{ acquired?: number | string }>;

    const acquired = rows[0]?.acquired;

    if (Number(acquired) !== 1) {
      throw new ConflictException('비회원 주문 조회가 이미 진행 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  private async releaseOrderAccessLock(queryRunner: QueryRunner, orderId: number): Promise<void> {

    try {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [this.orderAccessLockName(orderId)]);
    } catch (error) {
      this.logger.warn(`Failed to release guest order access lock for order ${orderId}: ${String(error)}`);
    }
  }

  private orderAccessLockName(orderId: number): string {
    return `guest-order-access:${orderId}`;
  }

  private localizeOrder(order: Order, locale?: string): Order {
    if (!locale || locale === 'ko') {
      return order;
    }

    const localizedItems = order.items?.map((item) => {
      const localizedProduct = item.product
        ? applyLocale(item.product, locale, ['name'])
        : item.product;
      const localizedOption = item.option
        ? applyLocale(item.option, locale, ['name', 'value'])
        : item.option;

      return {
        ...item,
        product: localizedProduct,
        option: localizedOption,
        productName: localizedProduct?.name || item.productName,
        optionName: localizedOption
          ? `${localizedOption.name}: ${localizedOption.value}`
          : item.optionName,
      };
    });

    return { ...order, items: localizedItems ?? [] };
  }
}

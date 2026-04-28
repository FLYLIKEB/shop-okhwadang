import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { ExportQueryDto } from './dto/export-query.dto';

const EXPORT_BATCH_SIZE = 500;

type ExportRow = Record<string, string | number | boolean | null>;

interface ExportPipelineOptions<T extends ObjectLiteral> {
  format: 'csv' | 'xlsx';
  filenamePrefix: string;
  sheetName: string;
  headerRow: string[];
  columns: string[];
  queryBuilder: SelectQueryBuilder<T>;
  mapRow: (entity: T) => ExportRow;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
}

@Injectable()
export class AdminExportService {
  private readonly logger = new Logger(AdminExportService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async exportOrders(query: ExportQueryDto, res: Response): Promise<void> {
    const isMask = query.mask === 'true';
    const format = query.format ?? 'csv';

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'ASC');

    if (query.from) {
      qb.andWhere('order.createdAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('order.createdAt <= :to', { to: `${query.to} 23:59:59` });
    }

    await this.exportWithPipeline(res, {
      format,
      filenamePrefix: 'orders',
      sheetName: '주문',
      headerRow: ['ID', '주문번호', '상태', '수령인', '전화번호', '우편번호', '주소', '총금액', '할인금액', '배송비', '회원이메일', '생성일'],
      columns: ['id', 'orderNumber', 'status', 'recipientName', 'recipientPhone', 'zipcode', 'address', 'totalAmount', 'discountAmount', 'shippingFee', 'userEmail', 'createdAt'],
      queryBuilder: qb,
      mapRow: (order) => this.mapOrderRow(order, isMask),
    });

    this.logger.log(`Orders exported: format=${format}, mask=${isMask}`);
  }

  async exportMembers(query: ExportQueryDto, res: Response): Promise<void> {
    const isMask = query.mask === 'true';
    const format = query.format ?? 'csv';

    const qb = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'ASC');

    await this.exportWithPipeline(res, {
      format,
      filenamePrefix: 'members',
      sheetName: '회원',
      headerRow: ['ID', '이메일', '이름', '전화번호', '역할', '활성여부', '생성일'],
      columns: ['id', 'email', 'name', 'phone', 'role', 'isActive', 'createdAt'],
      queryBuilder: qb,
      mapRow: (user) => this.mapMemberRow(user, isMask),
    });

    this.logger.log(`Members exported: format=${format}, mask=${isMask}`);
  }

  async exportProducts(query: ExportQueryDto, res: Response): Promise<void> {
    const format = query.format ?? 'csv';

    const qb = this.productRepository
      .createQueryBuilder('product')
      .orderBy('product.createdAt', 'ASC');

    await this.exportWithPipeline(res, {
      format,
      filenamePrefix: 'products',
      sheetName: '상품',
      headerRow: ['ID', 'SKU', '이름', '가격', '판매가', '재고', '상태', '추천여부', '생성일'],
      columns: ['id', 'sku', 'name', 'price', 'salePrice', 'stock', 'status', 'isFeatured', 'createdAt'],
      queryBuilder: qb,
      mapRow: (product) => this.mapProductRow(product),
    });

    this.logger.log(`Products exported: format=${format}`);
  }

  private async exportWithPipeline<T extends ObjectLiteral>(res: Response, options: ExportPipelineOptions<T>): Promise<void> {
    const filename = `${options.filenamePrefix}_${Date.now()}`;
    if (options.format === 'xlsx') {
      await this.streamAsXlsx(res, filename, options);
      return;
    }

    await this.streamAsCsv(res, filename, options);
  }

  private async streamAsCsv<T extends ObjectLiteral>(
    res: Response,
    filename: string,
    options: ExportPipelineOptions<T>,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

    const stringifier = stringify({
      header: true,
      columns: options.columns,
    });
    stringifier.pipe(res);

    await this.iterateInBatches(options.queryBuilder, EXPORT_BATCH_SIZE, async (row) => {
      stringifier.write(options.mapRow(row));
    });

    stringifier.end();
  }

  private async streamAsXlsx<T extends ObjectLiteral>(
    res: Response,
    filename: string,
    options: ExportPipelineOptions<T>,
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const sheet = workbook.addWorksheet(options.sheetName);
    sheet.addRow(options.headerRow);

    await this.iterateInBatches(options.queryBuilder, EXPORT_BATCH_SIZE, async (row) => {
      const rowData = options.mapRow(row);
      sheet.addRow(options.columns.map((column) => rowData[column]));
    });

    await workbook.commit();
  }

  private async iterateInBatches<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    batchSize: number,
    handler: (row: T) => Promise<void> | void,
  ): Promise<void> {
    let skip = 0;

    while (true) {
      const rows = await qb.skip(skip).take(batchSize).getMany();
      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        await handler(row);
      }

      skip += batchSize;
      if (rows.length < batchSize) {
        break;
      }
    }
  }

  private mapOrderRow(order: Order, isMask: boolean): ExportRow {
    const phone = isMask ? maskPhone(order.recipientPhone) : order.recipientPhone;
    const email = isMask && order.user?.email ? maskEmail(order.user.email) : (order.user?.email ?? '');

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      recipientName: order.recipientName,
      recipientPhone: phone,
      zipcode: order.zipcode,
      address: order.address,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      shippingFee: order.shippingFee,
      userEmail: email,
      createdAt: order.createdAt.toISOString(),
    };
  }

  private mapMemberRow(user: User, isMask: boolean): ExportRow {
    const email = isMask ? maskEmail(user.email) : user.email;
    const phone = isMask && user.phone ? maskPhone(user.phone) : (user.phone ?? '');

    return {
      id: user.id,
      email,
      name: user.name,
      phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private mapProductRow(product: Product): ExportRow {
    return {
      id: product.id,
      sku: product.sku ?? '',
      name: product.name,
      price: product.price,
      salePrice: product.salePrice ?? '',
      stock: product.stock,
      status: product.status,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt.toISOString(),
    };
  }
}

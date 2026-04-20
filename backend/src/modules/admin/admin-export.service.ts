import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { ExportQueryDto } from './dto/export-query.dto';

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

    const filename = `orders_${Date.now()}`;

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const sheet = workbook.addWorksheet('주문');
      sheet.addRow(['ID', '주문번호', '상태', '수령인', '전화번호', '우편번호', '주소', '총금액', '할인금액', '배송비', '회원이메일', '생성일']);

      const batchSize = 500;
      let skip = 0;
      while (true) {
        const rows = await qb.skip(skip).take(batchSize).getMany();
        if (rows.length === 0) break;
        for (const o of rows) {
          const phone = isMask ? maskPhone(o.recipientPhone) : o.recipientPhone;
          const email = isMask && o.user?.email ? maskEmail(o.user.email) : (o.user?.email ?? '');
          sheet.addRow([
            o.id, o.orderNumber, o.status, o.recipientName,
            phone, o.zipcode, o.address,
            o.totalAmount, o.discountAmount, o.shippingFee,
            email, o.createdAt.toISOString(),
          ]);
        }
        skip += batchSize;
        if (rows.length < batchSize) break;
      }

      await workbook.commit();
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

      const stringifier = stringify({
        header: true,
        columns: ['id', 'orderNumber', 'status', 'recipientName', 'recipientPhone', 'zipcode', 'address', 'totalAmount', 'discountAmount', 'shippingFee', 'userEmail', 'createdAt'],
      });
      stringifier.pipe(res);

      const batchSize = 500;
      let skip = 0;
      while (true) {
        const rows = await qb.skip(skip).take(batchSize).getMany();
        if (rows.length === 0) break;
        for (const o of rows) {
          const phone = isMask ? maskPhone(o.recipientPhone) : o.recipientPhone;
          const email = isMask && o.user?.email ? maskEmail(o.user.email) : (o.user?.email ?? '');
          stringifier.write({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            recipientName: o.recipientName,
            recipientPhone: phone,
            zipcode: o.zipcode,
            address: o.address,
            totalAmount: o.totalAmount,
            discountAmount: o.discountAmount,
            shippingFee: o.shippingFee,
            userEmail: email,
            createdAt: o.createdAt.toISOString(),
          });
        }
        skip += batchSize;
        if (rows.length < batchSize) break;
      }

      stringifier.end();
    }

    this.logger.log(`Orders exported: format=${format}, mask=${isMask}`);
  }

  async exportMembers(query: ExportQueryDto, res: Response): Promise<void> {
    const isMask = query.mask === 'true';
    const format = query.format ?? 'csv';

    const qb = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'ASC');

    const filename = `members_${Date.now()}`;

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const sheet = workbook.addWorksheet('회원');
      sheet.addRow(['ID', '이메일', '이름', '전화번호', '역할', '활성여부', '생성일']);

      const batchSize = 500;
      let skip = 0;
      while (true) {
        const rows = await qb.skip(skip).take(batchSize).getMany();
        if (rows.length === 0) break;
        for (const u of rows) {
          const email = isMask ? maskEmail(u.email) : u.email;
          const phone = isMask && u.phone ? maskPhone(u.phone) : (u.phone ?? '');
          sheet.addRow([u.id, email, u.name, phone, u.role, u.isActive, u.createdAt.toISOString()]);
        }
        skip += batchSize;
        if (rows.length < batchSize) break;
      }

      await workbook.commit();
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

      const stringifier = stringify({
        header: true,
        columns: ['id', 'email', 'name', 'phone', 'role', 'isActive', 'createdAt'],
      });
      stringifier.pipe(res);

      const batchSize = 500;
      let skip = 0;
      while (true) {
        const rows = await qb.skip(skip).take(batchSize).getMany();
        if (rows.length === 0) break;
        for (const u of rows) {
          const email = isMask ? maskEmail(u.email) : u.email;
          const phone = isMask && u.phone ? maskPhone(u.phone) : (u.phone ?? '');
          stringifier.write({
            id: u.id,
            email,
            name: u.name,
            phone,
            role: u.role,
            isActive: u.isActive,
            createdAt: u.createdAt.toISOString(),
          });
        }
        skip += batchSize;
        if (rows.length < batchSize) break;
      }

      stringifier.end();
    }

    this.logger.log(`Members exported: format=${format}, mask=${isMask}`);
  }

  async exportProducts(query: ExportQueryDto, res: Response): Promise<void> {
    const format = query.format ?? 'csv';

    const qb = this.productRepository
      .createQueryBuilder('product')
      .orderBy('product.createdAt', 'ASC');

    const filename = `products_${Date.now()}`;

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const sheet = workbook.addWorksheet('상품');
      sheet.addRow(['ID', 'SKU', '이름', '가격', '판매가', '재고', '상태', '추천여부', '생성일']);

      const batchSize = 500;
      let skip = 0;
      while (true) {
        const rows = await qb.skip(skip).take(batchSize).getMany();
        if (rows.length === 0) break;
        for (const p of rows) {
          sheet.addRow([
            p.id, p.sku ?? '', p.name, p.price, p.salePrice ?? '',
            p.stock, p.status, p.isFeatured, p.createdAt.toISOString(),
          ]);
        }
        skip += batchSize;
        if (rows.length < batchSize) break;
      }

      await workbook.commit();
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

      const stringifier = stringify({
        header: true,
        columns: ['id', 'sku', 'name', 'price', 'salePrice', 'stock', 'status', 'isFeatured', 'createdAt'],
      });
      stringifier.pipe(res);

      const batchSize = 500;
      let skip = 0;
      while (true) {
        const rows = await qb.skip(skip).take(batchSize).getMany();
        if (rows.length === 0) break;
        for (const p of rows) {
          stringifier.write({
            id: p.id,
            sku: p.sku ?? '',
            name: p.name,
            price: p.price,
            salePrice: p.salePrice ?? '',
            stock: p.stock,
            status: p.status,
            isFeatured: p.isFeatured,
            createdAt: p.createdAt.toISOString(),
          });
        }
        skip += batchSize;
        if (rows.length < batchSize) break;
      }

      stringifier.end();
    }

    this.logger.log(`Products exported: format=${format}`);
  }
}

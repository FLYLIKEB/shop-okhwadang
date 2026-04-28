import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { AdminExportController } from './admin-export.controller';
import { AdminExportService } from './admin-export.service';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping } from '../payments/entities/shipping.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { PaymentsModule } from '../payments/payments.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { MembershipModule } from '../membership/membership.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Payment, Shipping, User, Product]),
    PaymentsModule,
    AuditLogModule,
    MembershipModule,
    PointsModule,
  ],
  controllers: [AdminController, AdminDashboardController, AdminOrdersController, AdminMembersController, AdminExportController],
  providers: [AdminService, AdminDashboardService, AdminOrdersService, AdminMembersService, AdminExportService],
})
export class AdminModule {}

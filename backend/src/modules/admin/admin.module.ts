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
import { AdminLocalizationController } from './admin-localization.controller';
import { AdminLogsController } from './admin-logs.controller';
import { AdminExportService } from './admin-export.service';
import { AdminLocalizationService } from './admin-localization.service';
import { AdminLogsService } from './admin-logs.service';
import { Order } from '../orders/entities/order.entity';
import { OrderServiceRequest } from '../orders/entities/order-service-request.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping } from '../payments/entities/shipping.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../products/entities/category.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { Page } from '../pages/entities/page.entity';
import { PageBlock } from '../pages/entities/page-block.entity';
import { NavigationItem } from '../navigation/entities/navigation-item.entity';
import { ExternalReview } from '../reviews/entities/external-review.entity';
import { PaymentsModule } from '../payments/payments.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { MembershipModule } from '../membership/membership.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderServiceRequest,
      Payment,
      Shipping,
      User,
      Product,
      Category,
      ProductOption,
      Page,
      PageBlock,
      NavigationItem,
      ExternalReview,
    ]),
    PaymentsModule,
    AuditLogModule,
    MembershipModule,
    PointsModule,
  ],
  controllers: [
    AdminController,
    AdminDashboardController,
    AdminOrdersController,
    AdminMembersController,
    AdminExportController,
    AdminLocalizationController,
    AdminLogsController,
  ],
  providers: [
    AdminService,
    AdminDashboardService,
    AdminOrdersService,
    AdminMembersService,
    AdminExportService,
    AdminLocalizationService,
    AdminLogsService,
  ],
})
export class AdminModule {}

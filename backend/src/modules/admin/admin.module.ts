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
import { AdminMessageDeliveriesController } from './admin-message-deliveries.controller';
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
import { NotificationModule } from '../notification/notification.module';
import { NotificationLog } from '../notification/entities/notification-log.entity';
import { MessageEffectOutbox } from '../notification/entities/message-effect-outbox.entity';
import { PaymentEffectOutbox } from '../payments/entities/payment-effect-outbox.entity';

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
      NotificationLog,
      MessageEffectOutbox,
      PaymentEffectOutbox,
    ]),
    PaymentsModule,
    AuditLogModule,
    MembershipModule,
    PointsModule,
    NotificationModule,
  ],
  controllers: [
    AdminController,
    AdminDashboardController,
    AdminOrdersController,
    AdminMembersController,
    AdminExportController,
    AdminLocalizationController,
    AdminLogsController,
    AdminMessageDeliveriesController,
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

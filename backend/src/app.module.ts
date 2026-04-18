import { Module } from '@nestjs/common';
import * as fs from 'fs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SearchModule } from './modules/search/search.module';
import { UsersModule } from './modules/users/users.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { PagesModule } from './modules/pages/pages.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CacheModule } from './modules/cache/cache.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { NoticesModule } from './modules/notices/notices.module';
import { FaqsModule } from './modules/faqs/faqs.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { ArchivesModule } from './modules/archives/archives.module';
import { JournalModule } from './modules/journal/journal.module';
import { PointsModule } from './modules/points/points.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      url: process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL,
      charset: 'utf8mb4',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNCHRONIZE === 'true',
      ssl: process.env.DB_SSL_ENABLED === 'true'
        ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH!) }
        : false,
      autoLoadEntities: true,
      migrations: ['dist/database/migrations/*.js'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 200,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 30,
      },
      {
        name: 'forgotPassword',
        ttl: 60000,
        limit: 1,
        getTracker: (req) => {
          const rawEmail =
            typeof req.body === 'object' && req.body !== null && 'email' in req.body
              ? req.body.email
              : undefined;

          if (typeof rawEmail === 'string') {
            const normalizedEmail = rawEmail.trim().toLowerCase();
            if (normalizedEmail.length > 0) {
              return `forgot-password:${normalizedEmail}`;
            }
          }

          return `forgot-password:${req.ip}`;
        },
      },
    ]),
    CacheModule,
    ScheduleModule.forRoot(),
    AuthModule,
    HealthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    SearchModule,
    UsersModule,
    AdminModule,
    UploadModule,
    PagesModule,
    NavigationModule,
    ReviewsModule,
    WishlistModule,
    CouponsModule,
    NoticesModule,
    FaqsModule,
    InquiriesModule,
    PromotionsModule,
    SettingsModule,
    CollectionsModule,
    ArchivesModule,
    JournalModule,
    PointsModule,
    NotificationModule,
    SchedulerModule,
  ],
  providers: [
    // Guard execution order: ThrottlerGuard → JwtAuthGuard → RolesGuard
    // DO NOT reorder — RolesGuard requires request.user populated by JwtAuthGuard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

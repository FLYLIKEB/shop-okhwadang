import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipTier } from './entities/membership-tier.entity';
import { User } from '../users/entities/user.entity';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { AdminMembershipController } from './admin-membership.controller';
import { MembershipEventEmitter } from './membership-event.emitter';

@Module({
  imports: [TypeOrmModule.forFeature([MembershipTier, User])],
  controllers: [MembershipController, AdminMembershipController],
  providers: [MembershipService, MembershipEventEmitter],
  exports: [MembershipService, MembershipEventEmitter],
})
export class MembershipModule {}

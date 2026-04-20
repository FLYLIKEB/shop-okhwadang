import { PartialType } from '@nestjs/swagger';
import { CreateMembershipTierDto } from './create-membership-tier.dto';

export class UpdateMembershipTierDto extends PartialType(CreateMembershipTierDto) {}

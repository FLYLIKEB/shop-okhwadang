import { IsIn, IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsString()
  @IsIn(['user', 'admin', 'super_admin'])
  role!: string;
}

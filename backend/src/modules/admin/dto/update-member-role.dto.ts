import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'admin', enum: ['user', 'admin', 'super_admin'], description: '역할' })
  @IsString()
  @IsIn(['user', 'admin', 'super_admin'])
  role!: string;
}

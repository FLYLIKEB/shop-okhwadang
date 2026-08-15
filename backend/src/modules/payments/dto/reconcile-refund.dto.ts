import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { RefundStatus } from '../entities/refund.entity';

export class ReconcileRefundDto {
  @ApiProperty({ enum: [RefundStatus.COMPLETED, RefundStatus.FAILED] })
  @IsIn([RefundStatus.COMPLETED, RefundStatus.FAILED])
  outcome!: RefundStatus.COMPLETED | RefundStatus.FAILED;

  @ApiProperty({ example: 'provider-refund-123', description: '검증된 PG 환불 참조' })
  @IsString()
  @MaxLength(255)
  gatewayRefundId!: string;

  @ApiProperty({
    example: 'PG 관리자 조회에서 환불 미접수 상태를 확인함 (조회 ID: check-123)',
    description: 'PG 조회 결과나 거래 참조를 포함한 검증 증거',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  verificationEvidence!: string;
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * #479: OrderStatus enum에 COMPLETED와 REFUND_REQUESTED 상태 추가
 * - delivered → completed 경로 추가 (배송 완료 후 구매 확정)
 * - delivered → refund_requested 경로 추가 (배송 완료 후 환불 요청)
 * - refund_requested → refunded 경로 추가 (관리자가 환불 처리)
 * - completed는 종단 상태 (이후 상태 전이 불가)
 */
export class AddOrderStatusCompletedAndRefundRequested1778400000000 implements MigrationInterface {
  name = 'AddOrderStatusCompletedAndRefundRequested1778400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET NAMES utf8mb4`);

    // ALTER TABLE orders CHANGE COLUMN status ENUM 추가
    // 기존 ENUM: pending, paid, preparing, shipped, delivered, cancelled, refunded
    // 새 ENUM: pending, paid, preparing, shipped, delivered, completed, cancelled, refund_requested, refunded
    await queryRunner.query(`
      ALTER TABLE \`orders\`
      CHANGE COLUMN \`status\`
        \`status\` ENUM('pending', 'paid', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded')
        NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 이전 ENUM으로 복원
    await queryRunner.query(`
      ALTER TABLE \`orders\`
      CHANGE COLUMN \`status\`
        \`status\` ENUM('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded')
        NOT NULL DEFAULT 'pending'
    `);
  }
}

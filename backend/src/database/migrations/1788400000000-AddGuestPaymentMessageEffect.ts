import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestPaymentMessageEffect1788400000000 implements MigrationInterface {
  name = 'AddGuestPaymentMessageEffect1788400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `payment_effect_outbox` MODIFY `effect_type` enum('PAYMENT_CONFIRMED_NOTIFICATION','MEMBER_MESSAGE_NOTIFICATION','GUEST_MESSAGE_NOTIFICATION','ORDER_COMPLETED_EVENT','FIRST_PURCHASE','SHIPPING','GUEST_ORDER_ACCESS') NOT NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE `payment_effect_outbox` SET `effect_type` = 'MEMBER_MESSAGE_NOTIFICATION' WHERE `effect_type` = 'GUEST_MESSAGE_NOTIFICATION'");
    await queryRunner.query("ALTER TABLE `payment_effect_outbox` MODIFY `effect_type` enum('PAYMENT_CONFIRMED_NOTIFICATION','MEMBER_MESSAGE_NOTIFICATION','ORDER_COMPLETED_EVENT','FIRST_PURCHASE','SHIPPING','GUEST_ORDER_ACCESS') NOT NULL");
  }
}

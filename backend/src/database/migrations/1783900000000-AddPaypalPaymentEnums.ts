import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PayPal 결제 gateway/method enum 추가 (#769)
 *
 * PayPal은 주문 생성 후 승인 redirect, confirm 단계에서 capture 하는 별도 PG로
 * 저장되어야 하므로 기존 stripe/naverpay enum 값을 placeholder로 재사용하지 않는다.
 */
export class AddPaypalPaymentEnums1783900000000 implements MigrationInterface {
  name = 'AddPaypalPaymentEnums1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`method\`
       ENUM('card','bank_transfer','virtual_account','phone','mock','paypal')
       NOT NULL DEFAULT 'mock'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay','paypal')
       NOT NULL DEFAULT 'mock'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payment_webhook_events\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay','paypal')
       NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`payments\` SET \`method\` = 'card' WHERE \`method\` = 'paypal'`,
    );
    await queryRunner.query(
      `UPDATE \`payments\` SET \`gateway\` = 'stripe' WHERE \`gateway\` = 'paypal'`,
    );
    await queryRunner.query(
      `UPDATE \`payment_webhook_events\` SET \`gateway\` = 'stripe' WHERE \`gateway\` = 'paypal'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payment_webhook_events\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay')
       NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay')
       NOT NULL DEFAULT 'mock'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`method\`
       ENUM('card','bank_transfer','virtual_account','phone','mock')
       NOT NULL DEFAULT 'mock'`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eximbay 결제 gateway enum 추가 (#1057)
 *
 * 카드 결제는 Eximbay 자체 gateway 값으로 저장해야 환불/웹훅/감사 로그에서
 * 기존 Stripe/PayPal/NaverPay 거래와 섞이지 않는다.
 */
export class AddEximbayPaymentEnums1786200000000 implements MigrationInterface {
  name = 'AddEximbayPaymentEnums1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay','paypal','eximbay')
       NOT NULL DEFAULT 'mock'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payment_webhook_events\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay','paypal','eximbay')
       NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`payments\` SET \`gateway\` = 'stripe' WHERE \`gateway\` = 'eximbay'`,
    );
    await queryRunner.query(
      `UPDATE \`payment_webhook_events\` SET \`gateway\` = 'stripe' WHERE \`gateway\` = 'eximbay'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payment_webhook_events\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay','paypal')
       NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay','paypal')
       NOT NULL DEFAULT 'mock'`,
    );
  }
}

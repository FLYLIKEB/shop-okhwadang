import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stripe 결제 gateway enum 분리 마이그레이션 (#722)
 *
 * 배경:
 *   기존에는 Stripe 결제를 PaymentGatewayType.INICIS placeholder 로 저장하고 있었음.
 *   (resolveGatewayByType 에서 INICIS → stripeAdapter 로 강제 매핑)
 *   국내 KG이니시스(#721)와 글로벌 Stripe 를 둘 다 지원하려면 enum 을 분리해야 함.
 *
 * 마이그레이션 전략:
 *   1) `payments.gateway` ENUM 에 'stripe' 값 추가.
 *   2) 기존 'inicis' 로 저장된 행은 모두 Stripe 결제를 의미하므로 'stripe' 로 백필.
 *      (실제 Inicis 연동은 아직 운영 도입 전이라 안전한 백필. 도입 후에는
 *       #721 에서 별도 KG이니시스 어댑터를 추가하면서 새로운 enum 값을 사용함)
 *   3) INICIS enum 값은 그대로 보존하여 #721 후속 작업에서 재사용 가능.
 */
export class AddStripeGatewayEnum1783300000000 implements MigrationInterface {
  name = 'AddStripeGatewayEnum1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add 'stripe' to ENUM (idempotent — listing all values explicitly)
    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe')
       NOT NULL DEFAULT 'mock'`,
    );

    // 2) Backfill: any row stored as 'inicis' was actually a Stripe payment
    //    (placeholder usage prior to this migration). Promote them to 'stripe'.
    await queryRunner.query(
      `UPDATE \`payments\` SET \`gateway\` = 'stripe' WHERE \`gateway\` = 'inicis'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert backfill: 'stripe' rows return to 'inicis' placeholder so the
    // ENUM shrink in step 2 doesn't lose data.
    await queryRunner.query(
      `UPDATE \`payments\` SET \`gateway\` = 'inicis' WHERE \`gateway\` = 'stripe'`,
    );

    // Shrink ENUM back to original values
    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis')
       NOT NULL DEFAULT 'mock'`,
    );
  }
}

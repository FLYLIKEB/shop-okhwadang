import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NaverPay 결제 gateway enum 추가 마이그레이션 (#721 국내 PG 어댑터 확장)
 *
 * 배경:
 *   국내 결제는 토스 / KG이니시스 / 네이버페이 3개 PG 를 모두 지원해야 한다.
 *   - 'toss' / 'inicis' / 'stripe' 는 이미 ENUM 에 존재 (#722 에서 분리 완료)
 *   - 'naverpay' 만 신규 추가 필요
 *
 * 마이그레이션 전략:
 *   `payments.gateway` ENUM 에 'naverpay' 값을 추가한다. 기존 데이터 백필 없음.
 *   idempotent — 모든 ENUM 값을 명시적으로 나열 (#722 의 AddStripeGatewayEnum 패턴 동일).
 */
export class AddNaverpayGatewayEnum1783400000000 implements MigrationInterface {
  name = 'AddNaverpayGatewayEnum1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe','naverpay')
       NOT NULL DEFAULT 'mock'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down: NaverPay 결제 행이 존재하면 stripe 로 폴백 후 ENUM 축소.
    // (실제 운영에서는 NaverPay 결제가 있는 상태로 down 하면 데이터 손실이 있으므로 권장 X)
    await queryRunner.query(
      `UPDATE \`payments\` SET \`gateway\` = 'stripe' WHERE \`gateway\` = 'naverpay'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`payments\` MODIFY COLUMN \`gateway\`
       ENUM('mock','toss','inicis','stripe')
       NOT NULL DEFAULT 'mock'`,
    );
  }
}

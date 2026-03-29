import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentsShippingTables1774425995915 implements MigrationInterface {
    name = 'AddPaymentsShippingTables1774425995915'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`shipping\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`order_id\` bigint NOT NULL, \`carrier\` varchar(50) NOT NULL DEFAULT 'mock', \`tracking_number\` varchar(100) NULL, \`status\` enum ('payment_confirmed', 'preparing', 'shipped', 'delivered', 'failed') NOT NULL DEFAULT 'payment_confirmed', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_a37456893780ce2dfe0a7484c2\` (\`order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`payments\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`order_id\` bigint NOT NULL, \`payment_key\` varchar(255) NULL, \`method\` enum ('card', 'bank_transfer', 'virtual_account', 'phone', 'mock') NOT NULL DEFAULT 'mock', \`amount\` decimal(12,2) NOT NULL, \`status\` enum ('pending', 'confirmed', 'cancelled', 'partial_cancelled', 'refunded', 'failed') NOT NULL DEFAULT 'pending', \`gateway\` enum ('mock', 'toss', 'inicis') NOT NULL DEFAULT 'mock', \`paid_at\` datetime NULL, \`cancelled_at\` datetime NULL, \`cancel_reason\` varchar(500) NULL, \`raw_response\` json NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_32b41cdb985a296213e9a928b5\` (\`status\`), UNIQUE INDEX \`IDX_b2f7b823a21562eeca20e72b00\` (\`order_id\`), UNIQUE INDEX \`IDX_65cfdd66e9b0ac854c99edcb5a\` (\`payment_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`shipping\` ADD CONSTRAINT \`FK_a37456893780ce2dfe0a7484c22\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_b2f7b823a21562eeca20e72b006\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_b2f7b823a21562eeca20e72b006\``);
        await queryRunner.query(`ALTER TABLE \`shipping\` DROP FOREIGN KEY \`FK_a37456893780ce2dfe0a7484c22\``);
        await queryRunner.query(`DROP INDEX \`IDX_65cfdd66e9b0ac854c99edcb5a\` ON \`payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_b2f7b823a21562eeca20e72b00\` ON \`payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_32b41cdb985a296213e9a928b5\` ON \`payments\``);
        await queryRunner.query(`DROP TABLE \`payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_a37456893780ce2dfe0a7484c2\` ON \`shipping\``);
        await queryRunner.query(`DROP TABLE \`shipping\``);
    }

}

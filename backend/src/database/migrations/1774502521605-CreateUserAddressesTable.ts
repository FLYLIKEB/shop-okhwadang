import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserAddressesTable1774502521605 implements MigrationInterface {
    name = 'CreateUserAddressesTable1774502521605'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_addresses\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`recipient_name\` varchar(100) NOT NULL, \`phone\` varchar(20) NOT NULL, \`zipcode\` varchar(10) NOT NULL, \`address\` text NOT NULL, \`address_detail\` varchar(255) NULL, \`label\` varchar(50) NULL, \`is_default\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_7a5100ce0548ef27a6f1533a5c\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_addresses\` ADD CONSTRAINT \`FK_7a5100ce0548ef27a6f1533a5ce\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_addresses\` DROP FOREIGN KEY \`FK_7a5100ce0548ef27a6f1533a5ce\``);
        await queryRunner.query(`DROP INDEX \`IDX_7a5100ce0548ef27a6f1533a5c\` ON \`user_addresses\``);
        await queryRunner.query(`DROP TABLE \`user_addresses\``);
    }

}

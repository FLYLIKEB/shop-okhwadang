import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrdersTables1774425466051 implements MigrationInterface {
    name = 'AddOrdersTables1774425466051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_parent\``);
        await queryRunner.query(`ALTER TABLE \`product_options\` DROP FOREIGN KEY \`FK_product_options_product\``);
        await queryRunner.query(`ALTER TABLE \`product_images\` DROP FOREIGN KEY \`FK_product_images_product\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_products_category\``);
        await queryRunner.query(`DROP INDEX \`IDX_categories_parent_id\` ON \`categories\``);
        await queryRunner.query(`DROP INDEX \`UQ_categories_slug\` ON \`categories\``);
        await queryRunner.query(`DROP INDEX \`FT_products_name\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_category_id\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_is_featured\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_status\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`UQ_products_sku\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`UQ_products_slug\` ON \`products\``);
        await queryRunner.query(`CREATE TABLE \`order_items\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`order_id\` bigint NOT NULL, \`product_id\` bigint NOT NULL, \`product_option_id\` bigint NULL, \`product_name\` varchar(255) NOT NULL, \`option_name\` varchar(100) NULL, \`price\` decimal(12,2) NOT NULL, \`quantity\` int NOT NULL, INDEX \`IDX_9263386c35b6b242540f9493b0\` (\`product_id\`), INDEX \`IDX_145532db85752b29c57d2b7b1f\` (\`order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`orders\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`order_number\` varchar(50) NOT NULL, \`status\` enum ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending', \`total_amount\` decimal(12,2) NOT NULL, \`discount_amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`shipping_fee\` decimal(12,2) NOT NULL DEFAULT '0.00', \`recipient_name\` varchar(100) NOT NULL, \`recipient_phone\` varchar(20) NOT NULL, \`zipcode\` varchar(10) NOT NULL, \`address\` varchar(255) NOT NULL, \`address_detail\` varchar(255) NULL, \`memo\` varchar(500) NULL, \`points_used\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_c884e321f927d5b86aac7c8f9e\` (\`created_at\`), INDEX \`IDX_775c9f06fc27ae3ff8fb26f2c4\` (\`status\`), INDEX \`IDX_a922b820eeef29ac1c6800e826\` (\`user_id\`), UNIQUE INDEX \`IDX_75eba1c6b1a66b09f2a97e6927\` (\`order_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD UNIQUE INDEX \`IDX_420d9f679d41281f282f5bc7d0\` (\`slug\`)`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD UNIQUE INDEX \`IDX_464f927ae360106b783ed0b410\` (\`slug\`)`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD UNIQUE INDEX \`IDX_c44ac33a05b144dd0d9ddcf932\` (\`sku\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_88cea2dc9c31951d06437879b4\` ON \`categories\` (\`parent_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_3db55e142a0d99d53e7e2ba207\` ON \`products\` (\`is_featured\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_1846199852a695713b1f8f5e9a\` ON \`products\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_9a5f6868c96e0069e699f33e12\` ON \`products\` (\`category_id\`)`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_88cea2dc9c31951d06437879b40\` FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_options\` ADD CONSTRAINT \`FK_49677f87ad61a8b2a31f33c8a2c\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_images\` ADD CONSTRAINT \`FK_4f166bb8c2bfcef2498d97b4068\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_9a5f6868c96e0069e699f33e124\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_145532db85752b29c57d2b7b1f1\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_9263386c35b6b242540f9493b00\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_5dd538d6ee529025a2d8fac5146\` FOREIGN KEY (\`product_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_a922b820eeef29ac1c6800e826a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_a922b820eeef29ac1c6800e826a\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_5dd538d6ee529025a2d8fac5146\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_9263386c35b6b242540f9493b00\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_145532db85752b29c57d2b7b1f1\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_9a5f6868c96e0069e699f33e124\``);
        await queryRunner.query(`ALTER TABLE \`product_images\` DROP FOREIGN KEY \`FK_4f166bb8c2bfcef2498d97b4068\``);
        await queryRunner.query(`ALTER TABLE \`product_options\` DROP FOREIGN KEY \`FK_49677f87ad61a8b2a31f33c8a2c\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_88cea2dc9c31951d06437879b40\``);
        await queryRunner.query(`DROP INDEX \`IDX_9a5f6868c96e0069e699f33e12\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_1846199852a695713b1f8f5e9a\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_3db55e142a0d99d53e7e2ba207\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_88cea2dc9c31951d06437879b4\` ON \`categories\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP INDEX \`IDX_c44ac33a05b144dd0d9ddcf932\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP INDEX \`IDX_464f927ae360106b783ed0b410\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP INDEX \`IDX_420d9f679d41281f282f5bc7d0\``);
        await queryRunner.query(`DROP INDEX \`IDX_75eba1c6b1a66b09f2a97e6927\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_a922b820eeef29ac1c6800e826\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_775c9f06fc27ae3ff8fb26f2c4\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_c884e321f927d5b86aac7c8f9e\` ON \`orders\``);
        await queryRunner.query(`DROP TABLE \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_145532db85752b29c57d2b7b1f\` ON \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_9263386c35b6b242540f9493b0\` ON \`order_items\``);
        await queryRunner.query(`DROP TABLE \`order_items\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_products_slug\` ON \`products\` (\`slug\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_products_sku\` ON \`products\` (\`sku\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_products_status\` ON \`products\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_products_is_featured\` ON \`products\` (\`is_featured\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_products_category_id\` ON \`products\` (\`category_id\`)`);
        await queryRunner.query(`CREATE FULLTEXT INDEX \`FT_products_name\` ON \`products\` (\`name\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_categories_slug\` ON \`categories\` (\`slug\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_categories_parent_id\` ON \`categories\` (\`parent_id\`)`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_products_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_images\` ADD CONSTRAINT \`FK_product_images_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_options\` ADD CONSTRAINT \`FK_product_options_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}

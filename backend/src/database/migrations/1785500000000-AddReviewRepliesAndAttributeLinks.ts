import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewRepliesAndAttributeLinks1785500000000 implements MigrationInterface {
  name = 'AddReviewRepliesAndAttributeLinks1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE attribute_types
      ADD COLUMN parent_id int NULL,
      ADD COLUMN related_type_ids json NULL
    `);
    await queryRunner.query(`
      ALTER TABLE attribute_types
      ADD CONSTRAINT fk_attribute_types_parent
      FOREIGN KEY (parent_id) REFERENCES attribute_types(id)
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE reviews
      ADD COLUMN admin_reply_content text NULL,
      ADD COLUMN admin_reply_author varchar(100) NULL,
      ADD COLUMN admin_replied_at datetime NULL
    `);
    await queryRunner.query(`
      ALTER TABLE external_reviews
      ADD COLUMN admin_reply_content text NULL,
      ADD COLUMN admin_reply_author varchar(100) NULL,
      ADD COLUMN admin_replied_at datetime NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE external_reviews DROP COLUMN admin_replied_at, DROP COLUMN admin_reply_author, DROP COLUMN admin_reply_content');
    await queryRunner.query('ALTER TABLE reviews DROP COLUMN admin_replied_at, DROP COLUMN admin_reply_author, DROP COLUMN admin_reply_content');
    await queryRunner.query('ALTER TABLE attribute_types DROP FOREIGN KEY fk_attribute_types_parent');
    await queryRunner.query('ALTER TABLE attribute_types DROP COLUMN related_type_ids, DROP COLUMN parent_id');
  }
}

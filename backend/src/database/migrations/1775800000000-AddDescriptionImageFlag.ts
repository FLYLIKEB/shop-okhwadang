import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDescriptionImageFlag1709000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'product_images',
      new TableColumn({
        name: 'is_description_image',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('product_images', 'is_description_image');
  }
}

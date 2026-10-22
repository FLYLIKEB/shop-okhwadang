import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPendingNotificationTemplate1788500000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasColumn('notification_templates', 'pending_template_id')) {
      await queryRunner.addColumn('notification_templates', new TableColumn({ name: 'pending_template_id', type: 'varchar', length: '100', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('notification_templates', 'pending_template_id')) {
      await queryRunner.dropColumn('notification_templates', 'pending_template_id');
    }
  }
}

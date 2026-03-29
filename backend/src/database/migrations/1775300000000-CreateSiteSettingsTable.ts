import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSiteSettingsTable1775300000000 implements MigrationInterface {
  name = 'CreateSiteSettingsTable1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`site_settings\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`setting_key\` varchar(100) NOT NULL,
        \`value\` text NOT NULL,
        \`group\` varchar(50) NOT NULL,
        \`label\` varchar(100) NOT NULL,
        \`input_type\` varchar(20) NOT NULL DEFAULT 'text',
        \`options\` text NULL,
        \`default_value\` varchar(200) NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT '0',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_site_settings_key\` (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('color_primary', '#2563eb', 'color', '대표색', 'color', NULL, '#2563eb', 1),
        ('color_primary_foreground', '#ffffff', 'color', '대표색 텍스트', 'color', NULL, '#ffffff', 2),
        ('color_secondary', '#f1f5f9', 'color', '보조색', 'color', NULL, '#f1f5f9', 3),
        ('color_background', '#ffffff', 'color', '배경색', 'color', NULL, '#ffffff', 4),
        ('color_foreground', '#0f172a', 'color', '기본 텍스트색', 'color', NULL, '#0f172a', 5),
        ('color_destructive', '#ef4444', 'color', '삭제/경고색', 'color', NULL, '#ef4444', 6),
        ('color_border', '#e2e8f0', 'color', '테두리색', 'color', NULL, '#e2e8f0', 7),
        ('color_muted', '#f1f5f9', 'color', '음소거 배경색', 'color', NULL, '#f1f5f9', 8),
        ('color_muted_foreground', '#64748b', 'color', '음소거 텍스트색', 'color', NULL, '#64748b', 9),
        ('color_ring', '#2563eb', 'color', '포커스 링 색', 'color', NULL, '#2563eb', 10),
        ('font_family_base', '''Pretendard'', sans-serif', 'typography', '기본 폰트', 'text', NULL, '''Pretendard'', sans-serif', 11),
        ('font_size_base', '1rem', 'typography', '기본 폰트 크기', 'text', NULL, '1rem', 12),
        ('font_weight_normal', '400', 'typography', '일반 폰트 굵기', 'number', NULL, '400', 13),
        ('font_weight_bold', '700', 'typography', '굵은 폰트 굵기', 'number', NULL, '700', 14),
        ('line_height_base', '1.5', 'typography', '기본 줄 간격', 'number', NULL, '1.5', 15),
        ('spacing_xs', '0.25rem', 'spacing', '최소 간격', 'text', NULL, '0.25rem', 16),
        ('spacing_sm', '0.5rem', 'spacing', '작은 간격', 'text', NULL, '0.5rem', 17),
        ('spacing_md', '1rem', 'spacing', '기본 간격', 'text', NULL, '1rem', 18),
        ('spacing_lg', '1.5rem', 'spacing', '큰 간격', 'text', NULL, '1.5rem', 19),
        ('spacing_xl', '2rem', 'spacing', '최대 간격', 'text', NULL, '2rem', 20),
        ('radius_sm', '0.25rem', 'radius', '작은 모서리', 'text', NULL, '0.25rem', 21),
        ('radius_md', '0.375rem', 'radius', '기본 모서리', 'text', NULL, '0.375rem', 22),
        ('radius_lg', '0.5rem', 'radius', '큰 모서리', 'text', NULL, '0.5rem', 23)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`site_settings\``);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessInfoSettings1784500000000 implements MigrationInterface {
  name = 'AddBusinessInfoSettings1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`value_en\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('business_company_name', '서로 인터내셔널', 'Seoro International', 'business_info', '상호명', 'text', NULL, '서로 인터내셔널', 200),
        ('business_ceo', '권준현', 'Kwon Junhyun', 'business_info', '대표자명', 'text', NULL, '권준현', 201),
        ('business_registration_number', '131-72-05631', '131-72-05631', 'business_info', '사업자등록번호', 'text', NULL, '131-72-05631', 202),
        ('business_mail_order_number', '2026-서울강남-01632', '2026-서울강남-01632', 'business_info', '통신판매업신고번호', 'text', NULL, '2026-서울강남-01632', 203),
        ('business_address', '서울특별시 강남구 역삼로 114 (현죽빌딩) 8층 8028호 (우 06252)', '8028, 8F, 114 Yeoksam-ro, Gangnam-gu, Seoul, Republic of Korea (06252)', 'business_info', '주소', 'text', NULL, '서울특별시 강남구 역삼로 114 (현죽빌딩) 8층 8028호 (우 06252)', 204),
        ('business_phone', '010-2908-0393', '010-2908-0393', 'business_info', '대표전화', 'text', NULL, '010-2908-0393', 205),
        ('business_email', 'seorointernational@naver.com', 'seorointernational@naver.com', 'business_info', '이메일', 'text', NULL, 'seorointernational@naver.com', 206),
        ('business_hours', '평일 10:00 - 18:00 (주말·공휴일 휴무)', 'Weekdays 10:00 - 18:00 (Closed on weekends & holidays)', 'business_info', '운영시간', 'text', NULL, '평일 10:00 - 18:00 (주말·공휴일 휴무)', 207),
        ('business_privacy_officer', '권준현', 'Kwon Junhyun', 'business_info', '개인정보보호책임자', 'text', NULL, '권준현', 208),
        ('business_info_url', 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1317205631', 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1317205631', 'business_info', '사업자정보확인 URL', 'text', NULL, 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1317205631', 209)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`site_settings\`
      WHERE \`setting_key\` IN (
        'business_company_name',
        'business_ceo',
        'business_registration_number',
        'business_mail_order_number',
        'business_address',
        'business_phone',
        'business_email',
        'business_hours',
        'business_privacy_officer',
        'business_info_url'
      )
    `);
  }
}

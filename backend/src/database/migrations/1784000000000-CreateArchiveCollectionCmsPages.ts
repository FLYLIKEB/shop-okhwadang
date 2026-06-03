import { MigrationInterface, QueryRunner } from 'typeorm';

interface CmsBlockSeed {
  slug: string;
  type: string;
  sortOrder: number;
  content: Record<string, unknown>;
}

const blocks: CmsBlockSeed[] = [
  {
    slug: 'archive',
    type: 'hero_banner',
    sortOrder: -1,
    content: {
      template: 'simple',
      eyebrow: 'Archive',
      eyebrow_en: 'Archive',
      title: '니료 산지 기록 & 공정 스토리',
      title_en: 'Clay Origins & Process Records',
      description:
        '자사호의 생명은 흙에서 시작됩니다. 산지별 니료의 특성, 채토부터 소성까지의 공정, 그리고 흙과 함께 살아온 장인들의 이야기를 기록합니다.',
      description_en:
        'The life of a Yixing teapot begins with the clay. We record the character of clays by origin, the stages from quarrying to firing, and the stories of masters who have lived with the earth.',
      bgColor: 'foreground',
    },
  },
  {
    slug: 'archive',
    type: 'archive_nilo',
    sortOrder: 0,
    content: {
      sectionLabel: '니료 사전',
      sectionLabel_en: 'Clay Index',
      sectionTitle: '흙의 종류와 산지',
      sectionTitle_en: 'Clay Varieties & Origins',
      sectionDesc: '자사호에 사용되는 대표 니료 6종의 산지, 특성, 적합한 차종을 소개합니다.',
      sectionDesc_en: 'Origins, characteristics, and tea pairings of six representative Yixing clays.',
    },
  },
  {
    slug: 'archive',
    type: 'archive_process',
    sortOrder: 1,
    content: {
      sectionLabel: '공정 기록',
      sectionLabel_en: 'Process Records',
      sectionTitle: '채토에서 소성까지',
      sectionTitle_en: 'From Clay to Kiln',
      sectionDesc: '자사호 한 점이 완성되기까지 거치는 네 단계의 공정을 기록합니다.',
      sectionDesc_en: 'The four stages of crafting a single Yixing teapot.',
    },
  },
  {
    slug: 'archive',
    type: 'archive_artist',
    sortOrder: 2,
    content: {
      sectionLabel: '작가 인터뷰',
      sectionLabel_en: 'Artisan Interviews',
      sectionTitle: '장인의 이야기',
      sectionTitle_en: 'Stories of the Masters',
      sectionDesc: '흙을 빚는 손끝에 담긴 삶의 기록을 소개합니다.',
      sectionDesc_en: 'A chronicle of lives shaped by the hands that shape the clay.',
    },
  },
  {
    slug: 'archive',
    type: 'promotion_banner',
    sortOrder: 99,
    content: {
      template: 'full',
      eyebrow: 'Shop',
      eyebrow_en: 'Shop',
      title: '마음에 드는 니료의 작품을 만나보세요',
      title_en: 'Find a piece made from the clay you love',
      cta_text: '전체 상품 보기 →',
      cta_text_en: 'View All Products →',
      cta_url: '/products',
      bgColor: 'muted',
    },
  },
  {
    slug: 'collection',
    type: 'hero_banner',
    sortOrder: -1,
    content: {
      template: 'simple',
      eyebrow: 'Collection',
      eyebrow_en: 'Collection',
      title: '니료별 · 모양별 큐레이션',
      title_en: 'Curated by Clay & Form',
      description:
        '자사호의 개성은 흙과 형태에서 비롯됩니다. 니료의 색과 질감, 형태의 선과 비례로 나만의 자사호를 찾아보세요.',
      description_en:
        'The character of a Yixing teapot comes from clay and form. Discover yours through color, texture, line, and proportion.',
      bgColor: 'foreground',
    },
  },
  {
    slug: 'collection',
    type: 'collection_clay',
    sortOrder: 0,
    content: {
      sectionLabel: '니료별',
      sectionLabel_en: 'By Clay',
      sectionTitle: '흙의 색으로 찾기',
      sectionTitle_en: 'Find by Clay Color',
      sectionDesc: '6종의 니료는 각기 다른 색상, 질감, 차 궁합을 지닙니다. 관심 있는 니료를 선택해보세요.',
      sectionDesc_en: 'Six clays, each with its own color, texture, and tea pairing. Choose the one that speaks to you.',
    },
  },
  {
    slug: 'collection',
    type: 'collection_shape',
    sortOrder: 1,
    content: {
      sectionLabel: '모양별',
      sectionLabel_en: 'By Shape',
      sectionTitle: '형태의 선으로 찾기',
      sectionTitle_en: 'Find by Form',
      sectionDesc: '자사호의 대표적인 5가지 형태. 각 형태가 지닌 미학과 기능을 탐색해보세요.',
      sectionDesc_en: 'Five defining forms of the Yixing teapot. Explore the aesthetics and function of each.',
    },
  },
  {
    slug: 'collection',
    type: 'promotion_banner',
    sortOrder: 99,
    content: {
      template: 'full',
      eyebrow: 'Shop',
      eyebrow_en: 'Shop',
      title: '전체 상품을 둘러보세요',
      title_en: 'Browse All Products',
      cta_text: '전체 상품 보기 →',
      cta_text_en: 'View All Products →',
      cta_url: '/products',
      bgColor: 'muted',
    },
  },
];

export class CreateArchiveCollectionCmsPages1784000000000 implements MigrationInterface {
  name = 'CreateArchiveCollectionCmsPages1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`pages\` (\`slug\`, \`title\`, \`title_en\`, \`template\`, \`is_published\`)
       VALUES
         ('archive', '아카이브', 'Archive', 'default', 1),
         ('collection', '콜렉션', 'Collection', 'default', 1)
       ON DUPLICATE KEY UPDATE
         \`title\` = VALUES(\`title\`),
         \`title_en\` = COALESCE(NULLIF(\`title_en\`, ''), VALUES(\`title_en\`)),
         \`template\` = VALUES(\`template\`),
         \`is_published\` = VALUES(\`is_published\`)`,
    );

    for (const block of blocks) {
      const [page] = await queryRunner.query(
        `SELECT \`id\` FROM \`pages\` WHERE \`slug\` = ? LIMIT 1`,
        [block.slug],
      );
      if (!page) continue;

      const [existing] = await queryRunner.query(
        `SELECT \`id\` FROM \`page_blocks\`
         WHERE \`page_id\` = ? AND \`type\` = ? AND \`sort_order\` = ? LIMIT 1`,
        [page.id, block.type, block.sortOrder],
      );
      if (existing) continue;

      await queryRunner.query(
        `INSERT INTO \`page_blocks\` (\`page_id\`, \`type\`, \`content\`, \`sort_order\`, \`is_visible\`)
         VALUES (?, ?, ?, ?, 1)`,
        [page.id, block.type, JSON.stringify(block.content), block.sortOrder],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const slug of ['archive', 'collection']) {
      const [page] = await queryRunner.query(
        `SELECT \`id\` FROM \`pages\` WHERE \`slug\` = ? LIMIT 1`,
        [slug],
      );
      if (!page) continue;
      await queryRunner.query(`DELETE FROM \`page_blocks\` WHERE \`page_id\` = ?`, [page.id]);
      await queryRunner.query(`DELETE FROM \`pages\` WHERE \`id\` = ?`, [page.id]);
    }
  }
}

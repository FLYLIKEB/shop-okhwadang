import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedArchivesAndCollections1776900000000 implements MigrationInterface {
  name = 'SeedArchivesAndCollections1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    await query(`
      INSERT INTO \`nilo_types\` (\`name\`, \`nameKo\`, \`name_en\`, \`color\`, \`region\`, \`region_en\`, \`description\`, \`description_en\`, \`characteristics\`, \`product_url\`, \`sort_order\`, \`is_active\`) VALUES
      ('Zhuni', '주니', 'Jooni (Zhuni)', '#C41E3A', 'Fuchun (복건)', 'Fuchun, China', '<b>주철질의 대표 니료</b>로, 적색~황갈색을 띱니다. <b>높은 수축률</b>으로 섬세한 질감이 특징이며, <b>빠른 열전도</b>로 고산 우롱차·홍차에 잘 어울립니다.', 'The quintessential red clay, featuring reddish-amber hues. High shrinkage creates delicate texture with excellent heat conductivity, perfect for high-mountain oolong and black tea.', '["적색~황갈색","높은 수축률","빠른 열전도","고산 우롱차·홍차"]', '/products?categoryId=10', 1, 1),
      ('Zisha', '자사', 'Zisha (Purple Sand)', '#6B3FA0', 'Yixing (의흥)', 'Yixing, China', '<b>보라빛 자사(紫砂) 원광 니료</b>로 만든 정통 자사호. <b>뛰어난 기공성(透氣性)</b>으로 보이차·흑차 등 발효차에 최적입니다. 사용하면 할수록 광택이 납니다.', 'Authentic purple-sand Zisha clay teapots. Exceptional breathability makes them ideal for Boischa and Heicha. Develops a beautiful sheen with use.', '["보라빛","뛰어난 기공성","발효차 최적","광택 발생"]', '/products?categoryId=11', 2, 1),
      ('Duani', '단니', 'Duani (Duan Clay)', '#D4A84B', 'Yixing (의흥)', 'Yixing, China', '<b>밝은 노란빛의 단니(段泥)</b> 자사호. <b>가벼운 색감</b>에 깨끗한 맛을 내며, <b>녹차·백차·경발효 우롱차</b>에 어울립니다. 차 색감을 감상하기 좋습니다.', 'Duani (段泥) teapots in soft yellow tones. Light color palette with clean taste, perfect for green, white, and lightly oxidized oolong teas.', '["밝은 노란빛","가벼운 색감","깨끗한 맛","녹차·백차·경발효 우롱차"]', '/products?categoryId=12', 3, 1),
      ('Heini', '흑니', 'Heini (Black Clay)', '#1A1A1A', 'Yixing (의흥)', 'Yixing, China', '<b>깊은 흑색의 흑니(黑泥)</b> 자사호. <b>묵직한 존재감</b>과 <b>뛰어난 보온성</b>으로 <b>숙차·흑차</b>를 우리기에 좋습니다. 완전 소성된 표면이 풍격을 더합니다.', 'Deep black Heini (黑泥) teapots. Substantial presence with excellent heat retention, ideal for aged shucha and black tea. Fully fired surface adds character.', '["깊은 흑색","묵직한 존재감","뛰어난 보온성","숙차·흑차"]', '/products?categoryId=13', 4, 1),
      ('Qinghuini', '청회니', 'Qinghuini (Blue-Gray Clay)', '#708090', 'Yixing (의흥)', 'Yixing, China', '<b>청회색 톤의 청회니(青灰泥)</b> 자사호. <b>은은한 색감</b>에 단정한 미감을 지니며, <b>생차·백차</b>에 잘 어울립니다. 섬세한 질감이 특징입니다.', 'Qinghuini (青灰泥) teapots with subtle blue-gray tones. Elegant and refined aesthetic, well-suited for raw shucha and white tea.', '["청회색","은은한 색감","단정한 미감","생차·백차"]', '/products?categoryId=14', 5, 1)
    `);

    await query(`
      INSERT INTO \`process_steps\` (\`step\`, \`title\`, \`title_en\`, \`description\`, \`description_en\`, \`detail\`, \`detail_en\`) VALUES
      (1, '精选矿料', 'Ore Selection', '严格挑选优质紫砂矿料', 'Strict selection of premium Zisha ore', '从原矿中去除杂质，确保泥料的纯净度和可塑性。这一步直接影响最终成品的质地和色泽。', 'Remove impurities from raw ore to ensure purity and plasticity. This step directly affects the texture and color of the final product.'),
      (2, '炼泥', 'Clay Refining', '将矿料研磨、调配、练制', 'Grinding, mixing and kneading ore', '经过数月的阴干和反复揉练，使泥料达到最佳的可塑性和均匀度。', 'After months of drying and repeated kneading, the clay reaches optimal plasticity and uniformity.'),
      (3, '成型', 'Shaping', '手工拍打成型或模具成型', 'Hand-forming or mold-forming', '采用传统拍打法或现代模具成型，每件作品都需要匠人的精细操作。', 'Using traditional hand-forming or modern mold techniques, each piece requires precise craftsmanship.'),
      (4, '雕刻', 'Carving', '精细雕刻装饰纹样', 'Fine carving of decorative patterns', '根据设计要求进行精细雕刻，包括文字、花鸟、山水等传统纹样。', 'Fine carving according to design requirements, including traditional patterns of calligraphy, flowers, birds, landscapes.'),
      (5, '烧制', 'Firing', '高温烧制形成器型', 'High-temperature firing to form shape', '在900-1200度高温窑中烧制，烧制温度和时间的把控决定最终的色泽和质感。', 'Fired at 900-1200°C in high-temperature kilns. Temperature and duration control determines final color and texture.'),
      (6, '检验', 'Inspection', '严格质检确保品质', 'Strict quality inspection', '每件成品都经过严格检验，确保无瑕疵后方可出厂。', 'Each finished product undergoes strict inspection to ensure no defects before leaving the factory.')
    `);

    await query(`
      INSERT INTO \`artists\` (\`name\`, \`name_en\`, \`title\`, \`title_en\`, \`region\`, \`region_en\`, \`story\`, \`story_en\`, \`specialty\`, \`specialty_en\`, \`image_url\`, \`product_url\`, \`sort_order\`, \`is_active\`) VALUES
      ('주형호', 'Zhu Xing', '주형(竹型) 명인', 'Zhu Xing Master', '복건성 의흥', 'Yixing, Fuchun', '40년 이상의 경험으로 Traditional 주형 호를制造하는 명인. 대나무의 생명을 형상에 담아내는 독자적인 기법을 보유.', 'Master with over 40 years of experience crafting traditional Zhuxing teapots. Holds a unique technique of capturing bamboo vitality in form.', '주형호, 대나무 마디 표현', 'Zhuxing teapots, bamboo joint expression', 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/artist-zhuxing.png', '/products?categoryId=20', 1, 1),
      ('석표호', 'Shi Biao', '석표(石瓢) 명인', 'Shi Biao Master', '복건성 의흥', 'Yixing, Fuchun', '石瓢의 TRIANGULAR 안정감과力量感 있는 선을を表現하는的实力派 명인. 삼각 뚜껑 손잡이 표현의开创자.', 'A skilled master expressing Shibiao triangular stability and powerful lines. Pioneer of triangular lid knob expression.', '석표호, 삼각 형태', 'Shibiao teapots, triangular form', 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/artist-shibiao.png', '/products?categoryId=21', 2, 1),
      ('서시호', 'Xi Shi', '서시(西施) 명인', 'Xi Shi Master', '복건성 의흥', 'Yixing, Fuchun', '女性적인优雅한 곡선을 서시호에 담아내는 TOP 명인. 初学者にもおすすめしやすい使いやすさが 자랑.', 'Top master capturing feminine elegant curves in Seoshi teapots. Known for excellent usability, recommended for beginners.', '서시호, 부드러운 곡선', 'Seoshi teapots, smooth curves', 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/artist-seoshi.png', '/products?categoryId=22', 3, 1)
    `);

    await query(`
      INSERT INTO \`collections\` (\`type\`, \`name\`, \`name_en\`, \`nameKo\`, \`color\`, \`description\`, \`imageUrl\`, \`product_url\`, \`sort_order\`, \`is_active\`) VALUES
      ('clay', '주니 (Zhuni)', 'Jooni Collection', '주니', '#C41E3A', '<b>주철질의 대표 니료</b>로, 적색~황갈색을 띱니다. <b>높은 수축률</b>으로 섬세한 질감이 특징이며, <b>빠른 열전도</b>로 고산 우롱차·홍차에 잘 어울립니다.', NULL, '/products?categoryId=10', 1, 1),
      ('clay', '자사 (Zisha)', 'Zisha Collection', '자사', '#6B3FA0', '<b>보라빛 자사(紫砂) 원광 니료</b>로 만든 정통 자사호. <b>뛰어난 기공성(透氣性)</b>으로 보이차·흑차 등 발효차에 최적입니다. 사용하면 할수록 광택이 납니다.', NULL, '/products?categoryId=11', 2, 1),
      ('clay', '단니 (Duani)', 'Duani Collection', '단니', '#D4A84B', '<b>밝은 노란빛의 단니(段泥)</b> 자사호. <b>가벼운 색감</b>에 깨끗한 맛을 내며, <b>녹차·백차·경발효 우롱차</b>에 어울립니다. 차 색감을 감상하기 좋습니다.', NULL, '/products?categoryId=12', 3, 1),
      ('clay', '흑니 (Heini)', 'Heini Collection', '흑니', '#1A1A1A', '<b>깊은 흑색의 흑니(黑泥)</b> 자사호. <b>묵직한 존재감</b>과 <b>뛰어난 보온성</b>으로 <b>숙차·흑차</b>를 우리기에 좋습니다. 완전 소성된 표면이 풍격을 더합니다.', NULL, '/products?categoryId=13', 4, 1),
      ('clay', '청회니 (Qinghuini)', 'Qinghuini Collection', '청회니', '#708090', '<b>청회색 톤의 청회니(青灰泥)</b> 자사호. <b>은은한 색감</b>에 단정한 미감을 지니며, <b>생차·백차</b>에 잘 어울립니다. 섬세한 질감이 특징입니다.', NULL, '/products?categoryId=14', 5, 1),
      ('shape', '주형 (Zhuxing)', 'Zhuxing Collection', '주형', '#8B4513', '<b>대나무 마디를 본뜬 주형호(竹型壺)</b>. 곧고 단정한 조형미와 자연의 생명력이 담긴 전통 조형입니다. <b>수직 선</b>이 현대적 감각을 더합니다.', NULL, '/products?categoryId=20', 1, 1),
      ('shape', '석표 (Shibiao)', 'Shibiao Collection', '석표', '#696969', '<b>바가지 모양의 석표호(石瓢壺)</b>. <b>삼각 구도의 안정감</b>과 힘 있는 선이 특징인 자사호의 <b>대표 조형</b>입니다. 삼각 뚜껑 손잡이가 독특합니다.', NULL, '/products?categoryId=21', 2, 1),
      ('shape', '서시 (Seoshi)', 'Seoshi Collection', '서시', '#D4A574', '<b>미인 서시(西施)에서 이름을 딴 서시호</b>. <b>풍만하고 부드러운 곡선</b>이 여성적 아름다움을 표현한 <b>대표적 원형호</b>입니다. 쥐리기가 좋아 입문자 추천.', NULL, '/products?categoryId=22', 3, 1),
      ('shape', '편평 (Byeonpyeong)', 'Byeonpyeong Collection', '편평', '#C0C0C0', '<b>납작한 원판 형태의 편평호(扁平壺)</b>. <b>넓은 바닥과 낮은 몸체</b>로 찻잎이 고르게 펼쳐져 <b>맛의 균형</b>이 좋습니다. 다반 위 배치에 적합합니다.', NULL, '/products?categoryId=23', 4, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    await query(`DELETE FROM \`collections\` WHERE \`type\` IN ('clay', 'shape')`);
    await query(`DELETE FROM \`artists\``);
    await query(`DELETE FROM \`process_steps\``);
    await query(`DELETE FROM \`nilo_types\``);
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpsertPageBlockTranslationFields1777100000000 implements MigrationInterface {
  name = 'UpsertPageBlockTranslationFields1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    const updateBlockContent = async (id: number, content: Record<string, unknown>): Promise<void> => {
      await queryRunner.query(
        `UPDATE \`page_blocks\` SET content = ? WHERE id = ?`,
        [JSON.stringify(content), id],
      );
    };

    const heroBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'hero_banner' LIMIT 1`);
    if (heroBlock.length > 0) {
      const content = heroBlock[0].content;
      content.slides = content.slides.map((slide: Record<string, unknown>, idx: number) => {
        if (idx === 0) {
          return { ...slide, title_en: 'Crafted by Yixing Masters', subtitle_en: '<b>Zisha clay from Huanglong Mountain in Yixing, China</b> — 600 years of tradition shaped by hand. Meet the craft of devoted masters.', cta_text_en: 'View Collection' };
        } else if (idx === 1) {
          return { ...slide, title_en: 'The Depth of Pu-erh', subtitle_en: 'Pu-erh imported directly from <b>the ancient tea mountains of Yunnan</b>. Savor the depth of <b>Banzhang · Bingdao · Dayi</b> shaped by time.', cta_text_en: 'View Archive' };
        }
        return { ...slide, title_en: 'The Art of the Tea Table', subtitle_en: 'Compose your own tea setting with <b>Yixing teapots and tea ware</b>. Elevate the ritual with <b>Jingdezhen blue-and-white</b> and <b>Tenmoku</b> bowls.', cta_text_en: 'View Journal' };
      });
      await updateBlockContent(heroBlock[0].id, content);
    }

    const splitBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'split_content' LIMIT 1`);
    if (splitBlock.length > 0) {
      const content = splitBlock[0].content;
      content.title_en = 'The Ockhwadang Story';
      content.subtitle_en = 'Our Story';
      content.description_en = 'Ockhwadang works directly with artisans in Yixing and Yunnan to curate <strong>Zisha teapots, pu-erh tea, and tea ware</strong>.<br/><br/>To carry the spirit of <strong>600 years of Zisha ceramic tradition</strong> and the depth of ancient-tree pu-erh, we import <strong>directly from the source</strong> without middlemen.';
      content.cta_text_en = 'Learn More';
      await updateBlockContent(splitBlock[0].id, content);
    }

    const carouselBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'product_carousel' LIMIT 1`);
    if (carouselBlock.length > 0) {
      const content = carouselBlock[0].content;
      content.title_en = 'Best Yixing Teapots';
      await updateBlockContent(carouselBlock[0].id, content);
    }

    const promoBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'promotion_banner' LIMIT 1`);
    if (promoBlock.length > 0) {
      const content = promoBlock[0].content;
      content.title_en = 'Spring Showcase — New Zhuni Arrivals';
      content.subtitle_en = 'Special pricing on new Fujian Zhuni teapots, first-come first-served';
      content.cta_text_en = 'View Showcase';
      await updateBlockContent(promoBlock[0].id, content);
    }

    const gridBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'product_grid' LIMIT 1`);
    if (gridBlock.length > 0) {
      const content = gridBlock[0].content;
      content.title_en = 'Yixing Teapot Collection';
      await updateBlockContent(gridBlock[0].id, content);
    }

    const catNavBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'category_nav' LIMIT 1`);
    if (catNavBlock.length > 0) {
      const content = catNavBlock[0].content;
      content.title_en = 'Shop by Category';
      await updateBlockContent(catNavBlock[0].id, content);
    }

    const journalBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'journal_preview' LIMIT 1`);
    if (journalBlock.length > 0) {
      const content = journalBlock[0].content;
      content.title_en = 'Stories of Tea, Clay, and People';
      await updateBlockContent(journalBlock[0].id, content);
    }

    const exhHeroBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 2 AND type = 'hero_banner' LIMIT 1`);
    if (exhHeroBlock.length > 0) {
      const content = exhHeroBlock[0].content;
      content.title_en = 'Spring Collection';
      content.subtitle_en = 'New Zhuni teapots — limited editions crafted by masters';
      content.cta_text_en = 'View Collection';
      await updateBlockContent(exhHeroBlock[0].id, content);
    }

    const exhPromoBlock = await query(`SELECT pb.id, pb.content FROM \`page_blocks\` pb JOIN \`pages\` p ON p.id = pb.page_id WHERE pb.page_id = 2 AND pb.type = 'promotion_banner' AND p.template = 'timer' LIMIT 1`);
    if (exhPromoBlock.length > 0) {
      const content = exhPromoBlock[0].content;
      content.title_en = 'Beginner Tea Set 14% Off';
      content.subtitle_en = 'Ockhwadang starter set — 280,000 won → 240,000 won';
      content.cta_text_en = 'View Deals';
      await updateBlockContent(exhPromoBlock[0].id, content);
    }

    const exhGridBlocks = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 2 AND type = 'product_grid' ORDER BY sort_order LIMIT 2`);
    if (exhGridBlocks.length >= 1) {
      const content = exhGridBlocks[0].content;
      content.title_en = 'Zhuni Teapot Collection';
      await updateBlockContent(exhGridBlocks[0].id, content);
    }
    if (exhGridBlocks.length >= 2) {
      const content = exhGridBlocks[1].content;
      content.title_en = 'Pair with Pu-erh Tea';
      await updateBlockContent(exhGridBlocks[1].id, content);
    }

    const supportBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 5 AND type = 'split_content' LIMIT 1`);
    if (supportBlock.length > 0) {
      const content = supportBlock[0].content;
      content.title_en = 'How Can We Help You?';
      content.subtitle_en = 'CUSTOMER CENTER';
      content.cta_text_en = '1:1 Inquiry';
      await updateBlockContent(supportBlock[0].id, content);
    }

    const aboutBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 3 AND type = 'split_content' LIMIT 1`);
    if (aboutBlock.length > 0) {
      const content = aboutBlock[0].content;
      content.title_en = 'Ockhwadang';
      content.subtitle_en = 'JISAHO · Pu-erh · Tea Accessories';
      content.description_en = 'Ockhwadang works directly with artisans in Yixing and Yunnan to curate <strong>Zisha teapots, pu-erh tea, and tea ware</strong>.<br/><br/><strong>600 years of tradition</strong> in Zisha ceramics and ancient-tree pu-erh, delivered directly from the source without middlemen.<br/><br/>Every detail of your tea experience matters to us. That is the Ockhwadang way.';
      content.cta_text_en = 'Our Story';
      await updateBlockContent(aboutBlock[0].id, content);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    const cleanEnFields = async (id: number, keys: string[]): Promise<void> => {
      const block = await query(`SELECT content FROM \`page_blocks\` WHERE id = ${id} LIMIT 1`);
      if (block.length > 0) {
        const content = block[0].content;
        for (const key of keys) {
          delete content[key];
        }
        await queryRunner.query(
          `UPDATE \`page_blocks\` SET content = ? WHERE id = ?`,
          [JSON.stringify(content), id],
        );
      }
    };

    for (const pageId of [1, 2, 3, 5]) {
      const blocks = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = ${pageId}`);
      for (const b of blocks) {
        const content = b.content;
        if (content.slides && Array.isArray(content.slides)) {
          content.slides = content.slides.map((s: Record<string, unknown>) => {
            delete s.title_en;
            delete s.subtitle_en;
            delete s.cta_text_en;
            return s;
          });
          await queryRunner.query(
            `UPDATE \`page_blocks\` SET content = ? WHERE id = ?`,
            [JSON.stringify(content), b.id],
          );
        } else {
          await cleanEnFields(b.id, ['title_en', 'subtitle_en', 'description_en', 'cta_text_en']);
        }
      }
    }
  }
}
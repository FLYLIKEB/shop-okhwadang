import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpsertRemainingPageBlockEnFields1777200000000 implements MigrationInterface {
  name = 'UpsertRemainingPageBlockEnFields1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    const updateBlockContent = async (id: number, content: Record<string, unknown>): Promise<void> => {
      await queryRunner.query(
        `UPDATE \`page_blocks\` SET content = ? WHERE id = ?`,
        [JSON.stringify(content), id],
      );
    };

    const heroBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'hero_banner' LIMIT 1`);
    if (heroBlock.length > 0) {
      const content = heroBlock[0].content;
      if (content.slides && Array.isArray(content.slides)) {
        content.slides = content.slides.map((slide: Record<string, unknown>, idx: number) => {
          if (idx === 0) {
            return { ...slide, title_en: 'Crafted by Yixing Masters', subtitle_en: '<b>Zisha clay from Huanglong Mountain in Yixing, China</b> — 600 years of tradition shaped by hand. Meet the craft of devoted masters.', cta_text_en: 'View Collection' };
          } else if (idx === 1) {
            return { ...slide, title_en: 'The Depth of Pu-erh', subtitle_en: 'Pu-erh imported directly from <b>the ancient tea mountains of Yunnan</b>. Savor the depth of <b>Banzhang · Bingdao · Dayi</b> shaped by time.', cta_text_en: 'View Archive' };
          }
          return { ...slide, title_en: 'The Art of the Tea Table', subtitle_en: 'Compose your own tea setting with <b>Yixing teapots and tea ware</b>. Elevate the ritual with <b>Jingdezhen blue-and-white</b> and <b>Tenmoku</b> bowls.', cta_text_en: 'View Journal' };
        });
      }
      await updateBlockContent(heroBlock[0].id, content);
    }

    const splitBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'split_content' LIMIT 1`);
    if (splitBlock.length > 0) {
      const content = splitBlock[0].content;
      content.title_en = 'The Okhwadang Story';
      content.subtitle_en = 'Our Story';
      content.description_en = 'Okhwadang works directly with artisans in Yixing and Yunnan to curate <strong>Zisha teapots, pu-erh tea, and tea ware</strong>.<br/><br/>To carry the spirit of <strong>600 years of Zisha ceramic tradition</strong> and the depth of ancient-tree pu-erh, we import <strong>directly from the source</strong> without middlemen.';
      content.cta_text_en = 'Learn More';
      await updateBlockContent(splitBlock[0].id, content);
    }

    const carouselBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'product_carousel' LIMIT 1`);
    if (carouselBlock.length > 0) {
      const content = carouselBlock[0].content;
      content.title_en = 'Best Yixing Teapots';
      await updateBlockContent(carouselBlock[0].id, content);
    }

    const promoBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'promotion_banner' LIMIT 1`);
    if (promoBlock.length > 0) {
      const content = promoBlock[0].content;
      content.title_en = 'Spring Showcase — New Zhuni Arrivals';
      content.subtitle_en = 'Special pricing on new Fujian Zhuni teapots, first-come first-served';
      content.cta_text_en = 'View Showcase';
      await updateBlockContent(promoBlock[0].id, content);
    }

    const gridBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'product_grid' LIMIT 1`);
    if (gridBlock.length > 0) {
      const content = gridBlock[0].content;
      content.title_en = 'Yixing Teapot Collection';
      await updateBlockContent(gridBlock[0].id, content);
    }

    const catNavBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'category_nav' LIMIT 1`);
    if (catNavBlock.length > 0) {
      const content = catNavBlock[0].content;
      content.title_en = 'Shop by Category';
      await updateBlockContent(catNavBlock[0].id, content);
    }

    const journalBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 6 AND type = 'journal_preview' LIMIT 1`);
    if (journalBlock.length > 0) {
      const content = journalBlock[0].content;
      content.title_en = 'Stories of Tea, Clay, and People';
      await updateBlockContent(journalBlock[0].id, content);
    }

    const exhHeroBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 7 AND type = 'hero_banner' LIMIT 1`);
    if (exhHeroBlock.length > 0) {
      const content = exhHeroBlock[0].content;
      content.title_en = 'Spring Collection';
      content.subtitle_en = 'New Zhuni teapots — limited editions crafted by masters';
      content.cta_text_en = 'View Collection';
      await updateBlockContent(exhHeroBlock[0].id, content);
    }

    const exhText1 = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 7 AND type = 'text_content' ORDER BY sort_order LIMIT 1`);
    if (exhText1.length > 0) {
      const content = exhText1[0].content;
      content.html_en = '<h2>From Yixing Masters to Okhwadang</h2><p>Introducing limited-edition Zhuni teapots crafted with Zhuni clay from Fujian Province. Experience the exquisite crimson glaze and intricate details that only master craftsmen can achieve. This exhibition features a curated selection of Xishi, Zhuxing, and Shipiao Zhuni teapots in various forms.</p>';
      await updateBlockContent(exhText1[0].id, content);
    }

    const exhGrid1 = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 7 AND type = 'product_grid' ORDER BY sort_order LIMIT 1`);
    if (exhGrid1.length > 0) {
      const content = exhGrid1[0].content;
      content.title_en = 'Zhuni Teapot Collection';
      await updateBlockContent(exhGrid1[0].id, content);
    }

    const exhPromoBlock = await query(`SELECT pb.id, pb.content FROM \`page_blocks\` pb JOIN \`pages\` p ON p.id = pb.page_id WHERE pb.page_id = 7 AND pb.type = 'promotion_banner' AND p.template = 'timer' LIMIT 1`);
    if (exhPromoBlock.length > 0) {
      const content = exhPromoBlock[0].content;
      content.title_en = 'Beginner Tea Set 14% Off';
      content.subtitle_en = 'Okhwadang starter set — 280,000 won → 240,000 won';
      content.cta_text_en = 'View Deals';
      await updateBlockContent(exhPromoBlock[0].id, content);
    }

    const exhGrid2 = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 7 AND type = 'product_grid' ORDER BY sort_order LIMIT 1 OFFSET 1`);
    if (exhGrid2.length > 0) {
      const content = exhGrid2[0].content;
      content.title_en = 'Pair with Pu-erh Tea';
      await updateBlockContent(exhGrid2[0].id, content);
    }

    const exhText2 = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 7 AND type = 'text_content' ORDER BY sort_order LIMIT 1 OFFSET 1`);
    if (exhText2.length > 0) {
      const content = exhText2[0].content;
      content.html_en = '<p>Exhibition items are limited and may sell out early.<br/>Due to the artisanal nature of teapots, slight color variations between individual pieces may occur and are not considered defects.</p>';
      await updateBlockContent(exhText2[0].id, content);
    }

    const aboutSplitBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 8 AND type = 'split_content' LIMIT 1`);
    if (aboutSplitBlock.length > 0) {
      const content = aboutSplitBlock[0].content;
      content.title_en = 'Okhwadang';
      content.subtitle_en = 'Teapot · Pu-erh · Tea Accessories';
      content.description_en = 'Okhwadang works directly with artisans in Yixing and Yunnan to curate <strong>Zisha teapots, pu-erh tea, and tea ware</strong>.<br/><br/><strong>600 years of tradition</strong> in Zisha ceramics and ancient-tree pu-erh, delivered directly from the source without middlemen.<br/><br/>Every detail of your tea experience matters to us. That is the Okhwadang way.';
      content.cta_text_en = 'Our Story';
      await updateBlockContent(aboutSplitBlock[0].id, content);
    }

    const aboutText = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 8 AND type = 'text_content' LIMIT 1`);
    if (aboutText.length > 0) {
      const content = aboutText[0].content;
      content.html_en = '<h2>Our Promise</h2><p>Direct Import from Origin · Artisan Partnerships · Quality Guarantee · Careful Packaging</p>';
      await updateBlockContent(aboutText[0].id, content);
    }

    const supportBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'split_content' LIMIT 1`);
    if (supportBlock.length > 0) {
      const content = supportBlock[0].content;
      content.title_en = 'How Can We Help You?';
      content.subtitle_en = 'CUSTOMER CENTER';
      content.cta_text_en = '1:1 Inquiry';
      await updateBlockContent(supportBlock[0].id, content);
    }

    const supportText = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 1 AND type = 'text_content' LIMIT 1`);
    if (supportText.length > 0) {
      const content = supportText[0].content;
      content.html_en = '<h2>Frequently Asked Questions</h2><p>Find quick answers to common questions about orders, shipping, returns, and our products.</p>';
      await updateBlockContent(supportText[0].id, content);
    }

    const contactBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 9 AND type = 'text_content' LIMIT 1`);
    if (contactBlock.length > 0) {
      const content = contactBlock[0].content;
      content.html_en = '<h1>Contact Us</h1><p>If you have any questions about Okhwadang, please reach out using the form below.<br/>We will respond within 1-2 business days.</p><p><strong>Business Hours</strong>: Mon-Fri 10:00 ~ 18:00 (Lunch 12:00 ~ 13:00)<br/><strong>Email</strong>: help@ockhwadang.com</p>';
      await updateBlockContent(contactBlock[0].id, content);
    }

    const shippingBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 2 AND type = 'text_content' LIMIT 1`);
    if (shippingBlock.length > 0) {
      const content = shippingBlock[0].content;
      content.html_en = '<h2>Shipping Information</h2><p>Okhwadang ships orders within 2-3 business days after order confirmation. (Excluding weekends and holidays)</p><h3>Shipping Costs</h3><ul><li><strong>Standard Shipping:</strong> 3,000 KRW (additional fees may apply for remote areas)</li><li><strong>Free Shipping:</strong> Orders over 50,000 KRW</li><li><strong>Carrier:</strong> CJ Korea Express</li><li><strong>Tracking:</strong> Available on your order details page.</li></ul><h3>Delivery Time</h3><ul><li><strong>Seoul/Gyeonggi:</strong> 1-2 days</li><li><strong>Other areas:</strong> 2-3 days</li><li><strong>Remote areas:</strong> 3-5 days</li></ul><p>Please contact customer service if you experience any shipping delays or issues.</p>';
      await updateBlockContent(shippingBlock[0].id, content);
    }

    const returnsBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 3 AND type = 'text_content' LIMIT 1`);
    if (returnsBlock.length > 0) {
      const content = returnsBlock[0].content;
      content.html_en = '<h2>Returns & Exchanges</h2><h3>Return/Exchange Period</h3><p>Requests can be made within <strong>7 days</strong> of receiving the product. (Excluding cases where product value has significantly decreased)</p><h3>Non-Returnable/Exchangeable Cases</h3><ul><li>Used or opened products</li><li>Products damaged due to customer negligence</li><li>Defects discovered after delivery (please contact us immediately)</li></ul><h3>Return/Exchange Process</h3><ol><li>Apply for return/exchange via Customer Center (1:1 inquiry)</li><li>Ship the product to the designated address after confirmation</li><li>Refund/exchange processed after product inspection (2-3 days)</li></ol><h3>Refund Information</h3><p>Refunds are processed within 3-5 days after product inspection. For bank transfers, the refund will be deposited to your registered account.</p>';
      await updateBlockContent(returnsBlock[0].id, content);
    }

    const termsBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 4 AND type = 'text_content' LIMIT 1`);
    if (termsBlock.length > 0) {
      const content = termsBlock[0].content;
      content.html_en = '<h2>Terms of Service</h2><p>These terms govern your use of the Okhwadang online shopping service ("Service"). By using the Service, you agree to these terms.</p><h3>Article 1 (Purpose)</h3><p>These terms establish general conditions for using the online shopping service provided by Okhwadang ("Company").</p><h3>Article 2 (Formation of Agreement)</h3><p>A service agreement is formed when the user agrees to the service terms and begins using the Service.</p><h3>Article 3 (Service Provision and Changes)</h3><p>The Company may change service content, hours, or suspend the Service with prior notice.</p><h3>Article 4 (Payments)</h3><p>Payment for services can be made through payment methods designated by the Company, including card payments and bank transfers.</p><h3>Article 5 (Refunds)</h3><p>Payment cancellations and refunds can be requested within 7 days of receiving the product, subject to the Company\'s refund policy.</p><h3>Article 6 (Liability)</h3><p>The Company shall diligently fulfill its duty of care in providing services but is not liable for service interruptions due to force majeure.</p><h3>Article 7 (Dispute Resolution)</h3><p>Disputes related to service use shall be resolved through the Company\'s customer service. If no agreement is reached, legal action may be taken in the appropriate court.</p>';
      await updateBlockContent(termsBlock[0].id, content);
    }

    const privacyBlock = await query(`SELECT id, content FROM \`page_blocks\` WHERE page_id = 5 AND type = 'text_content' LIMIT 1`);
    if (privacyBlock.length > 0) {
      const content = privacyBlock[0].content;
      content.html_en = '<h2>Privacy Policy</h2><p>Okhwadang ("Company") treats your personal information with care and complies with relevant laws including the Act on Promotion of Information and Communications Network Utilization and Information Protection.</p><h3>1. Personal Information Collected</h3><ul><li><strong>Required:</strong> Name, email, phone, address</li><li><strong>Optional:</strong> Date of birth, gender (at registration)</li><li><strong>Auto-collected:</strong> IP address, cookies, visit history</li></ul><h3>2. Purpose of Collection and Use</h3><p>Collected personal information is used for service provision, contract fulfillment, customer management, marketing, and advertising.</p><h3>3. Retention Period</h3><p>Your personal information is retained until account deletion. Some information may be retained per legal requirements. (Contract fulfillment: 5 years, Consumer disputes: 3 years)</p><h3>4. Third-Party Sharing</h3><p>The Company does not share your personal information with third parties without your consent, except as required by law or for essential service provision.</p><h3>5. User Rights</h3><p>You have rights to access, correct, delete, or request suspension of processing of your personal information. Contact our customer service anytime to exercise these rights.</p><h3>6. Privacy Officer</h3><p>Officer: Okhwadang Customer Center | Email: help@okhwandang.com</p>';
      await updateBlockContent(privacyBlock[0].id, content);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    const blocksWithEn = await query(`SELECT id, content FROM \`page_blocks\``);
    for (const block of blocksWithEn) {
      const content = block.content;
      let changed = false;
      if (content.slides && Array.isArray(content.slides)) {
        content.slides = content.slides.map((s: Record<string, unknown>) => {
          if (s.title_en || s.subtitle_en || s.cta_text_en) {
            changed = true;
            const { title_en, subtitle_en, cta_text_en, ...rest } = s;
            return rest;
          }
          return s;
        });
      }
      if (content.title_en) { delete content.title_en; changed = true; }
      if (content.subtitle_en) { delete content.subtitle_en; changed = true; }
      if (content.description_en) { delete content.description_en; changed = true; }
      if (content.cta_text_en) { delete content.cta_text_en; changed = true; }
      if (content.html_en) { delete content.html_en; changed = true; }
      if (changed) {
        await queryRunner.query(
          `UPDATE \`page_blocks\` SET content = ? WHERE id = ?`,
          [JSON.stringify(content), block.id],
        );
      }
    }
  }
}
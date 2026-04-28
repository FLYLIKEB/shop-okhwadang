import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedEnglishValues1776800000000 implements MigrationInterface {
  name = 'SeedEnglishValues1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    await query(`
      UPDATE \`promotions\` SET \`title_en\` = 'Spring Collection — New Jooni Teapots', \`description_en\` = 'New Fuchun Jooni (Zhuni) teapots at special prices. Limited quantities of Jooni Seosiho, Juxingho, and Sebyo. May close early when stock runs out.' WHERE \`id\` = 1
    `);
    await query(`
      UPDATE \`promotions\` SET \`title_en\` = 'Beginner Set 14% Time Sale', \`description_en\` = 'Okhwadang beginner tea set at special price. 280,000 won → 240,000 won (40,000 won discount). Complete set with teapot + dáwǎn + dábàn + chá dōujù.' WHERE \`id\` = 2
    `);
    await query(`
      UPDATE \`promotions\` SET \`title_en\` = 'Boischa Intro Event', \`description_en\` = 'Purchase Daek 7572 aged shucha and get bamboo tea set (5 items). Includes chaceol, chachim, chahyeop, charu, chachim.' WHERE \`id\` = 3
    `);

    await query(`UPDATE \`banners\` SET \`title_en\` = 'Spring Collection — New Jooni Arrivals' WHERE \`id\` = 1`);
    await query(`UPDATE \`banners\` SET \`title_en\` = 'Bangjang Gosu Raw Sheng 2019 Limited' WHERE \`id\` = 2`);
    await query(`UPDATE \`banners\` SET \`title_en\` = 'Beginner Tea Set — 14% Off 240,000 won' WHERE \`id\` = 3`);

    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'All Products' WHERE \`id\` IN (10, 26)`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'JISAHO (Yixing Teapots)' WHERE \`id\` IN (11, 101)`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Jooni' WHERE \`id\` = 12`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Zisha' WHERE \`id\` = 13`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Duani' WHERE \`id\` = 14`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Boischa' WHERE \`id\` IN (15, 102)`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Raw Sheng' WHERE \`id\` = 16`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Aged Shucha' WHERE \`id\` = 17`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Tea Accessories' WHERE \`id\` = 18`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Collections' WHERE \`id\` IN (19, 109)`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Customer Center' WHERE \`id\` = 20`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'FAQ' WHERE \`id\` = 21`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Shipping Info' WHERE \`id\` = 22`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Returns & Exchange' WHERE \`id\` = 23`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Terms of Service' WHERE \`id\` = 24`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Privacy Policy' WHERE \`id\` = 25`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Collection' WHERE \`id\` = 27`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Journal' WHERE \`id\` = 29`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'About Brand' WHERE \`id\` = 50`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Journal' WHERE \`id\` = 51`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Collection' WHERE \`id\` = 52`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Archive' WHERE \`id\` = 53`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Home' WHERE \`id\` = 100`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = 'Best Sellers' WHERE \`id\` = 104`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ By Clay Type' WHERE \`id\` = 150`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ By Shape' WHERE \`id\` = 156`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Old Tea' WHERE \`id\` = 164`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Tea Bowl' WHERE \`id\` = 166`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Tea Tray' WHERE \`id\` = 167`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Tea Set' WHERE \`id\` = 168`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = '└ Tea Tools' WHERE \`id\` = 169`);

    await query(`
      UPDATE \`categories\` SET \`name_en\` = 'JISAHO (Yixing Teapots)', \`description_en\` = 'Traditional teapots crafted from Yixing Zisha clay from Huanglong Mountain, China. Experience 600 years of tea craft. The more you use them, the richer the taste becomes.' WHERE \`id\` = 1
    `);
    await query(`
      UPDATE \`categories\` SET \`name_en\` = 'Boischa', \`description_en\` = 'Premium aged shucha sourced directly from Yunnan Province ancient tea trees. Discover deep flavors and aromas developed over decades. Available in raw, aged, and old varieties.' WHERE \`id\` = 2
    `);
    await query(`
      UPDATE \`categories\` SET \`name_en\` = 'Tea Accessories', \`description_en\` = 'Complete your tea ceremony with our accessory collection. Carefully curated dáwǎn, dábàn, and tea tools to complement your JISAHO teapot.' WHERE \`id\` = 3
    `);
    await query(`
      UPDATE \`categories\` SET \`name_en\` = 'Tea Leaves', \`description_en\` = 'Small-batch premium tea leaves from renowned origins. Explore diverse regions and varieties — Bangjiang, Bingdao, and more.' WHERE \`id\` = 4
    `);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Jooni (Zhuni)', \`description_en\` = 'The quintessential red clay, featuring reddish-amber hues. High shrinkage creates delicate texture with excellent heat conductivity, perfect for high-mountain oolong and black tea.' WHERE \`id\` = 10`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Zisha', \`description_en\` = 'Authentic purple-sand Zisha clay teapots. Exceptional breathability makes them ideal for Boischa and Heicha. Develops a beautiful sheen with use.' WHERE \`id\` = 11`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Duani', \`description_en\` = 'Duani (段泥) teapots in soft yellow tones. Light color palette with clean taste, perfect for green, white, and lightly oxidized oolong teas.' WHERE \`id\` = 12`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Heini', \`description_en\` = 'Deep black Heini (黑泥) teapots. Substantial presence with excellent heat retention, ideal for aged shucha and black tea. Fully fired surface adds character.' WHERE \`id\` = 13`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Qinghuini', \`description_en\` = 'Qinghuini (青灰泥) teapots with subtle blue-gray tones. Elegant and refined aesthetic, well-suited for raw shucha and white tea.' WHERE \`id\` = 14`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Zhuxing (Bamboo Shape)', \`description_en\` = 'Bamboo-joint-inspired Zhuxing (竹型壺). Straight, neat lines with natural vitality. Modern sensibility in traditional form.' WHERE \`id\` = 20`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Shibiao (Stone Pelican)', \`description_en\` = 'Gourd-shaped Shibiao (石瓢壺). Triangular stability with powerful lines. The quintessential Zisha form with triangular lid knob.' WHERE \`id\` = 21`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Seoshi (Xi Shi)', \`description_en\` = 'Named after the legendary beauty Seoshi (西施). Plump, smooth curves express feminine elegance. Easy to grip, recommended for beginners.' WHERE \`id\` = 22`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Byeonpyeong (Flat)', \`description_en\` = 'Low, flat Byeonpyeong (扁平壺) disc shape. Wide base and low profile ensures even leaf expansion for balanced flavor. Ideal for tea trays.' WHERE \`id\` = 23`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Raw Sheng (生茶)', \`description_en\` = 'Naturally fermented raw shucha. Flavor evolves over time — initial bitterness and astringency transform into deep sweetness with age. Explore famed origins like Bangjiang and Bingdao.' WHERE \`id\` = 30`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Aged Shucha (熟茶)', \`description_en\` = 'Wet-pile fermented aged shucha. Smooth, sweet taste ready to drink. Notes of jujube and licorice. Try Daek 7572 as a starting point.' WHERE \`id\` = 31`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Old Tea (老茶)', \`description_en\` = 'Premium shucha aged over 10 years. Deep CHENXIANG (陳香) and medicinal aroma developed over decades. Try in small quantities first.' WHERE \`id\` = 32`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Tea Bowl (Dáwǎn)', \`description_en\` = 'Teacups for drinking tea. Elevate your ceremony with dáwǎn in Zisha, celadon, or porcelain. Curated pieces including Gyeongdeokjin Qinghua, Cheonmokyu, and Yoyeo Bingnyeoyu.' WHERE \`id\` = 40`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Tea Tray (Dábàn)', \`description_en\` = 'Dábàn to display your teapot and cups. Bamboo, stone, or ceramic. Complete your tea ceremony foundation. Trays with water catchment for easy cleanup.' WHERE \`id\` = 41`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Starter Tea Set', \`description_en\` = 'Everything you need for tea ceremony in one set. From beginners to experts — teapot, dáwǎn, dábàn, and tea tools included. Start your tea journey immediately.' WHERE \`id\` = 42`);
    await query(`UPDATE \`categories\` SET \`name_en\` = 'Tea Tools', \`description_en\` = 'Individual tools: chaceol, chachim, chahyeop, charu and more. Carefully selected tools to enhance the joy of the tea preparation process.' WHERE \`id\` = 43`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const query = (sql: string) => queryRunner.query(sql);

    await query(`UPDATE \`promotions\` SET \`title_en\` = NULL, \`description_en\` = NULL WHERE \`id\` IN (1, 2, 3)`);
    await query(`UPDATE \`banners\` SET \`title_en\` = NULL WHERE \`id\` IN (1, 2, 3)`);
    await query(`UPDATE \`navigation_items\` SET \`label_en\` = NULL WHERE \`id\` IN (10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 50, 51, 52, 53, 100, 101, 102, 104, 150, 156, 164, 166, 167, 168, 169)`);
    await query(`UPDATE \`categories\` SET \`name_en\` = NULL, \`description_en\` = NULL WHERE \`id\` IN (1, 2, 3, 4, 10, 11, 12, 13, 14, 20, 21, 22, 23, 30, 31, 32, 40, 41, 42, 43)`);
  }
}
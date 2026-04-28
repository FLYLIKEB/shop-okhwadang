-- English i18n backfill for Okhwadang
-- Tables: products, attribute_types, faqs, notices, pages
-- Run: docker exec -i okhwadang-mysql mysql -uroot -p<pw> commerce --default-character-set=utf8mb4 < backfill-en-i18n.sql

SET NAMES utf8mb4;

-- ─────────────────────────────────────────────
-- products (22 rows)
-- ─────────────────────────────────────────────
UPDATE products SET
  name_en = 'Okhwadang Zhuni Xishi Teapot 120ml',
  short_description_en = 'Fujian Zhuni · Xishi shape · 120ml · Gongfu brewing',
  description_en = 'A Xishi-shape Yixing teapot crafted from Fujian Zhuni (朱泥) clay. The vivid crimson hue and high shrinkage rate of Zhuni produce refined, elegant lines. Its 120ml capacity is optimized for gongfu-style (功夫茶) solo brewing, and the surface develops a natural patina with repeated use.'
WHERE id = 1;

UPDATE products SET
  name_en = 'Okhwadang Zhuni Zhu-Xing Teapot 80ml',
  short_description_en = 'Fujian Zhuni · Zhu-Xing (bead) shape · 80ml · Single-serving',
  description_en = 'A Zhu-Xing (珠形) teapot shaped like a small bead, finished in the deep crimson of Zhuni clay. The hemispherical lid and short right-angle spout form a harmonious whole. At 80ml — just one cup per brew — it is ideal for solo tea rituals.'
WHERE id = 2;

UPDATE products SET
  name_en = 'Okhwadang Zhuni Shipiao Teapot 160ml',
  short_description_en = 'Fujian Zhuni · Shipiao shape · 160ml',
  description_en = 'A Shipiao (石瓢) teapot in Zhuni clay, modeled after a stone gourd ladle. The triangular lid knob and clean linear silhouette blend modern sensibility with classical form. Its 160ml mid-size capacity suits tea sessions for one to two people.'
WHERE id = 3;

UPDATE products SET
  name_en = 'Okhwadang Yixing Zisha Bianping Teapot 200ml',
  short_description_en = 'Yixing Zisha · Bianping (flat) shape · 200ml',
  description_en = 'A Bianping (flat-round) teapot shaped from authentic Yixing (宜興) Zisha clay. Soft curves flow across the flat disc form, and the deep purple-violet of Zisha pairs beautifully with pu-erh. The 200ml capacity fits small tea gatherings of three to four.'
WHERE id = 4;

UPDATE products SET
  name_en = 'Okhwadang Yixing Zisha Xishi Teapot 150ml',
  short_description_en = 'Yixing Zisha · Xishi shape · 150ml',
  description_en = 'A Zisha Xishi teapot with graceful lines and a gently rounded lid, projecting a feminine elegance. The deep violet Zisha clay pairs well with the floral aroma of raw pu-erh. Tea energy (茶氣) accumulates within over time, deepening the flavor.'
WHERE id = 5;

UPDATE products SET
  name_en = 'Okhwadang Yixing Zisha Zhu-Xing Teapot 180ml',
  short_description_en = 'Yixing Zisha · Zhu-Xing (bead) shape · 180ml',
  description_en = 'A round, well-balanced Zhu-Xing Zisha teapot. Zisha''s signature breathability (透氣性) brings out tea aromas while retaining heat. Especially suited to ripe pu-erh (shou) and Wuyi rock teas.'
WHERE id = 6;

UPDATE products SET
  name_en = 'Okhwadang Duan Ni Shipiao Teapot 220ml',
  short_description_en = 'Yixing Duan Ni · Shipiao shape · 220ml',
  description_en = 'A Shipiao teapot in bright yellow-brown Duan Ni (段泥) clay. The pale yellow tone of Duan Ni adds warmth to the tea room. Works well with green and oolong teas, and its 220ml capacity fits gatherings of three to five.'
WHERE id = 7;

UPDATE products SET
  name_en = 'Okhwadang Duan Ni Bianping Teapot 140ml',
  short_description_en = 'Yixing Duan Ni · Bianping (flat) shape · 140ml',
  description_en = 'Restraint in form — the yellow-brown of Duan Ni meets the flat Bianping profile. A broad base and low stance create a stable silhouette, pairing well with aged, full-bodied teas.'
WHERE id = 8;

UPDATE products SET
  name_en = 'Okhwadang Hei Ni Zhu-Xing Teapot 100ml',
  short_description_en = 'Hei Ni (black clay) · Zhu-Xing shape · 100ml',
  description_en = 'A dense, weighty Zhu-Xing teapot in Hei Ni (黑泥) black clay. Its fully fired black surface gains luster with age. When brewing ripe pu-erh or robust Wuyi rock teas, it helps smooth out off-notes in the liquor.'
WHERE id = 9;

UPDATE products SET
  name_en = 'Okhwadang Qing Hui Ni Xishi Teapot 130ml',
  short_description_en = 'Qing Hui Ni · Xishi shape · 130ml',
  description_en = 'A Xishi teapot in cool-toned Qing Hui Ni (靑灰泥) clay. Its finely textured surface is pleasant to the touch, and it especially suits delicately aromatic teas — white, green, and yellow.'
WHERE id = 10;

UPDATE products SET
  name_en = '2019 Banzhang Ancient Tree Raw Pu-erh Cake 357g',
  short_description_en = 'Banzhang ancient tree · Sheng cake 357g · 2019 · Intense huigan',
  description_en = 'A raw pu-erh cake (sheng bing) pressed from Banzhang (班章) ancient-tree material in Menghai County, Yunnan. It is marked by assertive bitterness followed by a deep returning sweetness (回甘), and rewards long-term aging with excellent transformation. Standard 357g cake.'
WHERE id = 11;

UPDATE products SET
  name_en = '2021 Bingdao Ancient Tree Raw Pu-erh Cake 357g',
  short_description_en = 'Bingdao ancient tree · Sheng cake 357g · 2021 · Floral-honey aroma',
  description_en = 'A raw pu-erh cake from Bingdao (冰島) ancient-tree leaf in Lincang, Yunnan. Bingdao''s signature sweet floral-honey aroma, gentle bitterness, and long sweet finish rank it among the finest sheng pu-erhs.'
WHERE id = 12;

UPDATE products SET
  name_en = '2015 Dayi 7572 Ripe Pu-erh Cake 357g',
  short_description_en = 'Dayi 7572 · Shou cake 357g · 2015 · Recommended for beginners',
  description_en = 'The benchmark recipe of ripe pu-erh — Dayi (大益) 7572. This 2015 pressing offers a gently fermented red liquor (紅湯) with pronounced aromas of jujube and wood ear mushroom. Recommended as an entry-level shou pu-erh.'
WHERE id = 13;

UPDATE products SET
  name_en = '2010 Xiaguan FT Ripe Tuocha 250g',
  short_description_en = 'Xiaguan FT · Shou tuocha 250g · 2010 · 10+ years aged',
  description_en = 'A ripe tuocha (熟沱茶) pressed from the FT recipe of Xiaguan Tea Factory (下關茶廠). The firmly compressed bowl-shape tuo has aged for over a decade, yielding a smooth body and deep liquor color.'
WHERE id = 14;

UPDATE products SET
  name_en = '1990s Hongyin Aged Sheng Pu-erh (Sample) 10g',
  short_description_en = 'Hongyin-lineage aged tea · 10g sample · 1990s',
  description_en = 'A sample portion of aged pu-erh in the Hongyin (紅印) lineage, estimated production 1990s. Decades of natural aging have imbued it with deep medicinal (藥香) and camphor-wood (樟木香) notes. Offered as a tasting portion; stock is limited.'
WHERE id = 15;

UPDATE products SET
  name_en = 'Jingdezhen Blue-and-White Porcelain Tea Bowl Set (6pc)',
  short_description_en = 'Jingdezhen blue-and-white · 6 bowls · 80ml each',
  description_en = 'A set of six tea bowls in traditional Jingdezhen (景德鎭) blue-and-white porcelain. Cobalt-blue ink-wash motifs are finely painted, and the thin body with transparent glaze makes the liquor color easy to appreciate.'
WHERE id = 16;

UPDATE products SET
  name_en = 'Jianshui Tenmoku Glazed Tea Bowl (Single)',
  short_description_en = 'Jianshui tenmoku · Hare''s fur pattern · For matcha',
  description_en = 'A tea bowl reviving the Song-dynasty Jianyao (建窯) tenmoku (天目釉) glaze. At high temperature the iron-oxide glaze develops the silvery "hare''s fur" (兎毫) pattern. The wide mouth is optimized for whisking matcha and for tangcha.'
WHERE id = 17;

UPDATE products SET
  name_en = 'Bamboo Tea Tray 40×25cm',
  short_description_en = 'Natural bamboo · 40×25cm · Built-in water drawer',
  description_en = 'A sliced-bamboo tea tray (茶盤) crafted from natural bamboo. Its built-in drainage drawer cleanly collects water spilled during tea service (行茶). Mid-size 40×25cm, accommodating one teapot and up to four bowls.'
WHERE id = 18;

UPDATE products SET
  name_en = 'Okhwadang Beginner''s Tea Ceremony Set',
  short_description_en = 'Teapot + bowls + tray + tea tools · Beginner set',
  description_en = 'An all-in-one set for those new to Yixing tea. Includes a 180ml Zisha Zhu-Xing teapot, two blue-and-white tea bowls, a bamboo tea tray, four bamboo tea tools (chahe, chaze, chajia, chalou), and a tea caddy.'
WHERE id = 19;

UPDATE products SET
  name_en = 'Bamboo Tea Tool Set (5pc)',
  short_description_en = 'Bamboo tea tools · Chahe/Chaze/Chajia/Chalou/Chazhen',
  description_en = 'A five-piece bamboo tea-tool set: chahe (茶獻), chaze (茶則), chajia (茶夾), chalou (茶漏), and chazhen (茶針). Carries the subtle natural fragrance of bamboo and ships with a matching bamboo holder.'
WHERE id = 20;

UPDATE products SET
  name_en = 'Glass Fairness Pitcher (Gongdao Bei) 200ml',
  short_description_en = 'Heat-resistant glass gongdao bei · 200ml · For viewing liquor',
  description_en = 'A clear heat-resistant glass fairness pitcher. Essential for distributing brewed tea evenly, and ideal for viewing the clarity and color of the liquor. 200ml capacity with fine graduated markings.'
WHERE id = 21;

UPDATE products SET
  name_en = 'Ru Yao Crackle-Glaze Tea Bowl (Single)',
  short_description_en = 'Ru ware crackle glaze · Sky-blue · 100ml',
  description_en = 'A tea bowl reviving the Ru ware (汝窯) crackle glaze (氷裂釉) of the Northern Song. The sky-blue (天靑色) glazed surface carries a naturally formed ice-crack pattern of refined beauty. Pairs well with white, green, and lightly oxidized teas.'
WHERE id = 22;

-- ─────────────────────────────────────────────
-- attribute_types (2 rows) — already English-like
-- ─────────────────────────────────────────────
UPDATE attribute_types SET name_en = 'Clay Type' WHERE id = 1;
UPDATE attribute_types SET name_en = 'Shape' WHERE id = 2;

-- ─────────────────────────────────────────────
-- faqs (5 rows)
-- ─────────────────────────────────────────────
UPDATE faqs SET
  question_en = 'I just bought my first Yixing teapot — how do I season (kaihu) it?',
  answer_en = 'Before first use, a Yixing teapot should be seasoned (開壺, kaihu):\n1. Boil the teapot in water for 10–15 minutes to remove any residual odors.\n2. Add the tea leaves you plan to brew with and boil together for another 5 minutes.\n3. Let it cool, rinse thoroughly, and it is ready to use.'
WHERE id = 1;

UPDATE faqs SET
  question_en = 'Do I need to dedicate a Yixing teapot to a single type of tea?',
  answer_en = 'Yixing teapots are porous and absorb a small amount of tea liquor over time. Brewing the same style of tea consistently allows tea energy (茶氣) to build up, deepening the flavor. We recommend keeping separate pots for pu-erh and for oolong.'
WHERE id = 2;

UPDATE faqs SET
  question_en = 'What is the difference between raw (sheng) and ripe (shou) pu-erh?',
  answer_en = 'Sheng (生) pu-erh is naturally fermented, and its flavor evolves over time. It is assertive and astringent when young but holds long-term aging value.\nShou (熟) pu-erh is post-fermented (wet-piled, 악퇴), resulting in a smooth, sweet flavor. It is ready to drink immediately.'
WHERE id = 3;

UPDATE faqs SET
  question_en = 'How long does shipping take?',
  answer_en = 'Orders are dispatched within 1–2 business days of confirmation, with delivery typically taking 1–3 days by courier. Selecting the gift-wrapping option for a teapot adds one business day to processing.'
WHERE id = 4;

UPDATE faqs SET
  question_en = 'What are the exchange and return policies?',
  answer_en = 'For change of mind, exchanges and returns are accepted within 7 days of delivery. Please note that as Yixing teapots are handmade, minor variations in color are not considered defects. For damage or genuine defects, please contact customer service within 3 days of delivery.'
WHERE id = 5;

-- ─────────────────────────────────────────────
-- notices (3 rows)
-- ─────────────────────────────────────────────
UPDATE notices SET
  title_en = 'Okhwadang Grand Opening',
  content_en = 'Hello. Okhwadang (玉花堂), a D2C shop specializing in Yixing teapots, pu-erh, and tea ware, has officially opened.\nWe look forward to introducing fine teapots and pu-erh directly to you.'
WHERE id = 1;

UPDATE notices SET
  title_en = '[Shipping] Standard Delivery and Gift Wrapping',
  content_en = 'Orders are dispatched within 1–2 business days.\nSelecting the traditional wooden-box gift wrapping may add one business day.\nAll teapots are double-packaged to prevent damage during transit.'
WHERE id = 2;

UPDATE notices SET
  title_en = '[Policy] Teapot Exchange and Return Policy',
  content_en = 'Because Yixing teapots are handmade, minor variations in color and glaze expression may occur.\nThese are not considered defects and are not grounds for exchange.\nIn case of damage or genuine defects, please contact customer service within 3 days of delivery.'
WHERE id = 3;

-- ─────────────────────────────────────────────
-- pages (5 rows) — title only (content is block-based)
-- ─────────────────────────────────────────────
UPDATE pages SET title_en = 'Customer Support' WHERE id = 1;
UPDATE pages SET title_en = 'Shipping Information' WHERE id = 2;
UPDATE pages SET title_en = 'Returns & Exchanges' WHERE id = 3;
UPDATE pages SET title_en = 'Terms of Service' WHERE id = 4;
UPDATE pages SET title_en = 'Privacy Policy' WHERE id = 5;

-- Verify
SELECT 'products' t, SUM(name_en IS NULL OR name_en='') en_empty FROM products
UNION ALL SELECT 'attribute_types', SUM(name_en IS NULL OR name_en='') FROM attribute_types
UNION ALL SELECT 'faqs', SUM(question_en IS NULL OR question_en='') FROM faqs
UNION ALL SELECT 'notices', SUM(title_en IS NULL OR title_en='') FROM notices
UNION ALL SELECT 'pages', SUM(title_en IS NULL OR title_en='') FROM pages;

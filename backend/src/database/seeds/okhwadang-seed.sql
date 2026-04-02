-- ============================================================
-- 옥화당 (玉花堂) 자사호·보이차·다구 쇼핑몰 더미데이터
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 기존 데이터 초기화 (의류 더미 → 옥화당 데이터로 교체)
-- ============================================================
TRUNCATE TABLE wishlist;
TRUNCATE TABLE reviews;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE payments;
TRUNCATE TABLE shipping;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_options;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE navigation_items;
TRUNCATE TABLE banners;
TRUNCATE TABLE promotions;
TRUNCATE TABLE notices;
TRUNCATE TABLE faqs;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 2. 카테고리 (부모 → 자식 순서)
-- ============================================================
INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active, image_url) VALUES
-- 최상위 카테고리
(1,  '자사호',    'teapot',       NULL, 1, 1, NULL),
(2,  '보이차',    'puerh-tea',    NULL, 2, 1, NULL),
(3,  '다구',      'tea-ware',     NULL, 3, 1, NULL),
(4,  '다엽',      'tea-leaf',     NULL, 4, 1, NULL),

-- 자사호 > 니료별
(10, '주니',      'zhuní',        1,    1, 1, NULL),
(11, '자사',      'zǐshā',        1,    2, 1, NULL),
(12, '단니',      'duānní',       1,    3, 1, NULL),
(13, '흑니',      'hēiní',        1,    4, 1, NULL),
(14, '청회니',    'qīnghuīní',    1,    5, 1, NULL),

-- 자사호 > 모양별
(20, '주형',      'zhūxíng',      1,    6, 1, NULL),
(21, '석표',      'shípião',      1,    7, 1, NULL),
(22, '서시',      'xīshī',        1,    8, 1, NULL),
(23, '편평',      'biānpíng',     1,    9, 1, NULL),

-- 보이차 > 종류별
(30, '생차 (生茶)',  'sheng-puerh',  2,  1, 1, NULL),
(31, '숙차 (熟茶)',  'shou-puerh',   2,  2, 1, NULL),
(32, '노차 (老茶)',  'aged-puerh',   2,  3, 1, NULL),

-- 다구 > 종류별
(40, '다완',      'teacup',       3,    1, 1, NULL),
(41, '다반',      'tea-tray',     3,    2, 1, NULL),
(42, '다도구 세트', 'tea-set',     3,    3, 1, NULL),
(43, '차 도구',   'tea-tools',    3,    4, 1, NULL);

-- ============================================================
-- 3. 상품 (자사호 15개, 보이차 8개, 다구 7개)
-- ============================================================
INSERT INTO products (id, category_id, name, slug, description, short_description, price, sale_price, stock, sku, status, is_featured) VALUES

-- ── 자사호 (주니) ──────────────────────────────────────────
(1,  10, '옥화당 주니 서시호 120ml',
 'zhuní-xishi-120',
 '복건성 주니(朱泥) 원료로 제작한 서시형 자사호입니다. 주니 특유의 선홍빛 발색과 높은 수축률이 만들어내는 정교한 라인이 특징입니다. 용량 120ml로 공부차(功夫茶) 독음에 최적화되어 있으며, 우린 횟수가 늘수록 자연스러운 광택이 살아납니다.',
 '복건 주니 · 서시형 · 120ml · 공부차 전용',
 580000.00, NULL, 3, 'OHD-ZX-001', 'active', 1),

(2,  10, '옥화당 주니 주형호 80ml',
 'zhuní-zhu-80',
 '작은 공으로 빚은 듯한 주형(珠形) 자사호. 진한 주홍빛 주니 태토가 아름다우며, 반구형 뚜껑과 짧은 직각 주둥이가 조화를 이룹니다. 단차(單泡) 한 잔 분량인 80ml로 일인 다의(茶儀)에 어울립니다.',
 '복건 주니 · 주형 · 80ml · 1인용',
 420000.00, 380000.00, 5, 'OHD-ZZ-002', 'active', 1),

(3,  10, '옥화당 주니 석표호 160ml',
 'zhuní-shipiao-160',
 '돌표주박 형상을 본 딴 석표형(石瓢形) 주니호. 삼각형 뚜껑 손잡이와 직선적인 흐름이 현대적 감각과 전통미를 동시에 담아냅니다. 160ml 중용량으로 1~2인 차회에 적합합니다.',
 '복건 주니 · 석표형 · 160ml',
 650000.00, NULL, 2, 'OHD-ZS-003', 'active', 0),

-- ── 자사호 (자사) ──────────────────────────────────────────
(4,  11, '옥화당 자사 편평호 200ml',
 'zǐshā-biānpíng-200',
 '의흥(宜興) 정통 자사니료 성형한 편평호. 납작한 원판 형태에 부드러운 곡선이 흐르며, 자사 특유의 깊은 자주빛이 우리는 보이차와 완벽하게 어울립니다. 200ml 용량으로 3~4인 소규모 차회에 알맞습니다.',
 '의흥 자사 · 편평형 · 200ml',
 380000.00, NULL, 8, 'OHD-ZB-004', 'active', 1),

(5,  11, '옥화당 자사 서시호 150ml',
 'zǐshā-xishi-150',
 '부드러운 선과 봉긋한 뚜껑이 여성미를 풍기는 자사 서시호. 깊은 자주빛 자사니가 보이 생차의 꽃향과 잘 어우러집니다. 사용할수록 내부에 차기(茶氣)가 쌓여 맛이 한층 깊어집니다.',
 '의흥 자사 · 서시형 · 150ml',
 450000.00, 400000.00, 4, 'OHD-ZX-005', 'active', 0),

(6,  11, '옥화당 자사 주형호 180ml',
 'zǐshā-zhu-180',
 '둥글고 균형잡힌 주형 자사호. 자사니 특유의 투기성(透氣性)이 뛰어나 찻잎 향이 살아나며 열 보존력이 우수합니다. 보이숙차나 무이암차에 특히 잘 맞습니다.',
 '의흥 자사 · 주형 · 180ml',
 320000.00, NULL, 10, 'OHD-ZZ-006', 'active', 0),

-- ── 자사호 (단니) ──────────────────────────────────────────
(7,  12, '옥화당 단니 석표호 220ml',
 'duānní-shipiao-220',
 '밝은 황갈색의 단니(段泥) 태토로 성형한 석표호. 단니 특유의 연황색 발색이 차실(茶室)에 따뜻한 분위기를 더합니다. 녹차·우롱차에도 활용 가능하며, 220ml 대용량으로 3~5인 차회에 적합합니다.',
 '의흥 단니 · 석표형 · 220ml',
 520000.00, NULL, 3, 'OHD-DS-007', 'active', 1),

(8,  12, '옥화당 단니 편평호 140ml',
 'duānní-biānpíng-140',
 '단니의 황갈색과 편평 디자인이 만난 절제미. 넓은 저면과 낮은 높이가 안정적인 실루엣을 만들며, 묵직한 향의 노숙차에 잘 어울립니다.',
 '의흥 단니 · 편평형 · 140ml',
 480000.00, 430000.00, 2, 'OHD-DB-008', 'active', 0),

-- ── 자사호 (흑니) ──────────────────────────────────────────
(9,  13, '옥화당 흑니 주형호 100ml',
 'hēiní-zhu-100',
 '깊고 무게감 있는 흑니(黑泥) 주형호. 완전히 소성된 흑색 표면은 세월이 지날수록 윤기가 더해집니다. 보이 숙차나 진한 무이암차를 우릴 때 찻물의 잡미를 잡아주는 효과가 있습니다.',
 '흑니 · 주형 · 100ml',
 350000.00, NULL, 6, 'OHD-HZ-009', 'active', 0),

-- ── 자사호 (청회니) ────────────────────────────────────────
(10, 14, '옥화당 청회니 서시호 130ml',
 'qīnghuīní-xishi-130',
 '청회빛 차가운 색조를 띠는 청회니(靑灰泥) 서시호. 섬세한 질감의 태토가 손에 닿는 촉감이 좋으며, 향이 섬세한 백차·녹차·황차에 특히 잘 어울립니다.',
 '청회니 · 서시형 · 130ml',
 420000.00, NULL, 4, 'OHD-QX-010', 'active', 1),

-- ── 보이차 ────────────────────────────────────────────────
(11, 30, '2019년 반장 고수 생병 357g',
 'banjang-gushu-2019-sheng',
 '운남성 맹해현 반장(班章) 고수차(古樹茶) 원료로 압제한 생병(生餅). 강렬한 쓴맛 뒤에 오는 깊은 회감(回甘)이 특징이며, 장기 보관 시 뛰어난 전화(轉化)를 기대할 수 있습니다. 357g 표준 병차.',
 '반장 고수 · 생병 357g · 2019년 · 강렬한 회감',
 180000.00, NULL, 20, 'OHD-PT-011', 'active', 1),

(12, 30, '2021년 빙도 고수 생병 357g',
 'bingdao-gushu-2021-sheng',
 '운남 임창 빙도(冰島) 고수원료 생병. 빙도 특유의 달콤한 화밀향과 부드러운 쓴맛, 긴 여운의 감미(甘味)로 최고급 생차 중 하나로 꼽힙니다.',
 '빙도 고수 · 생병 357g · 2021년 · 화밀향',
 320000.00, NULL, 10, 'OHD-PT-012', 'active', 1),

(13, 31, '2015년 대익 7572 숙병 357g',
 'dayi-7572-2015-shou',
 '보이숙차의 기준이 되는 대익(大益) 7572 배방. 2015년 압제본으로 부드럽게 발효된 홍탕(紅湯)과 진한 대추·목이버섯향이 특징입니다. 입문용 숙차로 추천.',
 '대익 7572 · 숙병 357g · 2015년 · 입문 추천',
 85000.00, 75000.00, 30, 'OHD-PS-013', 'active', 0),

(14, 31, '2010년 하관 FT 숙타 250g',
 'xiaguan-ft-2010-shou-tuo',
 '하관차창(下關茶廠) FT 배방 숙타차(熟沱茶). 단단히 압제된 버섯 모양의 타차 형태로, 10년 이상 숙성되어 부드럽고 진한 탕색이 돋보입니다.',
 '하관 FT · 숙타 250g · 2010년 · 10년 숙성',
 65000.00, NULL, 15, 'OHD-PS-014', 'active', 0),

(15, 32, '1990년대 홍인 노숙병 (소분) 10g',
 'hong-yin-1990s-aged-10g',
 '1990년대 제작 추정 홍인(紅印) 계열 노차 소분. 수십 년 자연 숙성된 약향(藥香)과 함목향(樟木香)이 깊게 배어 있습니다. 시음 목적 소분 상품이며 재고가 한정적입니다.',
 '홍인 계열 노차 · 10g 소분 · 1990년대',
 120000.00, NULL, 8, 'OHD-PA-015', 'active', 1),

-- ── 다구 ──────────────────────────────────────────────────
(16, 40, '경덕진 청화 다완 6P 세트',
 'jingdezhen-blue-white-teacup-6p',
 '경덕진(景德鎭) 전통 청화자기 다완 6개 세트. 코발트블루 수묵화 문양이 섬세하게 그려져 있으며, 얇은 태토와 투명 유약으로 찻물 색을 감상하기에 좋습니다.',
 '경덕진 청화 · 다완 6P · 80ml',
 120000.00, 105000.00, 12, 'OHD-TW-016', 'active', 1),

(17, 40, '건수요 천목유 다완 단품',
 'jian-ware-tenmoku-teacup',
 '송대(宋代) 건요(建窯) 천목유(天目釉) 재현 다완. 산화철 유약이 고온에서 만들어내는 은빛 토끼 털 문양(兎毫紋)이 아름답습니다. 말차(抹茶) 및 탕차(湯茶)에 최적화된 넓은 입구 형태.',
 '건수요 천목유 · 토호문 · 말차용',
 58000.00, NULL, 20, 'OHD-TW-017', 'active', 0),

(18, 41, '대나무 다반 40×25cm',
 'bamboo-tea-tray-40x25',
 '천연 대나무를 슬라이스 가공한 다반(茶盤). 물받이 서랍이 내장되어 있어 행다(行茶) 중 흘린 물을 깔끔하게 처리할 수 있습니다. 40×25cm 중형으로 자사호 + 다완 4개 배치 가능.',
 '천연 대나무 · 40×25cm · 물받이 내장',
 89000.00, NULL, 15, 'OHD-TR-018', 'active', 1),

(19, 42, '옥화당 입문 다도구 세트',
 'okhwadang-starter-tea-set',
 '자사호 입문자를 위한 올인원 다도구 세트. 자사 주형호 180ml, 청화 다완 2P, 대나무 다반, 차헌·차칙·차협·차루 4종 차도구(茶道具), 차통(茶筒)이 포함된 구성입니다.',
 '자사호+다완+다반+차도구 세트 · 입문 구성',
 280000.00, 240000.00, 7, 'OHD-TS-019', 'active', 1),

(20, 43, '대나무 차도구 5종 세트',
 'bamboo-tea-tools-5p',
 '차헌(茶獻)·차칙(茶則)·차협(茶夾)·차루(茶漏)·차침(茶針) 5종으로 구성된 대나무 차도구 세트. 천연 대나무 특유의 은은한 향이 나며 차도구 통(筒)이 함께 제공됩니다.',
 '대나무 차도구 5종 · 차헌/차칙/차협/차루/차침',
 35000.00, NULL, 25, 'OHD-TT-020', 'active', 0),

(21, 43, '유리 공도배 (公道杯) 200ml',
 'glass-fairness-cup-200ml',
 '투명 내열유리 공도배. 우린 찻물을 고르게 나눠주는 필수 다구로, 맑은 탕색 감상에 최적입니다. 200ml 용량에 세밀한 눈금 인쇄가 특징입니다.',
 '내열유리 공도배 · 200ml · 탕색 감상',
 22000.00, NULL, 40, 'OHD-TT-021', 'active', 0),

(22, 40, '여요 빙렬유 다완 단품',
 'ru-ware-crackle-teacup',
 '북송(北宋) 여요(汝窯) 빙렬유(氷裂釉) 재현 다완. 천청색(天靑色) 유약 표면에 자연스럽게 형성된 빙렬(氷裂) 문양이 고아한 아름다움을 자아냅니다. 백차·녹차·청차에 어울립니다.',
 '여요 빙렬유 · 천청색 · 100ml',
 75000.00, NULL, 10, 'OHD-TW-022', 'active', 1);

-- ============================================================
-- 4. 상품 이미지 (Unsplash 스타일 placeholder URL)
-- ============================================================
INSERT INTO product_images (product_id, url, alt, sort_order, is_thumbnail) VALUES
-- 주니 서시호
(1, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800', '옥화당 주니 서시호 정면', 0, 1),
(1, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800', '주니 서시호 측면', 1, 0),
(1, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800', '주니 서시호 뚜껑 상세', 2, 0),
-- 주니 주형호
(2, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', '주니 주형호', 0, 1),
-- 주니 석표호
(3, 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800', '주니 석표호', 0, 1),
-- 자사 편평호
(4, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', '자사 편평호', 0, 1),
-- 자사 서시호
(5, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', '자사 서시호', 0, 1),
-- 자사 주형호
(6, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', '자사 주형호', 0, 1),
-- 단니 석표호
(7, 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800', '단니 석표호', 0, 1),
-- 단니 편평호
(8, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', '단니 편평호', 0, 1),
-- 흑니 주형호
(9, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', '흑니 주형호', 0, 1),
-- 청회니 서시호
(10, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800', '청회니 서시호', 0, 1),
-- 반장 생병
(11, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '반장 고수 생병', 0, 1),
(11, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '반장 생병 포장지 상세', 1, 0),
-- 빙도 생병
(12, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '빙도 고수 생병', 0, 1),
-- 대익 7572 숙병
(13, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '대익 7572 숙병', 0, 1),
-- 하관 숙타
(14, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '하관 FT 숙타', 0, 1),
-- 홍인 노차
(15, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '홍인 노차 소분', 0, 1),
-- 경덕진 청화 다완
(16, 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800', '경덕진 청화 다완 6P', 0, 1),
-- 건수요 천목유 다완
(17, 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800', '건수요 천목유 다완', 0, 1),
-- 대나무 다반
(18, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800', '대나무 다반', 0, 1),
-- 입문 세트
(19, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800', '옥화당 입문 다도구 세트', 0, 1),
(19, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800', '세트 구성품 전체', 1, 0),
-- 차도구 5종
(20, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800', '대나무 차도구 5종', 0, 1),
-- 공도배
(21, 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800', '유리 공도배', 0, 1),
-- 여요 빙렬유 다완
(22, 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800', '여요 빙렬유 다완', 0, 1);

-- ============================================================
-- 5. 상품 옵션
-- ============================================================
INSERT INTO product_options (product_id, name, value, price_adjustment, stock, sort_order) VALUES
-- 주니 서시호: 선물포장 옵션
(1, '포장', '일반 포장', 0, 3, 0),
(1, '포장', '전통 목함 선물포장', 30000, 2, 1),
-- 자사 편평호: 용량 선택
(4, '포장', '일반 포장', 0, 5, 0),
(4, '포장', '전통 목함 선물포장', 30000, 3, 1),
-- 보이차 생병: 보관함 옵션
(11, '보관', '기본 포장', 0, 15, 0),
(11, '보관', '전통 죽지 보관함 포함', 15000, 5, 1),
(12, '보관', '기본 포장', 0, 8, 0),
(12, '보관', '전통 죽지 보관함 포함', 15000, 2, 1),
-- 입문 세트: 자사호 니료 선택
(19, '자사호 니료', '자사 (기본)', 0, 4, 0),
(19, '자사호 니료', '단니 (+20,000)', 20000, 2, 1),
(19, '자사호 니료', '주니 (+50,000)', 50000, 1, 2);

-- ============================================================
-- 6. 네비게이션 (옥화당 구조)
-- ============================================================
INSERT INTO navigation_items (id, `group`, label, url, sort_order, is_active, parent_id) VALUES
-- GNB
(1,  'gnb', '홈',         '/',                          0, 1, NULL),
(2,  'gnb', '자사호',     '/products?category=teapot',  1, 1, NULL),
(3,  'gnb', '보이차',     '/products?category=puerh-tea', 2, 1, NULL),
(4,  'gnb', '다구',       '/products?category=tea-ware', 3, 1, NULL),
(5,  'gnb', '베스트',     '/products?sort=popular',     4, 1, NULL),
(6,  'gnb', '브랜드 소개', '/p/about',                  5, 1, NULL),

-- Sidebar
(10, 'sidebar', '전체 상품',  '/products',                         0, 1, NULL),
(11, 'sidebar', '자사호',     '/products?category=teapot',         1, 1, NULL),
(12, 'sidebar', '└ 주니',     '/products?category=zhuní',          2, 1, 11),
(13, 'sidebar', '└ 자사',     '/products?category=zǐshā',          3, 1, 11),
(14, 'sidebar', '└ 단니',     '/products?category=duānní',         4, 1, 11),
(15, 'sidebar', '보이차',     '/products?category=puerh-tea',      5, 1, NULL),
(16, 'sidebar', '└ 생차',     '/products?category=sheng-puerh',    6, 1, 15),
(17, 'sidebar', '└ 숙차',     '/products?category=shou-puerh',     7, 1, 15),
(18, 'sidebar', '다구',       '/products?category=tea-ware',       8, 1, NULL),
(19, 'sidebar', '기획전',     '/p/exhibition',                     9, 1, NULL),

-- Footer
(20, 'footer', '이용약관',        '/terms',   0, 1, NULL),
(21, 'footer', '개인정보처리방침', '/privacy', 1, 1, NULL),
(22, 'footer', '공지사항',        '/notices', 2, 1, NULL),
(23, 'footer', 'FAQ',             '/faq',     3, 1, NULL),
(24, 'footer', '고객센터',        '/inquiry', 4, 1, NULL),
(25, 'footer', '브랜드 소개',     '/p/about', 5, 1, NULL);

-- ============================================================
-- 7. 배너
-- ============================================================
INSERT INTO banners (title, image_url, link_url, sort_order, is_active, starts_at, ends_at) VALUES
('옥화당 봄 기획전 — 주니 신작 입고', 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=1400', '/p/spring-2026', 0, 1, '2026-03-01 00:00:00', '2026-04-30 23:59:59'),
('반장 고수 생병 2019년 한정 입고', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1400', '/products/banjang-gushu-2019-sheng', 1, 1, '2026-03-15 00:00:00', '2026-05-15 23:59:59'),
('입문 다도구 세트 — 14% 특가', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1400', '/products/okhwadang-starter-tea-set', 2, 1, NULL, NULL);

-- ============================================================
-- 8. 프로모션
-- ============================================================
INSERT INTO promotions (title, description, type, starts_at, ends_at, is_active, discount_rate, image_url) VALUES
('봄 기획전 — 주니 신작', '복건 주니 신작 자사호 선착순 특가. 재고 한정으로 조기 마감될 수 있습니다.', 'exhibition', '2026-03-29 00:00:00', '2026-04-30 23:59:59', 1, NULL, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800'),
('입문 세트 14% 타임세일', '옥화당 입문 다도구 세트 한정 수량 특가 — 280,000원 → 240,000원', 'timesale', '2026-03-29 09:00:00', '2026-04-05 23:59:59', 1, 14, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800'),
('보이차 입문 이벤트', '대익 7572 숙병 구매 시 대나무 차도구 5종 증정 이벤트', 'event', '2026-04-01 00:00:00', '2026-04-30 23:59:59', 1, NULL, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800');

-- ============================================================
-- 9. 공지사항
-- ============================================================
INSERT INTO notices (title, content, is_pinned, is_published) VALUES
('옥화당 오픈 안내', '안녕하세요. 자사호·보이차·다구 전문 D2C 쇼핑몰 옥화당(玉花堂)이 정식 오픈하였습니다.\n앞으로 좋은 자사호와 보이차를 직접 소개해 드리겠습니다.', 1, 1),
('[배송 안내] 일반 배송 및 선물 포장 안내', '주문 후 1~2 영업일 내 출고됩니다.\n전통 목함 선물포장 옵션 선택 시 추가 1 영업일이 소요될 수 있습니다.\n자사호 특성상 파손 방지를 위해 이중 포장 처리됩니다.', 0, 1),
('[이용 안내] 자사호 교환·반품 정책', '자사호는 수공예 특성상 미세한 색감 차이 및 유약 표현이 있을 수 있습니다.\n이는 불량이 아니며 교환 사유가 되지 않습니다.\n파손 및 제품 불량의 경우 수령 후 3일 이내 고객센터로 문의 주세요.', 1, 1);

-- ============================================================
-- 10. FAQ
-- ============================================================
INSERT INTO faqs (question, answer, category, sort_order, is_published) VALUES
('자사호를 처음 구매했는데 어떻게 개호(開壺)하나요?', '자사호를 처음 사용하기 전에는 개호(開壺) 과정이 필요합니다.\n1. 자사호를 끓는 물에 10~15분간 끓여 잡냄새를 제거합니다.\n2. 우릴 예정인 찻잎을 넣고 다시 5분간 끓입니다.\n3. 식힌 후 깨끗이 헹궈 사용합니다.', '상품', 1, 1),
('자사호에 담당차(擔當茶)를 정해야 하나요?', '자사호는 기공성(氣孔性)이 있어 찻물이 미세하게 흡수됩니다. 한 종류의 차를 꾸준히 우리면 차기(茶氣)가 쌓여 맛이 깊어집니다. 보이차용, 우롱차용으로 구분해 사용하시는 것을 권장드립니다.', '상품', 2, 1),
('보이차 생차와 숙차의 차이는 무엇인가요?', '생차(生茶)는 자연 발효 방식으로 시간이 지날수록 맛이 변화합니다. 초기에는 쓴맛·떫은맛이 있으며 장기 보관 가치가 있습니다.\n숙차(熟茶)는 인공 발효(악퇴 발효)를 거쳐 부드럽고 달콤한 맛을 지닙니다. 바로 음용하기 좋습니다.', '상품', 3, 1),
('배송은 얼마나 걸리나요?', '주문 확인 후 1~2 영업일 내 출고되며, 이후 택배 기준 1~3일 내 수령 가능합니다. 자사호 선물포장 옵션 선택 시 +1 영업일이 소요됩니다.', '배송', 1, 1),
('교환·반품 기간은 어떻게 되나요?', '단순 변심의 경우 수령 후 7일 이내에 교환·반품 가능합니다. 자사호는 수공예 특성상 미세한 색감 차이는 불량이 아님을 양해 부탁드립니다. 파손·불량의 경우 수령 후 3일 이내 고객센터로 연락 주세요.', '교환/반품', 1, 1);

-- ============================================================
-- 11. 사이트 설정 업데이트 (옥화당 브랜드 색상/정보)
-- ============================================================
UPDATE site_settings SET value = '#8B4513' WHERE setting_key = 'color_primary';
UPDATE site_settings SET value = '#FFFDF7' WHERE setting_key = 'color_primary_foreground';
UPDATE site_settings SET value = '#F5F0E8' WHERE setting_key = 'color_background';
UPDATE site_settings SET value = '#2C1810' WHERE setting_key = 'color_foreground';
UPDATE site_settings SET value = '#F9F5EE' WHERE setting_key = 'color_card';
UPDATE site_settings SET value = '#2C1810' WHERE setting_key = 'color_card_foreground';
UPDATE site_settings SET value = '#E8DFD0' WHERE setting_key = 'color_border';
UPDATE site_settings SET value = '#F2EDE4' WHERE setting_key = 'color_muted';
UPDATE site_settings SET value = '#8B7355' WHERE setting_key = 'color_muted_foreground';
UPDATE site_settings SET value = '#A0522D' WHERE setting_key = 'color_accent';
UPDATE site_settings SET value = '#FFFDF7' WHERE setting_key = 'color_accent_foreground';
UPDATE site_settings SET value = '#8B4513' WHERE setting_key = 'color_ring';

INSERT IGNORE INTO site_settings (setting_key, value, group_key, description, type, category, default_value, sort_order)
VALUES ('mobile_bottom_nav_visible', 'true', 'general', '하단 네비게이션 표시', 'boolean', 'display', 'true', 999);

SELECT '✅ 옥화당 더미데이터 삽입 완료' AS result;

-- ============================================================
-- 옥화당 (玉花堂) 자사호·보이차·다구 쇼핑몰 더미데이터
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 기존 데이터 초기화 (의류 더미 → 옥화당 데이터로 교체)
-- ============================================================
TRUNCATE TABLE users;
TRUNCATE TABLE wishlist;
TRUNCATE TABLE reviews;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE payments;
TRUNCATE TABLE shipping;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_detail_images;
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
-- 4. 상품 이미지 (S3 URL)
-- ============================================================
INSERT INTO product_images (product_id, url, alt, sort_order, is_thumbnail) VALUES
-- 주니 서시호 (4 images)
(1, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '옥화당 주니 서시호 정면', 0, 1),
(1, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 서시호 측면', 1, 0),
(1, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 서시호 뚜껑 상세', 2, 0),
(1, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '주니 서시호 차와 함께', 3, 0),
-- 주니 주형호 (4 images)
(2, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 주형호 정면', 0, 1),
(2, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 주형호 측면', 1, 0),
(2, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 주형호 주둥이 상세', 2, 0),
(2, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '주니 주형호 사용 예시', 3, 0),
-- 주니 석표호 (4 images)
(3, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 석표호 정면', 0, 1),
(3, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 석표호 상단', 1, 0),
(3, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 석표호 바닥', 2, 0),
(3, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '주니 석표호 손잡이 상세', 3, 0),
-- 자사 편평호 (4 images)
(4, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 편평호 정면', 0, 1),
(4, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 편평호 상단', 1, 0),
(4, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 편평호 옆면', 2, 0),
(4, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '자사 편평호 차와 함께', 3, 0),
-- 자사 서시호 (4 images)
(5, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 서시호 정면', 0, 1),
(5, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 서시호 뚜껑', 1, 0),
(5, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 서시호 손잡이', 2, 0),
(5, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '자사 서시호 사용 예시', 3, 0),
-- 자사 주형호 (4 images)
(6, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 주형호 정면', 0, 1),
(6, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 주형호 전체', 1, 0),
(6, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 주형호 내부', 2, 0),
(6, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '자사 주형호 보이차와 함께', 3, 0),
-- 단니 석표호 (4 images)
(7, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 석표호 정면', 0, 1),
(7, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 석표호 색감', 1, 0),
(7, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 석표호 손잡이', 2, 0),
(7, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '단니 석표호 차와 함께', 3, 0),
-- 단니 편평호 (4 images)
(8, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 편평호 정면', 0, 1),
(8, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 편평호 상단', 1, 0),
(8, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 편평호 옆면', 2, 0),
(8, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '단니 편평호 다반 위', 3, 0),
-- 흑니 주형호 (4 images)
(9, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '흑니 주형호 정면', 0, 1),
(9, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '흑니 주형호 전체', 1, 0),
(9, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '흑니 주형호 질감', 2, 0),
(9, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '흑니 주형호 숙차와 함께', 3, 0),
-- 청회니 서시호 (4 images)
(10, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '청회니 서시호 정면', 0, 1),
(10, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '청회니 서시호 상단', 1, 0),
(10, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '청회니 서시호 색감', 2, 0),
(10, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '청회니 서시호 백차와 함께', 3, 0),
-- 반장 생병 (5 images)
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '반장 고수 생병 전경', 0, 1),
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '반장 생병 포장지', 1, 0),
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '반장 생병 단면', 2, 0),
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '반장 생병 찻잎', 3, 0),
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '반장 생병 탕색', 4, 0),
-- 빙도 생병 (5 images)
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '빙도 고수 생병 전경', 0, 1),
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '빙도 생병 포장지', 1, 0),
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '빙도 생병 단면', 2, 0),
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '빙도 생병 차와 함께', 3, 0),
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '빙도 생병 탕색', 4, 0),
-- 대익 7572 숙병 (5 images)
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '대익 7572 숙병 전경', 0, 1),
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '대익 7572 포장지', 1, 0),
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '대익 7572 단면', 2, 0),
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대익 7572 차와 함께', 3, 0),
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대익 7572 탕색', 4, 0),
-- 하관 숙타 (5 images)
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '하관 FT 숙타 전경', 0, 1),
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '하관 숙타 전체', 1, 0),
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '하관 숙타 단면', 2, 0),
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '하관 숙타 사용 예시', 3, 0),
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '하관 숙타 탕색', 4, 0),
-- 홍인 노차 (5 images)
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '홍인 노차 소분 전경', 0, 1),
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '홍인 노차 포장', 1, 0),
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '홍인 노차 단면', 2, 0),
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '홍인 노차 차잎', 3, 0),
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '홍인 노차 탕색', 4, 0),
-- 경덕진 청화 다완 6P (5 images)
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 6P 전체', 0, 1),
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 단품', 1, 0),
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 문양 상세', 2, 0),
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 차와 함께', 3, 0),
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 탕색 감상', 4, 0),
-- 건수요 천목유 다완 (5 images)
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 다완 전체', 0, 1),
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 토호문 상세', 1, 0),
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 바닥', 2, 0),
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 말차와 함께', 3, 0),
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 빛 아래', 4, 0),
-- 대나무 다반 (5 images)
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 전체', 0, 1),
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 질감', 1, 0),
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 물받이', 2, 0),
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 자사호와 함께', 3, 0),
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 차도구와 함께', 4, 0),
-- 입문 다도구 세트 (6 images)
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '옥화당 입문 다도구 세트 전체', 0, 1),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '세트 구성품 전개', 1, 0),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '세트 자사호 상세', 2, 0),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '세트 다완 상세', 3, 0),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '세트 다반 상세', 4, 0),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '세트 사용 예시', 5, 0),
-- 대나무 차도구 5종 (5 images)
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 차도구 5종 전체', 0, 1),
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '차헌 상세', 1, 0),
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '차칙 상세', 2, 0),
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '차도구 통과 함께', 3, 0),
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '차도구 사용 예시', 4, 0),
-- 유리 공도배 (5 images)
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 전체', 0, 1),
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 눈금 상세', 1, 0),
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 주둥이', 2, 0),
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 찻물 담긴 상태', 3, 0),
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 다반 위', 4, 0),
-- 여요 빙렬유 다완 (5 images)
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 다완 전체', 0, 1),
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 천청색', 1, 0),
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 빙렬 문양', 2, 0),
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 빛 아래', 3, 0),
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 차와 함께', 4, 0);

-- ============================================================
-- 4-2. 상품 상세정보 이미지 (상세정보 탭용)
-- ============================================================
INSERT INTO product_detail_images (product_id, url, alt, sort_order, is_active) VALUES
-- 주니 서시호
(1, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 서시호 상세 설명 이미지', 0, 1),
-- 주니 주형호
(2, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 주형호 상세 설명 이미지', 0, 1),
-- 주니 석표호
(3, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '주니 석표호 상세 설명 이미지', 0, 1),
-- 자사 편평호
(4, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 편평호 상세 설명 이미지', 0, 1),
-- 자사 서시호
(5, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 서시호 상세 설명 이미지', 0, 1),
-- 자사 주형호
(6, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '자사 주형호 상세 설명 이미지', 0, 1),
-- 단니 석표호
(7, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 석표호 상세 설명 이미지', 0, 1),
-- 단니 편평호
(8, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '단니 편평호 상세 설명 이미지', 0, 1),
-- 흑니 주형호
(9, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '흑니 주형호 상세 설명 이미지', 0, 1),
-- 청회니 서시호
(10, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', '청회니 서시호 상세 설명 이미지', 0, 1),
-- 반장 생병
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '반장 고수 생병 상세정보 1', 0, 1),
(11, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '반장 고수 생병 상세정보 2', 1, 1),
-- 빙도 생병
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '빙도 고수 생병 상세정보 1', 0, 1),
(12, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '빙도 고수 생병 상세정보 2', 1, 1),
-- 대익 7572 숙병
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '대익 7572 숙병 상세정보 1', 0, 1),
(13, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대익 7572 숙병 상세정보 2', 1, 1),
-- 하관 숙타
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '하관 숙타 상세정보 1', 0, 1),
(14, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '하관 숙타 상세정보 2', 1, 1),
-- 홍인 노차
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', '홍인 노차 상세정보 1', 0, 1),
(15, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '홍인 노차 상세정보 2', 1, 1),
-- 경덕진 청화 다완
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 상세정보 1', 0, 1),
(16, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '경덕진 청화 다완 상세정보 2', 1, 1),
-- 건수요 천목유 다완
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 다완 상세정보 1', 0, 1),
(17, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '건수요 천목유 다완 상세정보 2', 1, 1),
-- 대나무 다반
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 상세정보 1', 0, 1),
(18, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 다반 상세정보 2', 1, 1),
-- 입문 다도구 세트
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '입문 세트 상세정보 1', 0, 1),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '입문 세트 상세정보 2', 1, 1),
(19, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '입문 세트 상세정보 3', 2, 1),
-- 대나무 차도구 5종
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 차도구 상세정보 1', 0, 1),
(20, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '대나무 차도구 상세정보 2', 1, 1),
-- 유리 공도배
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 상세정보 1', 0, 1),
(21, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '유리 공도배 상세정보 2', 1, 1),
-- 여요 빙렬유 다완
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 다완 상세정보 1', 0, 1),
(22, 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', '여요 빙렬유 다완 상세정보 2', 1, 1);

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
-- 11. 테스트 사용자 (리뷰 작성을 위해 필요)
-- ============================================================
INSERT INTO users (id, email, password, name, phone, role, is_active, created_at, updated_at) VALUES
(1, 'reviewer1@okhwadang.com', '$2b$10$wJAaOWFn9rdHbx3K5AEzu.mpoUHtqMxPWzE9WSWSm15Vj85WdCL7S', '김차림', NULL, 'user', 1, NOW(), NOW()),
(2, 'reviewer2@okhwadang.com', '$2b$10$oe0RiBM7H3BAATi0ip1eGO1NT0wCqeKG3SBowfVaLUDytUC4i9dRq', '이보이', NULL, 'user', 1, NOW(), NOW()),
(3, 'reviewer3@okhwadang.com', '$2b$10$yICUqkVMdV.yu9IUVU7F7uc754wywBlXAGCgRC/ao3LQ7mOHM6uyS', '박다구', NULL, 'user', 1, NOW(), NOW()),
(4, 'reviewer4@okhwadang.com', '$2b$10$4l/Mqok3lGJuc2/uWUiZS.5TXBGlysr0vzjJ2bmsVCGO3p7C/Xel.', '정자호', NULL, 'user', 1, NOW(), NOW());

-- 어드민 계정
INSERT INTO users (id, email, password, name, phone, role, is_active, created_at, updated_at) VALUES
(99, 'admin@okhwadang.com', '$2b$10$l46hZJmq5F8DoKvHZrQ0geSQgIxVXjaDPn2oCv7fv5L2AHtMQPSlW', '관리자', NULL, 'admin', 1, NOW(), NOW());

-- ============================================================
-- 12. 주문 (리뷰 작성용으로 delivery 완료 상태)
-- ============================================================
INSERT INTO orders (id, user_id, order_number, status, total_amount, discount_amount, shipping_fee, recipient_name, recipient_phone, zipcode, address, address_detail, memo, points_used, created_at, updated_at) VALUES
(1, 1, 'ORD-20260301-001', 'delivered', 580000, 0, 0, '김차림', '010-1234-1001', '06000', '서울특별시 강남구 테헤란로 1', '101동 1001호', NULL, 0, '2026-03-01 10:00:00', '2026-03-05 14:00:00'),
(2, 2, 'ORD-20260302-001', 'delivered', 760000, 0, 0, '이보이', '010-1234-1002', '06000', '서울특별시 강남구 테헤란로 2', '202동 2002호', NULL, 0, '2026-03-02 11:00:00', '2026-03-06 15:00:00'),
(3, 3, 'ORD-20260303-001', 'delivered', 650000, 0, 0, '박다구', '010-1234-1003', '06000', '서울특별시 서초구 방배로 3', '303동 3003호', NULL, 0, '2026-03-03 09:00:00', '2026-03-07 16:00:00'),
(4, 4, 'ORD-20260304-001', 'delivered', 380000, 0, 0, '정자호', '010-1234-1004', '06000', '서울특별시 마포구 합정로 4', '404동 4004호', NULL, 0, '2026-03-04 14:00:00', '2026-03-08 11:00:00'),
(5, 1, 'ORD-20260305-001', 'delivered', 450000, 50000, 0, '김차림', '010-1234-1001', '06000', '서울특별시 강남구 테헤란로 1', '101동 1001호', NULL, 0, '2026-03-05 10:00:00', '2026-03-09 14:00:00'),
(6, 2, 'ORD-20260306-001', 'delivered', 520000, 0, 0, '이보이', '010-1234-1002', '06000', '서울특별시 강남구 테헤란로 2', '202동 2002호', NULL, 0, '2026-03-06 11:00:00', '2026-03-10 15:00:00'),
(7, 3, 'ORD-20260307-001', 'delivered', 180000, 0, 0, '박다구', '010-1234-1003', '06000', '서울특별시 서초구 방배로 3', '303동 3003호', NULL, 0, '2026-03-07 09:00:00', '2026-03-11 16:00:00'),
(8, 4, 'ORD-20260308-001', 'delivered', 320000, 0, 0, '정자호', '010-1234-1004', '06000', '서울특별시 마포구 합정로 4', '404동 4004호', NULL, 0, '2026-03-08 14:00:00', '2026-03-12 11:00:00'),
(9, 1, 'ORD-20260309-001', 'delivered', 75000, 0, 0, '김차림', '010-1234-1001', '06000', '서울특별시 강남구 테헤란로 1', '101동 1001호', NULL, 0, '2026-03-09 10:00:00', '2026-03-13 14:00:00'),
(10, 2, 'ORD-20260310-001', 'delivered', 120000, 15000, 0, '이보이', '010-1234-1002', '06000', '서울특별시 강남구 테헤란로 2', '202동 2002호', NULL, 0, '2026-03-10 11:00:00', '2026-03-14 15:00:00'),
(11, 3, 'ORD-20260311-001', 'delivered', 240000, 40000, 0, '박다구', '010-1234-1003', '06000', '서울특별시 서초구 방배로 3', '303동 3003호', NULL, 0, '2026-03-11 09:00:00', '2026-03-15 16:00:00'),
(12, 4, 'ORD-20260312-001', 'delivered', 120000, 0, 0, '정자호', '010-1234-1004', '06000', '서울특별시 마포구 합정로 4', '404동 4004호', NULL, 0, '2026-03-12 14:00:00', '2026-03-16 11:00:00'),
(13, 1, 'ORD-20260313-001', 'delivered', 105000, 0, 0, '김차림', '010-1234-1001', '06000', '서울특별시 강남구 테헤란로 1', '101동 1001호', NULL, 0, '2026-03-13 10:00:00', '2026-03-17 14:00:00'),
(14, 2, 'ORD-20260314-001', 'delivered', 89000, 0, 0, '이보이', '010-1234-1002', '06000', '서울특별시 강남구 테헤란로 2', '202동 2002호', NULL, 0, '2026-03-14 11:00:00', '2026-03-18 15:00:00'),
(15, 3, 'ORD-20260315-001', 'delivered', 58000, 0, 0, '박다구', '010-1234-1003', '06000', '서울특별시 서초구 방배로 3', '303동 3003호', NULL, 0, '2026-03-15 09:00:00', '2026-03-19 16:00:00');

-- ============================================================
-- 13. 주문항목 (리뷰 연결용)
-- ============================================================
INSERT INTO order_items (id, order_id, product_id, product_option_id, product_name, option_name, price, quantity) VALUES
(1, 1, 1, NULL, '옥화당 주니 서시호 120ml', NULL, 580000, 1),
(2, 2, 2, NULL, '옥화당 주니 주형호 80ml', NULL, 380000, 2),
(3, 3, 3, NULL, '옥화당 주니 석표호 160ml', NULL, 650000, 1),
(4, 4, 4, NULL, '옥화당 자사 편평호 200ml', NULL, 380000, 1),
(5, 5, 5, NULL, '옥화당 자사 서시호 150ml', NULL, 400000, 1),
(6, 6, 7, NULL, '옥화당 단니 석표호 220ml', NULL, 520000, 1),
(7, 7, 11, NULL, '2019년 반장 고수 생병 357g', NULL, 180000, 1),
(8, 8, 12, NULL, '2021년 빙도 고수 생병 357g', NULL, 320000, 1),
(9, 9, 13, NULL, '2015년 대익 7572 숙병 357g', NULL, 75000, 1),
(10, 10, 16, NULL, '경덕진 청화 다완 6P 세트', NULL, 105000, 1),
(11, 11, 19, NULL, '옥화당 입문 다도구 세트', NULL, 240000, 1),
(12, 12, 18, NULL, '대나무 다반 40×25cm', NULL, 89000, 1),
(13, 13, 16, NULL, '경덕진 청화 다완 6P 세트', NULL, 105000, 1),
(14, 14, 18, NULL, '대나무 다반 40×25cm', NULL, 89000, 1),
(15, 15, 17, NULL, '건수요 천목유 다완 단품', NULL, 58000, 1),
(16, 1, 2, NULL, '옥화당 주니 주형호 80ml', NULL, 380000, 1),
(17, 2, 4, NULL, '옥화당 자사 편평호 200ml', NULL, 380000, 1),
(18, 3, 6, NULL, '옥화당 자사 주형호 180ml', NULL, 320000, 1),
(19, 4, 8, NULL, '옥화당 단니 편평호 140ml', NULL, 430000, 1),
(20, 5, 10, NULL, '옥화당 청회니 서시호 130ml', NULL, 420000, 1),
(21, 6, 14, NULL, '2010년 하관 FT 숙타 250g', NULL, 65000, 1),
(22, 7, 15, NULL, '1990년대 홍인 노숙병 (소분) 10g', NULL, 120000, 1),
(23, 8, 20, NULL, '대나무 차도구 5종 세트', NULL, 35000, 1),
(24, 9, 21, NULL, '유리 공도배 (公道杯) 200ml', NULL, 22000, 1),
(25, 10, 22, NULL, '여요 빙렬유 다완 단품', NULL, 75000, 1),
(26, 11, 1, NULL, '옥화당 주니 서시호 120ml', NULL, 580000, 1),
(27, 12, 5, NULL, '옥화당 자사 서시호 150ml', NULL, 400000, 1),
(28, 13, 7, NULL, '옥화당 단니 석표호 220ml', NULL, 520000, 1),
(29, 14, 11, NULL, '2019년 반장 고수 생병 357g', NULL, 180000, 1),
(30, 15, 12, NULL, '2021년 빙도 고수 생병 357g', NULL, 320000, 1),
(31, 2, 9, NULL, '옥화당 흑니 주형호 100ml', NULL, 350000, 1),
(32, 3, 10, NULL, '옥화당 청회니 서시호 130ml', NULL, 420000, 1),
(33, 4, 19, NULL, '옥화당 입문 다도구 세트', NULL, 240000, 1),
(34, 5, 20, NULL, '대나무 차도구 5종 세트', NULL, 35000, 1),
(35, 6, 21, NULL, '유리 공도배 (公道杯) 200ml', NULL, 22000, 1),
(36, 7, 22, NULL, '여요 빙렬유 다완 단품', NULL, 75000, 1),
(37, 8, 1, NULL, '옥화당 주니 서시호 120ml', NULL, 580000, 1),
(38, 9, 2, NULL, '옥화당 주니 주형호 80ml', NULL, 380000, 1),
(39, 10, 3, NULL, '옥화당 주니 석표호 160ml', NULL, 650000, 1),
(40, 11, 4, NULL, '옥화당 자사 편평호 200ml', NULL, 380000, 1),
(41, 12, 6, NULL, '옥화당 자사 주형호 180ml', NULL, 320000, 1),
(42, 13, 8, NULL, '옥화당 단니 편평호 140ml', NULL, 430000, 1),
(43, 14, 9, NULL, '옥화당 흑니 주형호 100ml', NULL, 350000, 1),
(44, 15, 10, NULL, '옥화당 청회니 서시호 130ml', NULL, 420000, 1),
(45, 1, 13, NULL, '2015년 대익 7572 숙병 357g', NULL, 75000, 1),
(46, 2, 14, NULL, '2010년 하관 FT 숙타 250g', NULL, 65000, 1),
(47, 3, 15, NULL, '1990년대 홍인 노숙병 (소분) 10g', NULL, 120000, 1),
(48, 4, 17, NULL, '건수요 천목유 다완 단품', NULL, 58000, 1),
(49, 5, 20, NULL, '대나무 차도구 5종 세트', NULL, 35000, 1),
(50, 6, 21, NULL, '유리 공도배 (公道杯) 200ml', NULL, 22000, 1);

-- ============================================================
-- 14. 상품 리뷰 (제품당 2~4개)
-- ============================================================
INSERT INTO reviews (user_id, product_id, order_item_id, rating, content, image_urls, is_visible, created_at) VALUES
-- 제품 1: 주니 서시호 120ml (3 reviews)
(1, 1, 1, 5, '처음 자사호를 구매해보는데 정말 만족스럽습니다. 복건 주니 특유의 선홍빛이 차를 따를 때마다 아름답습니다. 120ml 용량이 딱 좋아서 공부차 한 잔씩 마시기 완벽해요. 오히려 크기가 작아서 더 소중히 여겨지네요.', NULL, 1, '2026-03-05 15:00:00'),
(2, 1, 16, 5, '선물로 구매했어요. 포장도 꼼꼼하고壶 сами도 정말 예쁩니다. 받은 분이很喜欢하셨어요. 다음엔 자신용으로 하나 더 살까 생각중입니다.', NULL, 1, '2026-03-06 10:00:00'),
(3, 1, 26, 4, '完成度高得很。壶身线条流畅，壶嘴出水顺畅，断水干净。唯一的小遗憾是壶盖稍微紧了一些，需要适应一段时间。整体来说非常满意，会推荐给朋友。', NULL, 1, '2026-03-07 14:00:00'),

-- 제품 2: 주니 주형호 80ml (2 reviews)
(2, 2, 2, 5, '작은 주형이 너무 귀엽습니다. 일인茶器로 완벽해요. 은은한 주홍빛이 은은하고, 들었을 때의 무게감이 정말 좋네요. 단차 한 잔의 소중함을 느끼게 해줍니다.', NULL, 1, '2026-03-06 16:00:00'),
(4, 2, 38, 4, '소형 주형호 찾고 있었는데 완벽합니다. 직각 주둥이에서 물이 깔끔하게 떨어져요. 다만 소라니까 관리도一丝不苟해야 하는 것 같아요.', NULL, 1, '2026-03-10 09:00:00'),

-- 제품 3: 주니 석표호 160ml (2 reviews)
(3, 3, 3, 5, '삼각형 뚜껑 손잡이가 정말 독특해요. 현대적이면서도 전통미가 느껴집니다. 160ml라 1~2인 차회에 딱이고, 열 보존력도 좋습니다. 강추합니다!', NULL, 1, '2026-03-07 17:00:00'),
(4, 3, 39, 5, '石瓢器型很有韵味，壶身线条简约大方。使用了一段时间后，壶表面开始出现自然的光泽，越用越喜欢。物超所值！', NULL, 1, '2026-03-12 10:00:00'),

-- 제품 4: 자사 편평호 200ml (3 reviews)
(1, 4, 4, 5, '자사니의 깊은 자주빛이 은은하게 나타나요. 200ml로 3~4인 차회에 적합하고, 납작한 형태가 다반 위에 올리기 좋네요. 색차가 예쁘서tea display로도 좋습니다.', NULL, 1, '2026-03-08 11:00:00'),
(3, 4, 17, 4, '收到了，比想象中还要漂亮。紫砂的质感很温润，泡茶时能感受到很好的透气性。不过价格稍贵，希望能有更多优惠活动。', NULL, 1, '2026-03-09 15:00:00'),
(4, 4, 40, 5, '편평호 디자인이 정말 절제미가 있어요. 차가 깊이 우러나오고, 자사 특유의 향이 살아납니다. 단尼克使用하기 딱 좋아요.', NULL, 1, '2026-03-13 14:00:00'),

-- 제품 5: 자사 서시호 150ml (2 reviews)
(2, 5, 5, 5, '女性에게 추천하는 자사호. 부드러운 선과 봉긋한 뚜껑이 아름답고, 자주빛이 은은해요. 사용하면 사용할수록 내부에 차기가 쌓여 맛이 깊어지는 느낌이 들어요.', NULL, 1, '2026-03-09 12:00:00'),
(4, 5, 27, 4, '收到的壶很精美，只是壶身有些细微的痕迹，不过不影响使用。泡出来的茶味道很好，感谢店家的用心包装！', NULL, 1, '2026-03-14 16:00:00'),

-- 제품 6: 자사 주형호 180ml (2 reviews)
(1, 6, 18, 5, '둥글고 균형잡힌 형태가 손에 쏙 옙니다.透气성이 정말 탁월해서なのか、茶葉의 향이 살아나요. 특히 무이암차에 잘 맞습니다. 강추!', NULL, 1, '2026-03-08 15:00:00'),
(4, 6, 41, 5, '180ml的容量很实用，圆形壶身适合泡各种茶。壶嘴设计合理，出水流畅。紫砂的质地很细腻，是一把值得收藏的好壶。', NULL, 1, '2026-03-15 11:00:00'),

-- 제품 7: 단니 석표호 220ml (3 reviews)
(3, 7, 6, 5, '단니 특유의 연황색이 따뜻한 분위기를 만들어줘요. 220ml 대용량이라 가족 차회에 딱입니다. 녹차龙泉茶にも良いですね。', NULL, 1, '2026-03-10 17:00:00'),
(1, 7, 28, 4, '色泽温润，质感细腻。壶身线条流畅，看起来非常高档。泡茶时能感受到良好的透气性，推荐购买。', NULL, 1, '2026-03-14 10:00:00'),
(2, 7, 29, 5, '段泥紫砂壶真的很有韵味，黄褐色的表面透着一种古朴的美感。220ml容量适中，很适合与朋友一起品茶。', NULL, 1, '2026-03-16 14:00:00'),

-- 제품 8: 단니 편평호 140ml (2 reviews)
(4, 8, 19, 4, '단니 황갈색과 편평 디자인이 절제미 넘칩니다. 넓은 저면이 안정적이고, 묵직한 향의 노숙차에 잘 어울려요. 다만 140ml가 조금 작긴 해요.', NULL, 1, '2026-03-12 12:00:00'),
(2, 8, 42, 5, '收到了，比预想的还要精致。段泥的质地很细腻，颜色也很漂亮。140ml的容量很适合一人独饮，推荐！', NULL, 1, '2026-03-17 09:00:00'),

-- 제품 9: 흑니 주형호 100ml (2 reviews)
(1, 9, 31, 5, '흑니 특유의 깊고 무게감 있는 색상이 정말 고급스럽습니다. 完全に黑められた表面は时代ととも光泽が加わり，真的是越用越喜欢。숙차 진한 맛에 잘 어울려요.', NULL, 1, '2026-03-11 13:00:00'),
(4, 9, 43, 4, '黑泥壶很有质感，100ml的容量很适合泡浓茶。壶身虽小但很有分量，使用时能感受到良好的保温性。', NULL, 1, '2026-03-18 15:00:00'),

-- 제품 10: 청회니 서시호 130ml (2 reviews)
(2, 10, 20, 5, '청회빛 차가운 색조가 정말 독특해요. 질감이 섬세하고 손에 닿는 촉감이 좋아요. 특히 꽃향이 나는 백차나 황차에 잘 어울립니다. 추천!', NULL, 1, '2026-03-12 11:00:00'),
(4, 10, 44, 5, '青灰泥紫砂壶非常特别，颜色清冷带着一丝神秘感。130ml的容量很适合泡细嫩的茶叶，壶身线条优美，很满意这次购买。', NULL, 1, '2026-03-19 10:00:00'),

-- 제품 11: 반장 고수 생병 357g (3 reviews)
(3, 11, 7, 5, '반장 고수차의 강렬한 쓴맛 뒤에 오는 깊은 회감이 정말 좋습니다. 2019년산이라 전화가 시작되고 있어요. 장기 보관용으로买了一饼，下次再买。', NULL, 1, '2026-03-11 18:00:00'),
(1, 11, 37, 4, '收到了，包装很仔细，茶饼压得很紧实。迫不及待开了一片尝试，苦味过后回甘明显，期待后期的转化。', NULL, 1, '2026-03-13 16:00:00'),
(2, 11, 46, 5, '班章古树茶真的名不虚传，茶气足，回甘持久。虽然价格不便宜，但品质对得起这个价格。会继续关注！', NULL, 1, '2026-03-15 11:00:00'),

-- 제품 12: 빙도 고수 생병 357g (2 reviews)
(4, 12, 8, 5, '빙도 특유의 화밀향이 정말 좋습니다. 부드러운 쓴맛과 긴 여운의 감미가 최고예요. 2021년산치고는 정말 훌륭합니다. 강추합니다!', NULL, 1, '2026-03-12 13:00:00'),
(3, 12, 30, 5, '冰岛古树生茶真的很好喝，入口甜润，回甘持久。茶汤通透，质量上乘。感谢店家的专业推荐，下次还会购买。', NULL, 1, '2026-03-17 15:00:00'),

-- 제품 13: 대익 7572 숙병 357g (2 reviews)
(2, 13, 9, 4, '입문용 숙차로 완벽해요. 부드럽게 발효된 홍탕이 맛있고, 대추·목이버섯향이 은은해요. 가격 대비 품질이 좋아요.再次购买。', NULL, 1, '2026-03-13 12:00:00'),
(1, 13, 45, 4, '大益7572不愧是熟茶标杆，茶汤红浓透亮，口感醇滑。适合日常品饮，也会推荐给朋友。', NULL, 1, '2026-03-16 09:00:00'),

-- 제품 14: 하관 FT 숙타 250g (2 reviews)
(1, 14, 21, 5, '10년 숙성된 숙타차라니, 타차 형태로 압제되어 있어 휴대하기 좋네요. 약향과 함목향이 깊게 배어 있고, 탕색이 정말 낫습니다.満足！', NULL, 1, '2026-03-14 14:00:00'),
(2, 14, 47, 5, '下关茶厂的熟沱茶确实不错，10年的陈化让茶汤更加醇厚。蘑菇香和木香交织，回甘持久。包装也很精美。', NULL, 1, '2026-03-18 12:00:00'),

-- 제품 15: 홍인 노숙병 10g (2 reviews)
(3, 15, 22, 5, '1990년대 추정 홍인 계열이라니, 시음 목적이라 오히려 소분으로 산 것이 잘한 것 같아요. 수십 년 자연 숙성된 약향이 깊고 함목향이 은은해요.宝贵的体验。', NULL, 1, '2026-03-15 10:00:00'),
(4, 15, 48, 5, '红印系列老茶真的不一样，药香和樟木香非常浓郁。10g的小包装很适合品鉴，感谢店家能提供这样的好茶。', NULL, 1, '2026-03-19 14:00:00'),

-- 제품 16: 경덕진 청화 다완 6P (2 reviews)
(2, 16, 10, 5, '경덕진 전통 청화자기가 정말 예쁘습니다. 코발트블루 수묵화 문양이 섬세하고, 얇은 태토가 찻물 색을 감상하기 좋아요. 선물에도 완벽합니다.', NULL, 1, '2026-03-14 16:00:00'),
(1, 16, 13, 5, '一套六只茶杯非常精美，蓝色彩绘图案细腻。茶杯轻薄但结实，泡茶时能更好地欣赏茶汤的颜色。物超所值！', NULL, 1, '2026-03-17 11:00:00'),

-- 제품 17: 건수요 천목유 다완 (2 reviews)
(4, 17, 15, 5, '천목유 토호문(兎毫紋)이 정말 아름답습니다. 은빛 털 문양이 산화철 유약에서 자연스럽게 나타나는 게 정말 신기해요. 말차에 완벽해요!', NULL, 1, '2026-03-19 12:00:00'),
(3, 17, 49, 4, '建窑天目釉茶盏很有宋代的古韵，兔毫纹在光线下非常漂亮。适合抹茶和汤茶使用，保温性也不错。', NULL, 1, '2026-03-20 09:00:00'),

-- 제품 18: 대나무 다반 40×25cm (2 reviews)
(1, 18, 12, 5, '천연 대나무 다반이 차실에 따뜻한 분위기를 더해줍니다. 물받이 서랍이 있어서 행다할 때溢れた물을 깔끔하게 처리할 수 있어요. 40×25cm는 자사호 + 다완 4개 배치하기 좋습니다.', NULL, 1, '2026-03-16 12:00:00'),
(2, 18, 14, 5, '竹制茶盘质量很好，纹理自然美观。带排水装置非常实用，泡茶时不用担心茶水溢出。尺寸适中，很满意。', NULL, 1, '2026-03-18 10:00:00'),

-- 제품 19: 입문 다도구 세트 (3 reviews)
(3, 19, 11, 5, '입문자必须的올인원 세트입니다. 자사호, 다완, 다반, 차도구까지 다 들어있어서 초보자도 바로 차를 즐길 수 있어요. 품질도 기대 이상이에요. 선물에도 좋습니다!', NULL, 1, '2026-03-15 14:00:00'),
(1, 19, 32, 5, '一套完整的茶具套装，包括茶壶茶杯茶盘和工具。材质都很好，特别是紫砂壶的质地很细腻。非常适合初学者。', NULL, 1, '2026-03-17 13:00:00'),
(4, 19, 33, 4, '收到了，套装很齐全，包装也很仔细。只是紫砂壶的泥料稍微有点杂色，不过不影响使用。整体满意。', NULL, 1, '2026-03-20 11:00:00'),

-- 제품 20: 대나무 차도구 5종 (2 reviews)
(2, 20, 23, 4, '차헌·차칙·차협·차루·차침 5종이 모두 대나무로 만들어져 은은한 향이나요. 차도구 통도 함께 제공되어 관리하기 좋네요. 입문자 추천합니다!', NULL, 1, '2026-03-12 15:00:00'),
(1, 20, 34, 5, '竹制茶具套装质量很好，每件工具都做工精细。天然竹子的香气与茶香很配，整体性价比很高。', NULL, 1, '2026-03-16 10:00:00'),

-- 제품 21: 유리 공도배 200ml (2 reviews)
(4, 21, 24, 5, '투명 내열유리 공도배가 찻물 색을 감상하기 정말 좋네요. 200ml 용량에 세밀한 눈금도 있어 정확한 분할이 가능해요. 차도구 필수품입니다!', NULL, 1, '2026-03-13 11:00:00'),
(3, 21, 35, 5, '玻璃公道杯透明度很高，可以清楚地看到茶汤的颜色。200ml容量实用，带刻度设计很贴心。值得购买。', NULL, 1, '2026-03-17 16:00:00'),

-- 제품 22: 여요 빙렬유 다완 (2 reviews)
(1, 22, 25, 5, '천청색 유약 표면에 자연스럽게 형성된 빙렬 문양이 고아한 아름다움을 자아냅니다. 백차·녹차·청차에 모두 잘 어울려요. 소장가치가 있습니다!', NULL, 1, '2026-03-14 15:00:00'),
(2, 22, 36, 5, '汝窑冰裂纹茶杯非常精美，天青色的釉面配上自然的冰裂纹，看起来很高档。100ml容量适合品茗，很满意。', NULL, 1, '2026-03-19 13:00:00');

-- ============================================================
-- 15. 사이트 설정 업데이트 (옥화당 브랜드 색상/정보)
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

INSERT IGNORE INTO site_settings (setting_key, value, `group`, label, input_type, options, default_value, sort_order)
VALUES ('mobile_bottom_nav_visible', 'false', 'general', '하단 네비게이션 표시', 'boolean', NULL, 'false', 999);

SELECT '✅ 옥화당 더미데이터 삽입 완료' AS result;

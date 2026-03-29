-- MySQL dump 10.13  Distrib 9.5.0, for macos15.7 (arm64)
--
-- Host: 127.0.0.1    Database: commerce
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `banners`
--

DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banners`
--

LOCK TABLES `banners` WRITE;
/*!40000 ALTER TABLE `banners` DISABLE KEYS */;
INSERT INTO `banners` VALUES (1,'옥화당 봄 기획전 — 주니 신작 입고','https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=1400','/p/spring-2026',0,1,'2026-03-01 00:00:00','2026-04-30 23:59:59','2026-03-29 14:07:45.554972'),(2,'반장 고수 생병 2019년 한정 입고','https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1400','/products/banjang-gushu-2019-sheng',1,1,'2026-03-15 00:00:00','2026-05-15 23:59:59','2026-03-29 14:07:45.554972'),(3,'입문 다도구 세트 — 14% 특가','https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1400','/products/okhwadang-starter-tea-set',2,1,NULL,NULL,'2026-03-29 14:07:45.554972');
/*!40000 ALTER TABLE `banners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `product_option_id` bigint DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_user_product_option` (`user_id`,`product_id`,`product_option_id`),
  KEY `FK_30e89257a105eab7648a35c7fce` (`product_id`),
  KEY `FK_aca133af2ad799543cfa48cfe2b` (`product_option_id`),
  CONSTRAINT `FK_30e89257a105eab7648a35c7fce` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `FK_aca133af2ad799543cfa48cfe2b` FOREIGN KEY (`product_option_id`) REFERENCES `product_options` (`id`),
  CONSTRAINT `FK_b7213c20c1ecdc6597abc8f1212` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_420d9f679d41281f282f5bc7d0` (`slug`),
  KEY `IDX_88cea2dc9c31951d06437879b4` (`parent_id`),
  CONSTRAINT `FK_88cea2dc9c31951d06437879b40` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'자사호','teapot',NULL,1,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(2,'보이차','puerh-tea',NULL,2,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(3,'다구','tea-ware',NULL,3,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(4,'다엽','tea-leaf',NULL,4,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(10,'주니','zhuní',1,1,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(11,'자사','zǐshā',1,2,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(12,'단니','duānní',1,3,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(13,'흑니','hēiní',1,4,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(14,'청회니','qīnghuīní',1,5,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(20,'주형','zhūxíng',1,6,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(21,'석표','shípião',1,7,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(22,'서시','xīshī',1,8,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(23,'편평','biānpíng',1,9,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(30,'생차 (生茶)','sheng-puerh',2,1,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(31,'숙차 (熟茶)','shou-puerh',2,2,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(32,'노차 (老茶)','aged-puerh',2,3,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(40,'다완','teacup',3,1,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(41,'다반','tea-tray',3,2,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(42,'다도구 세트','tea-set',3,3,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143'),(43,'차 도구','tea-tools',3,4,1,NULL,'2026-03-29 14:07:45.536143','2026-03-29 14:07:45.536143');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('percentage','fixed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(12,2) NOT NULL,
  `min_order_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `max_discount` decimal(12,2) DEFAULT NULL,
  `total_quantity` int DEFAULT NULL,
  `issued_count` int NOT NULL DEFAULT '0',
  `starts_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faqs`
--

DROP TABLE IF EXISTS `faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faqs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faqs`
--

LOCK TABLES `faqs` WRITE;
/*!40000 ALTER TABLE `faqs` DISABLE KEYS */;
INSERT INTO `faqs` VALUES (1,'상품','자사호를 처음 구매했는데 어떻게 개호(開壺)하나요?','자사호를 처음 사용하기 전에는 개호(開壺) 과정이 필요합니다.\n1. 자사호를 끓는 물에 10~15분간 끓여 잡냄새를 제거합니다.\n2. 우릴 예정인 찻잎을 넣고 다시 5분간 끓입니다.\n3. 식힌 후 깨끗이 헹궈 사용합니다.',1,1,'2026-03-29 14:07:45.561467','2026-03-29 14:07:45.561467'),(2,'상품','자사호에 담당차(擔當茶)를 정해야 하나요?','자사호는 기공성(氣孔性)이 있어 찻물이 미세하게 흡수됩니다. 한 종류의 차를 꾸준히 우리면 차기(茶氣)가 쌓여 맛이 깊어집니다. 보이차용, 우롱차용으로 구분해 사용하시는 것을 권장드립니다.',2,1,'2026-03-29 14:07:45.561467','2026-03-29 14:07:45.561467'),(3,'상품','보이차 생차와 숙차의 차이는 무엇인가요?','생차(生茶)는 자연 발효 방식으로 시간이 지날수록 맛이 변화합니다. 초기에는 쓴맛·떫은맛이 있으며 장기 보관 가치가 있습니다.\n숙차(熟茶)는 인공 발효(악퇴 발효)를 거쳐 부드럽고 달콤한 맛을 지닙니다. 바로 음용하기 좋습니다.',3,1,'2026-03-29 14:07:45.561467','2026-03-29 14:07:45.561467'),(4,'배송','배송은 얼마나 걸리나요?','주문 확인 후 1~2 영업일 내 출고되며, 이후 택배 기준 1~3일 내 수령 가능합니다. 자사호 선물포장 옵션 선택 시 +1 영업일이 소요됩니다.',1,1,'2026-03-29 14:07:45.561467','2026-03-29 14:07:45.561467'),(5,'교환/반품','교환·반품 기간은 어떻게 되나요?','단순 변심의 경우 수령 후 7일 이내에 교환·반품 가능합니다. 자사호는 수공예 특성상 미세한 색감 차이는 불량이 아님을 양해 부탁드립니다. 파손·불량의 경우 수령 후 3일 이내 고객센터로 연락 주세요.',1,1,'2026-03-29 14:07:45.561467','2026-03-29 14:07:45.561467');
/*!40000 ALTER TABLE `faqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inquiries`
--

DROP TABLE IF EXISTS `inquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inquiries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `type` enum('상품','배송','결제','교환/반품','기타') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','answered') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `answer` longtext COLLATE utf8mb4_unicode_ci,
  `answered_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_inquiries_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inquiries`
--

LOCK TABLES `inquiries` WRITE;
/*!40000 ALTER TABLE `inquiries` DISABLE KEYS */;
/*!40000 ALTER TABLE `inquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,1711234567890,'AddProductsAndCategories1711234567890'),(2,1774422597135,'AddCartItemsTable1774422597135'),(3,1711100000000,'CreateUsersTable1711100000000'),(4,1774425466051,'AddOrdersTables1774425466051'),(5,1774425995915,'AddPaymentsShippingTables1774425995915'),(6,1774499861060,'CreateUserAuthenticationsTable1774499861060'),(7,1774502521605,'CreateUserAddressesTable1774502521605'),(8,1774510727813,'AddProductNameFulltextIndex1774510727813'),(9,1774515000000,'UpdateShippingAddInTransit1774515000000'),(10,1774500000000,'AddReviewsTable1774500000000'),(11,1774600000000,'AddPagesAndPageBlocks1774600000000'),(12,1774700000000,'AddNavigationItems1774700000000'),(13,1774800000000,'CreateWishlistTable1774800000000'),(14,1774900000000,'CreateCouponsTable1774900000000'),(15,1775000000000,'CreateNoticesFaqsInquiries1775000000000'),(16,1775100000000,'AddPerformanceIndexes1775100000000'),(17,1775200000000,'CreatePromotionsBannersTable1775200000000'),(18,1775300000000,'CreateSiteSettingsTable1775300000000'),(19,1775400000000,'AddMissingThemeDefaults1775400000000');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `navigation_items`
--

DROP TABLE IF EXISTS `navigation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `navigation_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group` enum('gnb','sidebar','footer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `parent_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_navigation_items_parent_id` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `navigation_items`
--

LOCK TABLES `navigation_items` WRITE;
/*!40000 ALTER TABLE `navigation_items` DISABLE KEYS */;
INSERT INTO `navigation_items` VALUES (1,'gnb','홈','/',0,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(2,'gnb','자사호','/products?category=teapot',1,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(3,'gnb','보이차','/products?category=puerh-tea',2,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(4,'gnb','다구','/products?category=tea-ware',3,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(5,'gnb','베스트','/products?sort=popular',4,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(6,'gnb','브랜드 소개','/p/about',5,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(10,'sidebar','전체 상품','/products',0,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(11,'sidebar','자사호','/products?category=teapot',1,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(12,'sidebar','└ 주니','/products?category=zhuní',2,1,11,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(13,'sidebar','└ 자사','/products?category=zǐshā',3,1,11,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(14,'sidebar','└ 단니','/products?category=duānní',4,1,11,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(15,'sidebar','보이차','/products?category=puerh-tea',5,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(16,'sidebar','└ 생차','/products?category=sheng-puerh',6,1,15,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(17,'sidebar','└ 숙차','/products?category=shou-puerh',7,1,15,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(18,'sidebar','다구','/products?category=tea-ware',8,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(19,'sidebar','기획전','/p/exhibition',9,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(20,'footer','이용약관','/terms',0,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(21,'footer','개인정보처리방침','/privacy',1,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(22,'footer','공지사항','/notices',2,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(23,'footer','FAQ','/faq',3,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(24,'footer','고객센터','/inquiry',4,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915'),(25,'footer','브랜드 소개','/p/about',5,1,NULL,'2026-03-29 14:07:45.552915','2026-03-29 14:07:45.552915');
/*!40000 ALTER TABLE `navigation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notices`
--

DROP TABLE IF EXISTS `notices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `view_count` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notices`
--

LOCK TABLES `notices` WRITE;
/*!40000 ALTER TABLE `notices` DISABLE KEYS */;
INSERT INTO `notices` VALUES (1,'옥화당 오픈 안내','안녕하세요. 자사호·보이차·다구 전문 D2C 쇼핑몰 옥화당(玉花堂)이 정식 오픈하였습니다.\n앞으로 좋은 자사호와 보이차를 직접 소개해 드리겠습니다.',1,1,0,'2026-03-29 14:07:45.558841','2026-03-29 14:07:45.558841'),(2,'[배송 안내] 일반 배송 및 선물 포장 안내','주문 후 1~2 영업일 내 출고됩니다.\n전통 목함 선물포장 옵션 선택 시 추가 1 영업일이 소요될 수 있습니다.\n자사호 특성상 파손 방지를 위해 이중 포장 처리됩니다.',0,1,0,'2026-03-29 14:07:45.558841','2026-03-29 14:07:45.558841'),(3,'[이용 안내] 자사호 교환·반품 정책','자사호는 수공예 특성상 미세한 색감 차이 및 유약 표현이 있을 수 있습니다.\n이는 불량이 아니며 교환 사유가 되지 않습니다.\n파손 및 제품 불량의 경우 수령 후 3일 이내 고객센터로 문의 주세요.',1,1,0,'2026-03-29 14:07:45.558841','2026-03-29 14:07:45.558841');
/*!40000 ALTER TABLE `notices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `product_option_id` bigint DEFAULT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_9263386c35b6b242540f9493b0` (`product_id`),
  KEY `IDX_145532db85752b29c57d2b7b1f` (`order_id`),
  KEY `FK_5dd538d6ee529025a2d8fac5146` (`product_option_id`),
  CONSTRAINT `FK_145532db85752b29c57d2b7b1f1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_5dd538d6ee529025a2d8fac5146` FOREIGN KEY (`product_option_id`) REFERENCES `product_options` (`id`),
  CONSTRAINT `FK_9263386c35b6b242540f9493b00` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','paid','preparing','shipped','delivered','cancelled','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `total_amount` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `recipient_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zipcode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_detail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `memo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `points_used` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_75eba1c6b1a66b09f2a97e6927` (`order_number`),
  KEY `IDX_c884e321f927d5b86aac7c8f9e` (`created_at`),
  KEY `IDX_775c9f06fc27ae3ff8fb26f2c4` (`status`),
  KEY `IDX_a922b820eeef29ac1c6800e826` (`user_id`),
  KEY `IDX_orders_user_id` (`user_id`),
  KEY `IDX_orders_status` (`status`),
  CONSTRAINT `FK_a922b820eeef29ac1c6800e826a` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `page_blocks`
--

DROP TABLE IF EXISTS `page_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `page_blocks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `page_id` bigint NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` json NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_visible` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_page_blocks_page_id` (`page_id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `page_blocks`
--

LOCK TABLES `page_blocks` WRITE;
/*!40000 ALTER TABLE `page_blocks` DISABLE KEYS */;
INSERT INTO `page_blocks` VALUES (28,1,'hero_banner','{\"title\": \"2025 SS 신상 도착\", \"cta_text\": \"바로 쇼핑하기\", \"subtitle\": \"트렌디한 새 시즌 컬렉션을 지금 만나보세요\", \"template\": \"split\", \"image_url\": \"\"}',0,1,'2026-03-26 11:25:20.000000','2026-03-26 11:36:16.000000'),(29,1,'category_nav','{\"template\": \"text\", \"category_ids\": [1, 2, 3, 4, 5]}',2,1,'2026-03-26 11:25:20.000000','2026-03-26 11:36:16.000000'),(30,1,'product_carousel','{\"limit\": 8, \"title\": \"신상품 추천\"}',3,1,'2026-03-26 11:25:20.000000','2026-03-26 11:36:16.000000'),(31,1,'promotion_banner','{\"title\": \"여름 특가 최대 50% 할인\", \"cta_text\": \"할인 상품 보기\", \"subtitle\": \"6월 30일까지 한정 기간 특가\", \"expires_at\": \"2025-06-30\"}',4,1,'2026-03-26 11:25:20.000000','2026-03-26 11:36:16.000000'),(32,1,'product_grid','{\"limit\": 8, \"title\": \"베스트 상품\", \"template\": \"4col\"}',5,1,'2026-03-26 11:25:20.000000','2026-03-26 11:36:16.000000'),(33,1,'text_content','{\"html\": \"<p>고객 만족을 최우선으로 생각하는 쇼핑몰입니다. 언제든지 문의해 주세요.</p>\"}',6,1,'2026-03-26 11:25:20.000000','2026-03-26 11:36:16.000000'),(34,2,'hero_banner','{\"title\": \"여름 세일 SUMMER SALE\", \"cta_text\": \"지금 쇼핑하기\", \"subtitle\": \"최대 50% 특별 할인 혜택\", \"image_url\": \"\"}',0,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(35,2,'promotion_banner','{\"title\": \"추가 쿠폰 10% 적용 가능!\", \"cta_text\": \"쿠폰 받기\", \"subtitle\": \"회원 전용 추가 할인 쿠폰을 발급받으세요\", \"expires_at\": \"2025-08-31\"}',1,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(36,2,'product_grid','{\"limit\": 12, \"title\": \"세일 상품 전체보기\", \"template\": \"3col\"}',2,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(37,3,'hero_banner','{\"title\": \"NEW ARRIVALS\", \"cta_text\": \"전체보기\", \"subtitle\": \"이번 주 새로 입고된 상품들\", \"image_url\": \"\"}',0,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(38,3,'product_carousel','{\"limit\": 10, \"title\": \"이번 주 신상\"}',1,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(39,3,'product_grid','{\"limit\": 16, \"title\": \"전체 신상품\", \"template\": \"4col\"}',2,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(40,4,'hero_banner','{\"title\": \"우리 브랜드 이야기\", \"cta_text\": \"\", \"subtitle\": \"2020년부터 함께해온 패션 쇼핑몰\", \"image_url\": \"\"}',0,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(41,4,'text_content','{\"html\": \"<h2>브랜드 소개</h2><p>저희는 고객의 라이프스타일을 더욱 풍요롭게 만들기 위해 최고의 패션 아이템을 선별하여 제공합니다.</p>\"}',1,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(42,4,'text_content','{\"html\": \"<h3>고객센터</h3><p>운영시간: 평일 09:00 ~ 18:00</p><p>이메일: support@commerce-demo.kr</p><p>전화: 1588-0000</p>\"}',2,1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(44,5,'hero_banner','{\"title\": \"배민 출신 개발자가 설계한, 10년이 지나도 다시 만들 필요 없는 우리 브랜드만의 진짜 자사몰.\", \"cta_link\": \"mailto:rerub0831@gmail.com\", \"cta_text\": \"무료 상담 신청\", \"subtitle\": \"코드도, 디자인도 — 한 사람이 끝까지 책임집니다\", \"highlight\": \"배달의민족 커머스 서버를 만든 기술력에 디자인 전공자의 감각을 더했습니다. 단순히 예쁜 사이트가 아니라, 초당 수천 건의 주문을 견디고 검색 엔진이 좋아하는 고성능 자사몰을 직접 구축해 드립니다.\", \"description\": \"스마트스토어와 카페24, 시작은 쉽지만 매출이 커질수록 한계에 부딪힙니다. 수수료는 계속 나가는데, 우리 고객 데이터는 내 것이 아니고, 디자인은 옆집과 똑같습니다.\"}',0,1,'2026-03-26 12:00:47.000000','2026-03-26 12:00:47.000000'),(45,5,'text_content','{\"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-6\\\">이런 고민, 있으신가요?</h2>\\n  <ul class=\\\"space-y-3 text-lg\\\">\\n    <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-red-500 mt-1\\\">✓</span> 스마트스토어·카페24 수수료가 매출이 늘수록 부담이 됩니다</li>\\n    <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-red-500 mt-1\\\">✓</span> 디자인을 바꾸고 싶은데 템플릿 안에서만 가능합니다</li>\\n    <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-red-500 mt-1\\\">✓</span> 외주를 맡겼더니 완성됐는데 모바일에서 깨집니다</li>\\n    <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-red-500 mt-1\\\">✓</span> 개발자한테 물어봐야 상품 하나 올릴 수 있습니다</li>\\n    <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-red-500 mt-1\\\">✓</span> 처음엔 저렴했는데 기능 추가할 때마다 추가 견적이 붙습니다</li>\\n  </ul>\\n  <p class=\\\"mt-6 text-lg font-medium text-gray-700\\\">자사몰은 이 문제를 구조적으로 해결합니다.<br>브랜드 그대로, 고객 데이터 그대로, 수수료 없이.</p>\\n</section>\\n\", \"items\": [\"스마트스토어·카페24 수수료가 매출이 늘수록 부담이 됩니다\", \"디자인을 바꾸고 싶은데 템플릿 안에서만 가능합니다\", \"외주를 맡겼더니 완성됐는데 모바일에서 깨집니다\", \"개발자한테 물어봐야 상품 하나 올릴 수 있습니다\", \"처음엔 저렴했는데 기능 추가할 때마다 추가 견적이 붙습니다\"], \"title\": \"이런 고민, 있으신가요?\", \"footer\": \"자사몰은 이 문제를 구조적으로 해결합니다. 브랜드 그대로, 고객 데이터 그대로, 수수료 없이.\"}',1,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.489952'),(46,5,'text_content','{\"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-4\\\">결과물</h2>\\n  <p class=\\\"text-lg mb-4\\\">커머스 데모 사이트 — 실제 납품 기준과 동일한 구조입니다.<br>직접 회원가입하고, 상품을 담고, 결제 흐름을 확인해보실 수 있습니다.</p>\\n  <a href=\\\"http://localhost:5173\\\" target=\\\"_blank\\\" rel=\\\"noopener noreferrer\\\" class=\\\"inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors\\\">커머스 데모 사이트 바로보기 →</a>\\n  <p class=\\\"mt-4 text-sm text-gray-500\\\">실제 작업물은 고객 요청사항에 맞춰 UI/UX 디자인이 진행되며 커스텀 기능을 추가하게 됩니다.</p>\\n</section>\\n\", \"note\": \"실제 작업물은 고객 요청사항에 맞춰 UI/UX 디자인이 진행되며 커스텀 기능을 추가하게 됩니다.\", \"title\": \"결과물\", \"link_url\": \"https://commerce-demo.vercel.app\", \"link_text\": \"커머스 데모 사이트 바로보기\", \"description\": \"커머스 데모 사이트 — 실제 납품 기준과 동일한 구조입니다. 직접 회원가입하고, 상품을 담고, 결제 흐름을 확인해보실 수 있습니다.\"}',2,1,'2026-03-26 12:00:47.000000','2026-03-26 12:07:51.383691'),(47,5,'text_content','{\"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-8\\\">뭘 받게 되나요</h2>\\n  <div class=\\\"grid md:grid-cols-2 gap-8 mb-10\\\">\\n    <div class=\\\"bg-gray-50 rounded-xl p-6\\\">\\n      <h3 class=\\\"text-lg font-bold mb-4\\\">고객이 쓰는 화면</h3>\\n      <ul class=\\\"space-y-2 text-gray-700\\\">\\n        <li>• 상품 목록, 상세 페이지 (사진 갤러리, 옵션 선택)</li>\\n        <li>• 장바구니 → 주문 → 결제 → 배송 조회</li>\\n        <li>• 회원가입 / 로그인 (이메일 + 카카오·구글 간편 로그인)</li>\\n        <li>• 마이페이지 (주문 내역, 배송지, 찜 목록, 쿠폰)</li>\\n        <li>• 상품 검색 (자동완성, 필터, 정렬)</li>\\n        <li>• 상품 리뷰, 찜하기, 1:1 문의</li>\\n      </ul>\\n    </div>\\n    <div class=\\\"bg-gray-50 rounded-xl p-6\\\">\\n      <h3 class=\\\"text-lg font-bold mb-4\\\">운영자가 쓰는 관리자 화면</h3>\\n      <ul class=\\\"space-y-2 text-gray-700\\\">\\n        <li>• 상품·카테고리 관리 (등록, 수정, 재고)</li>\\n        <li>• 주문 관리 및 상태 변경</li>\\n        <li>• 배송 처리 (운송장 등록·조회)</li>\\n        <li>• 회원 관리, 쿠폰·프로모션 관리</li>\\n        <li>• 매출·주문·방문자 통계</li>\\n        <li>• <strong>메인 페이지 배너·구성 변경 (코드 없이 직접 수정 가능)</strong></li>\\n      </ul>\\n    </div>\\n  </div>\\n  <h3 class=\\\"text-lg font-bold mb-4\\\">납품 포함 항목</h3>\\n  <div class=\\\"overflow-x-auto\\\">\\n    <table class=\\\"w-full border-collapse text-sm\\\">\\n      <thead><tr class=\\\"bg-gray-100\\\"><th class=\\\"text-left p-3 border border-gray-200\\\">항목</th><th class=\\\"text-left p-3 border border-gray-200\\\">내용</th></tr></thead>\\n      <tbody>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-medium\\\">소스코드</td><td class=\\\"p-3 border border-gray-200\\\">전체 소유권 이전 — 다른 개발자도 이어받을 수 있는 표준 구조</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-medium\\\">서버</td><td class=\\\"p-3 border border-gray-200\\\">클라우드(AWS) 배포 — 24시간 운영</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-medium\\\">관리자 화면</td><td class=\\\"p-3 border border-gray-200\\\">상품·주문·배송·회원·쿠폰·통계·페이지 편집</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-medium\\\">운영 문서</td><td class=\\\"p-3 border border-gray-200\\\">서버 설정, 데이터 구조, API 목록, 보안 가이드 — 어떤 개발자든 바로 이어받을 수 있는 문서</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-medium\\\">SEO 최적화</td><td class=\\\"p-3 border border-gray-200\\\">구글·네이버 검색 노출을 위한 SSR 기본 적용 및 메타 태그 최적화 포함</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-medium\\\">자동화</td><td class=\\\"p-3 border border-gray-200\\\">코드 수정 시 자동 반영, 주요 기능 자동 검증</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-medium\\\">유지보수</td><td class=\\\"p-3 border border-gray-200\\\">납품 후 1개월 무상 대응 (버그·오류) · 이후 월 유지보수 패키지 별도 협의</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-medium\\\">데이터 이전</td><td class=\\\"p-3 border border-gray-200\\\">기존 플랫폼의 회원 및 상품 데이터 이전 지원 (별도 협의)</td></tr>\\n      </tbody>\\n    </table>\\n  </div>\\n</section>\\n\", \"title\": \"뭘 받게 되나요\", \"sections\": [{\"items\": [\"상품 목록, 상세 페이지 (사진 갤러리, 옵션 선택)\", \"장바구니 → 주문 → 결제 → 배송 조회\", \"회원가입 / 로그인 (이메일 + 카카오·구글 간편 로그인)\", \"마이페이지 (주문 내역, 배송지, 찜 목록, 쿠폰)\", \"상품 검색 (자동완성, 필터, 정렬)\", \"상품 리뷰, 찜하기, 1:1 문의\"], \"heading\": \"고객이 쓰는 화면\"}, {\"items\": [\"상품·카테고리 관리 (등록, 수정, 재고)\", \"주문 관리 및 상태 변경\", \"배송 처리 (운송장 등록·조회)\", \"회원 관리, 쿠폰·프로모션 관리\", \"매출·주문·방문자 통계\", \"메인 페이지 배너·구성 변경 (코드 없이 직접 수정 가능)\"], \"heading\": \"운영자가 쓰는 관리자 화면\"}], \"deliverables\": [{\"desc\": \"전체 소유권 이전 — 다른 개발자도 이어받을 수 있는 표준 구조\", \"item\": \"소스코드\"}, {\"desc\": \"클라우드(AWS) 배포 — 24시간 운영\", \"item\": \"서버\"}, {\"desc\": \"상품·주문·배송·회원·쿠폰·통계·페이지 편집\", \"item\": \"관리자 화면\"}, {\"desc\": \"서버 설정, 데이터 구조, API 목록, 보안 가이드 — 어떤 개발자든 바로 이어받을 수 있는 문서\", \"item\": \"운영 문서\"}, {\"desc\": \"구글·네이버 검색 노출을 위한 SSR 기본 적용 및 메타 태그 최적화 포함\", \"item\": \"SEO 최적화\"}, {\"desc\": \"코드 수정 시 자동 반영, 주요 기능 자동 검증\", \"item\": \"자동화\"}, {\"desc\": \"납품 후 1개월 무상 대응 (버그·오류) · 이후 월 유지보수 패키지 별도 협의\", \"item\": \"유지보수\"}, {\"desc\": \"기존 플랫폼의 회원 및 상품 데이터 이전 지원 (별도 협의)\", \"item\": \"데이터 이전\"}]}',3,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.511775'),(48,5,'text_content','{\"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-4\\\">예상 비용·기간</h2>\\n  <p class=\\\"text-gray-700 mb-6\\\">대부분의 외주 개발사는 쇼핑몰 하나에 2~4개월을 잡습니다. 이미 검증된 보일러플레이트(기반 코드) 위에서 시작하기 때문에, <strong>기본~표준형 기준 4주 내 오픈</strong>이 가능합니다.</p>\\n  <div class=\\\"overflow-x-auto mb-6\\\">\\n    <table class=\\\"w-full border-collapse text-sm\\\">\\n      <thead><tr class=\\\"bg-gray-100\\\"><th class=\\\"text-left p-3 border border-gray-200\\\">규모</th><th class=\\\"text-left p-3 border border-gray-200\\\">주요 기능</th><th class=\\\"text-left p-3 border border-gray-200\\\">예상 기간</th></tr></thead>\\n      <tbody>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-medium\\\">기본형</td><td class=\\\"p-3 border border-gray-200\\\">상품·장바구니·결제·회원·관리자</td><td class=\\\"p-3 border border-gray-200 font-bold\\\">2~3주</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-medium\\\">표준형</td><td class=\\\"p-3 border border-gray-200\\\">기본형 + 검색·쿠폰·리뷰·배송 추적</td><td class=\\\"p-3 border border-gray-200 font-bold\\\">3~4주</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-medium\\\">확장형</td><td class=\\\"p-3 border border-gray-200\\\">표준형 + 통계·CMS·맞춤 기능</td><td class=\\\"p-3 border border-gray-200 font-bold\\\">4~6주</td></tr>\\n      </tbody>\\n    </table>\\n  </div>\\n  <blockquote class=\\\"border-l-4 border-gray-300 pl-4 text-gray-600 mb-4\\\">빠른 납기가 가능한 이유: 쇼핑몰에 필요한 핵심 구조가 이미 구축되어 있습니다. 처음부터 만드는 것이 아니라, 검증된 기반 위에서 브랜드에 맞게 커스터마이징합니다.</blockquote>\\n  <p class=\\\"font-medium mb-2\\\">서버 운영 비용 (납품 후 월 고정): 약 5~10만원 (AWS 기준)</p>\\n  <p class=\\\"text-sm text-gray-500\\\">정확한 견적은 요구사항 확인 후 1~2일 내 제공합니다. 상담은 무료입니다.</p>\\n</section>\\n\", \"note\": \"빠른 납기가 가능한 이유: 쇼핑몰에 필요한 핵심 구조가 이미 구축되어 있습니다. 처음부터 만드는 것이 아니라, 검증된 기반 위에서 브랜드에 맞게 커스터마이징합니다.\", \"tiers\": [{\"name\": \"기본형\", \"duration\": \"2~3주\", \"features\": \"상품·장바구니·결제·회원·관리자\"}, {\"name\": \"표준형\", \"duration\": \"3~4주\", \"features\": \"기본형 + 검색·쿠폰·리뷰·배송 추적\"}, {\"name\": \"확장형\", \"duration\": \"4~6주\", \"features\": \"표준형 + 통계·CMS·맞춤 기능\"}], \"title\": \"예상 비용·기간\", \"description\": \"대부분의 외주 개발사는 쇼핑몰 하나에 2~4개월을 잡습니다. 이미 검증된 보일러플레이트(기반 코드) 위에서 시작하기 때문에, 기본~표준형 기준 4주 내 오픈이 가능합니다.\", \"server_cost\": \"서버 운영 비용 (납품 후 월 고정): 약 5~10만원 (AWS 기준)\", \"estimate_note\": \"정확한 견적은 요구사항 확인 후 1~2일 내 제공합니다. 상담은 무료입니다.\"}',4,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.525849'),(49,5,'text_content','{\"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-8\\\">진행 프로세스</h2>\\n  <div class=\\\"space-y-4\\\">\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">1</div><div><p class=\\\"font-bold\\\">무료 상담 (30분)</p><p class=\\\"text-gray-600\\\">요구사항 파악, 견적 범위 안내</p></div></div>\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">2</div><div><p class=\\\"font-bold\\\">견적·계약</p><p class=\\\"text-gray-600\\\">기능 범위 확정, 일정·비용 합의</p></div></div>\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">3</div><div><p class=\\\"font-bold\\\">기획·디자인 확인</p><p class=\\\"text-gray-600\\\">화면 구성안 공유 → 피드백 반영</p></div></div>\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">4</div><div><p class=\\\"font-bold\\\">개발 (중간 보고)</p><p class=\\\"text-gray-600\\\">주 1회 진행 상황 공유, 단계별 확인</p></div></div>\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">5</div><div><p class=\\\"font-bold\\\">테스트·수정</p><p class=\\\"text-gray-600\\\">실제 사용 시나리오 기반 검증</p></div></div>\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">6</div><div><p class=\\\"font-bold\\\">오픈·인수인계</p><p class=\\\"text-gray-600\\\">서버 이전, 운영 방법 안내</p></div></div>\\n    <div class=\\\"flex gap-4 items-start\\\"><div class=\\\"w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0\\\">7</div><div><p class=\\\"font-bold\\\">납품 후 1개월</p><p class=\\\"text-gray-600\\\">버그·오류 무상 대응</p></div></div>\\n  </div>\\n</section>\\n\", \"steps\": [{\"desc\": \"요구사항 파악, 견적 범위 안내\", \"step\": \"1\", \"title\": \"무료 상담 (30분)\"}, {\"desc\": \"기능 범위 확정, 일정·비용 합의\", \"step\": \"2\", \"title\": \"견적·계약\"}, {\"desc\": \"화면 구성안 공유 → 피드백 반영\", \"step\": \"3\", \"title\": \"기획·디자인 확인\"}, {\"desc\": \"주 1회 진행 상황 공유, 단계별 확인\", \"step\": \"4\", \"title\": \"개발 (중간 보고)\"}, {\"desc\": \"실제 사용 시나리오 기반 검증\", \"step\": \"5\", \"title\": \"테스트·수정\"}, {\"desc\": \"서버 이전, 운영 방법 안내\", \"step\": \"6\", \"title\": \"오픈·인수인계\"}, {\"desc\": \"버그·오류 무상 대응\", \"step\": \"7\", \"title\": \"납품 후 1개월\"}], \"title\": \"진행 프로세스\"}',5,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.528323'),(50,5,'text_content','{\"blog\": \"https://velog.io/@rerub0831/posts\", \"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-6\\\">이력</h2>\\n  <div class=\\\"mb-6\\\">\\n    <p class=\\\"text-xl font-bold\\\">박지우</p>\\n    <p class=\\\"text-gray-600 mb-2\\\">백엔드 개발자 + 디자이너</p>\\n    <p class=\\\"text-sm text-gray-500\\\">rerub0831@gmail.com · <a href=\\\"https://github.com/FLYLIKEB/\\\" target=\\\"_blank\\\" class=\\\"underline\\\">GitHub</a> · <a href=\\\"https://velog.io/@rerub0831/posts\\\" target=\\\"_blank\\\" class=\\\"underline\\\">Blog</a></p>\\n  </div>\\n  <p class=\\\"text-gray-700 mb-6\\\">연세대학교에서 컴퓨터공학과 <strong>통합디자인학과를 함께 전공</strong>했습니다. 개발자이면서 디자인을 직접 할 수 있어, 개발자-디자이너 사이에서 번역이 필요 없습니다. 화면 구성부터 사용자 흐름, 시각적 완성도까지 한 사람이 일관되게 책임집니다.</p>\\n  <div class=\\\"bg-gray-50 rounded-xl p-6 mb-6\\\">\\n    <p class=\\\"font-bold text-lg mb-1\\\">우아한형제들 (배달의 민족)</p>\\n    <p class=\\\"text-gray-500 text-sm mb-4\\\">서버 개발자 · 2023.01 – 2024.11</p>\\n    <p class=\\\"text-gray-700 mb-3\\\">배달의민족 B마트 커머스 도메인에서 실서비스를 운영했습니다.</p>\\n    <ul class=\\\"space-y-2 text-gray-700\\\">\\n      <li>• <strong>상품 페이지 로딩 속도 50배 단축</strong>: 느린 사이트에서 고객 53%가 이탈합니다. 실제 서비스에서 이 문제를 직접 해결한 경험이 있습니다</li>\\n      <li>• <strong>장애 탐지 시간 67% 단축</strong>: 문제가 생겼을 때 빠르게 찾아 고칩니다</li>\\n      <li>• <strong>100만 건 알림 시스템 설계 경험</strong> → 이벤트 날 트래픽이 폭주해도 결제가 끊기지 않는 단단한 서버를 만듭니다</li>\\n      <li>• <strong>대규모 데이터 이전 경험</strong>: 기존 시스템을 끊김 없이 새 구조로 옮겼습니다</li>\\n    </ul>\\n    <p class=\\\"mt-3 text-sm\\\"><a href=\\\"https://techblog.woowahan.com/13429\\\" target=\\\"_blank\\\" class=\\\"underline text-gray-500\\\">우아한형제들 공식 기술블로그 포스팅 →</a></p>\\n  </div>\\n  <p class=\\\"text-sm text-gray-500\\\">연세대학교 · 우아한테크코스 4기</p>\\n  <p class=\\\"mt-4 text-gray-700 font-medium\\\">단순히 돌아가는 코드가 아니라, 나중에 사업이 커져도 새로 만들 필요 없는 구조로 납품합니다.</p>\\n</section>\\n\", \"misc\": [\"우아한테크코스 4기\"], \"name\": \"박지우\", \"role\": \"백엔드 개발자 + 디자이너\", \"email\": \"rerub0831@gmail.com\", \"title\": \"이력\", \"career\": [{\"desc\": \"배달의민족 B마트 커머스 도메인에서 실서비스 운영\", \"role\": \"서버 개발자\", \"period\": \"2023.01 – 2024.11\", \"company\": \"우아한형제들 (배달의 민족)\", \"techblog\": \"https://techblog.woowahan.com/13429\", \"achievements\": [\"상품 페이지 로딩 속도 50배 단축: 느린 사이트에서 고객 53%가 이탈합니다. 실제 서비스에서 이 문제를 직접 해결한 경험이 있습니다\", \"장애 탐지 시간 67% 단축: 문제가 생겼을 때 빠르게 찾아 고칩니다\", \"100만 건 알림 시스템 설계 경험 → 이벤트 날 트래픽이 폭주해도 결제가 끊기지 않는 단단한 서버를 만듭니다\", \"대규모 데이터 이전 경험: 기존 시스템을 끊김 없이 새 구조로 옮겼습니다\"]}], \"github\": \"https://github.com/FLYLIKEB/\", \"closing\": \"단순히 돌아가는 코드가 아니라, 나중에 사업이 커져도 새로 만들 필요 없는 구조로 납품합니다.\", \"education\": \"연세대학교 컴퓨터공학과 + 통합디자인학과 복수전공\", \"education_note\": \"개발자이면서 디자인을 직접 할 수 있어, 개발자-디자이너 사이에서 번역이 필요 없습니다. 화면 구성부터 사용자 흐름, 시각적 완성도까지 한 사람이 일관되게 책임집니다.\"}',6,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.529999'),(51,5,'text_content','{\"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-8\\\">다른 방식과 비교</h2>\\n  <h3 class=\\\"text-xl font-bold mb-4\\\">임대몰 (카페24, 아임웹, Shopify 등)</h3>\\n  <div class=\\\"overflow-x-auto mb-6\\\">\\n    <table class=\\\"w-full border-collapse text-sm\\\">\\n      <thead><tr class=\\\"bg-gray-100\\\"><th class=\\\"text-left p-3 border border-gray-200\\\">항목</th><th class=\\\"text-left p-3 border border-gray-200\\\">임대몰</th><th class=\\\"text-left p-3 border border-gray-200\\\">자체 개발 자사몰</th></tr></thead>\\n      <tbody>\\n        <tr><td class=\\\"p-3 border border-gray-200\\\">초기 비용</td><td class=\\\"p-3 border border-gray-200\\\">낮음 (0~20만원)</td><td class=\\\"p-3 border border-gray-200\\\">개발비 (별도 협의)</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200\\\">월 이용료</td><td class=\\\"p-3 border border-gray-200\\\">2~15만원/월</td><td class=\\\"p-3 border border-gray-200\\\">없음</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200\\\">결제 수수료</td><td class=\\\"p-3 border border-gray-200\\\">거래액의 2~3.5%</td><td class=\\\"p-3 border border-gray-200\\\">거래액의 1.5~2.5% (직접 계약)</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-bold\\\">소유권</td><td class=\\\"p-3 border border-gray-200\\\">플랫폼에 귀속 (이사 불가)</td><td class=\\\"p-3 border border-gray-200 font-bold\\\">소스코드·DB 전체 소유</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200\\\">디자인 자유도</td><td class=\\\"p-3 border border-gray-200\\\">템플릿 범위 내</td><td class=\\\"p-3 border border-gray-200\\\">제한 없음</td></tr>\\n        <tr class=\\\"bg-gray-50\\\"><td class=\\\"p-3 border border-gray-200 font-bold\\\">고객 데이터</td><td class=\\\"p-3 border border-gray-200\\\">플랫폼 소유, 활용 제한</td><td class=\\\"p-3 border border-gray-200 font-bold\\\">직접 소유·100% 활용</td></tr>\\n        <tr><td class=\\\"p-3 border border-gray-200 font-bold\\\">검색 노출(SEO)</td><td class=\\\"p-3 border border-gray-200\\\">플랫폼 구조에 종속</td><td class=\\\"p-3 border border-gray-200 font-bold\\\">SSR + 메타 태그 최적화 기본 적용</td></tr>\\n      </tbody>\\n    </table>\\n  </div>\\n  <div class=\\\"bg-gray-50 rounded-xl p-6 mb-8\\\">\\n    <p class=\\\"font-bold mb-3\\\">비용 시뮬레이션 (월 거래액 1,000만원 기준)</p>\\n    <table class=\\\"w-full border-collapse text-sm\\\">\\n      <thead><tr class=\\\"bg-white\\\"><th class=\\\"text-left p-2 border border-gray-200\\\">구분</th><th class=\\\"text-left p-2 border border-gray-200\\\">임대몰</th><th class=\\\"text-left p-2 border border-gray-200\\\">자사몰</th></tr></thead>\\n      <tbody>\\n        <tr><td class=\\\"p-2 border border-gray-200\\\">플랫폼·서버 비용</td><td class=\\\"p-2 border border-gray-200\\\">약 5만원</td><td class=\\\"p-2 border border-gray-200\\\">약 7만원</td></tr>\\n        <tr class=\\\"bg-white\\\"><td class=\\\"p-2 border border-gray-200\\\">결제 수수료</td><td class=\\\"p-2 border border-gray-200\\\">약 25만원</td><td class=\\\"p-2 border border-gray-200\\\">약 20만원</td></tr>\\n        <tr><td class=\\\"p-2 border border-gray-200 font-bold\\\">월 합계</td><td class=\\\"p-2 border border-gray-200 font-bold\\\">약 30만원</td><td class=\\\"p-2 border border-gray-200 font-bold\\\">약 27만원</td></tr>\\n        <tr class=\\\"bg-white\\\"><td class=\\\"p-2 border border-gray-200\\\">연간 합계</td><td class=\\\"p-2 border border-gray-200\\\">약 360만원</td><td class=\\\"p-2 border border-gray-200\\\">약 324만원</td></tr>\\n      </tbody>\\n    </table>\\n    <p class=\\\"text-sm text-gray-600 mt-3\\\">월 거래액 3,000만원이면 수수료 차이만 연간 약 180만원 절감됩니다. 개발 비용은 보통 1~2년 내 회수됩니다.</p>\\n  </div>\\n  <h3 class=\\\"text-xl font-bold mb-4\\\">바이브코딩 외주 (AI + 간단한 조합 방식)</h3>\\n  <p class=\\\"text-gray-700 mb-4\\\">최근 AI 도구로 빠르게 화면을 만들고 별도 서버 없이 배포하는 방식이 늘고 있습니다. 크몽·숨고의 저가 포트폴리오 뒤에 이 방식이 숨어 있는 경우가 많습니다.</p>\\n  <ul class=\\\"space-y-2 text-gray-700 mb-4\\\">\\n    <li>• 주문 관리, 결제 연동, 배송 추적, 쿠폰, 관리자 화면이 기본 제공되지 않습니다</li>\\n    <li>• 이벤트·할인 기간에 트래픽이 몰리면 서버가 타임아웃을 내며 주문이 유실됩니다</li>\\n    <li>• AI 생성 코드에서 보안 설정 오류로 개인정보가 노출될 수 있습니다</li>\\n    <li>• 기능 하나를 고치면 다른 곳이 망가지고, 납품 후 이어받기도 어렵습니다</li>\\n  </ul>\\n  <blockquote class=\\\"border-l-4 border-gray-300 pl-4 text-gray-600 mb-6\\\">저렴하게 빠르게 만든 쇼핑몰이 1~2년 뒤 전면 재개발로 이어지는 가장 흔한 경로입니다.</blockquote>\\n  <h3 class=\\\"text-xl font-bold mb-4\\\">기존 크몽·숨고 외주 개발의 공통 문제</h3>\\n  <ul class=\\\"space-y-2 text-gray-700\\\">\\n    <li>• <strong>모바일 미확인 납품</strong>: 실제 쇼핑의 70% 이상은 모바일에서 일어납니다</li>\\n    <li>• <strong>성능 고려 없음</strong>: 상품이 수백 개를 넘으면 목록이 버벅거립니다</li>\\n    <li>• <strong>납품 후 \\\"건드리기 어렵다\\\"</strong>: 구조가 잘못 설계된 코드는 기능 하나를 고칠 때 다른 곳이 망가집니다</li>\\n    <li>• <strong>보안 기초 없음</strong>: 관리자 페이지에 URL만 알면 접근되는 경우가 드물지 않습니다</li>\\n    <li>• <strong>부족한 UI/UX 고려</strong>: 사용자 편의를 고려하지 않는 디자인으로 고객 이탈 가속화</li>\\n  </ul>\\n</section>\\n\", \"title\": \"다른 방식과 비교\", \"sections\": [{\"heading\": \"임대몰 (카페24, 아임웹, Shopify 등)\", \"limitations\": [\"수천 개 쇼핑몰이 같은 템플릿을 씁니다. 브랜드 고유의 인상을 주기 어렵습니다.\", \"여러 쇼핑몰이 서버를 함께 씁니다. 다른 쇼핑몰에 트래픽이 몰리면 내 쇼핑몰도 느려집니다.\", \"모바일 화면이 PC 화면을 단순 축소한 수준이라 구매 흐름이 불편합니다.\", \"기능 추가는 유료 플러그인에 의존하며, 플랫폼 업데이트 시 직접 수정한 내용이 초기화될 수 있습니다.\"], \"cost_simulation\": {\"note\": \"월 거래액 3,000만원이면 수수료 차이만 연간 약 180만원 절감됩니다. 개발 비용은 보통 1~2년 내 회수됩니다.\", \"rows\": [{\"구분\": \"플랫폼·서버 비용\", \"임대몰\": \"약 5만원\", \"자사몰\": \"약 7만원\"}, {\"구분\": \"결제 수수료\", \"임대몰\": \"약 25만원\", \"자사몰\": \"약 20만원\"}, {\"구분\": \"월 합계\", \"임대몰\": \"약 30만원\", \"자사몰\": \"약 27만원\"}, {\"구분\": \"연간 합계\", \"임대몰\": \"약 360만원\", \"자사몰\": \"약 324만원\"}], \"title\": \"비용 시뮬레이션 (월 거래액 1,000만원 기준)\"}, \"comparison_table\": [{\"항목\": \"초기 비용\", \"임대몰\": \"낮음 (0~20만원)\", \"자사몰\": \"개발비 (별도 협의)\"}, {\"항목\": \"월 이용료\", \"임대몰\": \"2~15만원/월\", \"자사몰\": \"없음\"}, {\"항목\": \"결제 수수료\", \"임대몰\": \"거래액의 2~3.5%\", \"자사몰\": \"거래액의 1.5~2.5% (직접 계약)\"}, {\"항목\": \"소유권\", \"임대몰\": \"플랫폼에 귀속 (이사 불가)\", \"자사몰\": \"소스코드·DB 전체 소유\"}, {\"항목\": \"디자인 자유도\", \"임대몰\": \"템플릿 범위 내\", \"자사몰\": \"제한 없음\"}, {\"항목\": \"고객 데이터\", \"임대몰\": \"플랫폼 소유, 활용 제한\", \"자사몰\": \"직접 소유·100% 활용\"}, {\"항목\": \"검색 노출(SEO)\", \"임대몰\": \"플랫폼 구조에 종속\", \"자사몰\": \"SSR + 메타 태그 최적화 기본 적용\"}]}, {\"note\": \"저렴하게 빠르게 만든 쇼핑몰이 1~2년 뒤 전면 재개발로 이어지는 가장 흔한 경로입니다.\", \"issues\": [\"주문 관리, 결제 연동, 배송 추적, 쿠폰, 관리자 화면이 기본 제공되지 않아 만들지 않으면 없는 기능입니다\", \"이벤트·할인 기간에 트래픽이 몰리면 서버가 타임아웃을 내며 주문이 유실됩니다.\", \"다른 회원의 주문 정보·개인정보가 외부에 노출될 수 있는 보안 설정 오류가 AI 생성 코드에서 자주 발견됩니다.\", \"기능 하나를 고치면 다른 곳이 망가지고, 납품 후 다른 개발자에게 이어 맡기기도 어렵습니다.\"], \"closing\": \"AI로 뚝딱 만든 코드는 당장 돌아가지만, 나중에 기능을 하나 고칠 때 전체가 무너질 수 있습니다. 저는 확장이 쉬운 표준 코드로 납품하여 유지보수 비용을 장기적으로 줄여드립니다.\", \"heading\": \"바이브코딩 외주 (AI + 간단한 조합 방식)\", \"description\": \"최근 AI 도구로 빠르게 화면을 만들고 별도 서버 없이 배포하는 방식이 늘고 있습니다. 크몽·숨고의 저가 포트폴리오 뒤에 이 방식이 숨어 있는 경우가 많습니다.\"}, {\"note\": \"포트폴리오 디자인이 좋아 보여도, 구조와 성능은 직접 써봐야 드러납니다.\", \"issues\": [\"모바일 미확인 납품: 실제 쇼핑의 70% 이상은 모바일에서 일어납니다. 데스크톱에서만 확인하고 납품하는 경우가 많습니다.\", \"성능 고려 없음: 상품이 수백 개를 넘으면 목록이 버벅거립니다. 재고를 동시에 주문하면 오버셀이 발생합니다.\", \"납품 후 건드리기 어렵다: 구조가 잘못 설계된 코드는 기능 하나를 고칠 때 다른 곳이 같이 망가집니다.\", \"보안 기초 없음: 관리자 페이지에 URL만 알면 접근되거나, 비밀번호가 그대로 저장된 경우가 드물지 않습니다.\", \"부족한 UI/UX 고려: 사용자 편의를 고려하지 않는 디자인으로 고객 이탈 가속화를 야기합니다.\"], \"heading\": \"기존 크몽·숨고 외주 개발의 공통 문제\"}]}',7,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.531983'),(52,5,'text_content','{\"faqs\": [{\"a\": \"주 1회 진행 상황을 공유합니다. 단계별 확인 후 다음 단계로 넘어가며, 중간 산출물을 기준으로 계약 구조를 잡습니다. 모든 서버 설정과 코드는 문서화하여 납품하기 때문에, 저와의 계약이 종료된 이후에도 실력 있는 개발자라면 누구나 바로 이어받아 운영할 수 있는 구조입니다.\", \"q\": \"중간에 연락이 안 되면 어쩌죠?\"}, {\"a\": \"기획·디자인 확인 단계에서 화면 구성안을 먼저 공유하고 피드백을 반영한 뒤 개발에 들어갑니다. 개발 완료 후 수정 범위는 계약 시 명시합니다.\", \"q\": \"완성됐는데 마음에 안 들면요?\"}, {\"a\": \"납품 후 1개월은 버그·오류를 무상으로 대응합니다. 이후 유지보수는 별도 협의로 진행합니다.\", \"q\": \"오픈 후 버그가 나면요?\"}, {\"a\": \"초기 계약 범위를 명확히 정해 추가 견적이 불필요하게 붙는 상황을 방지합니다. 이후 기능 추가는 단위 기능 기준으로 협의합니다.\", \"q\": \"추가 기능이 생기면 비용이 계속 붙나요?\"}, {\"a\": \"업계 표준 기술로 만들기 때문에 어떤 웹 개발자도 코드를 보고 이어받을 수 있습니다. 운영 문서도 함께 납품합니다.\", \"q\": \"나중에 다른 개발자에게 맡길 수 있나요?\"}, {\"a\": \"처음부터 교체를 고려해 설계합니다. 결제사·택배사·이미지 저장소 변경 시 전면 재개발 없이 대응 가능합니다.\", \"q\": \"결제, 택배사를 나중에 바꾸고 싶으면요?\"}], \"html\": \"\\n<section class=\\\"py-8\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-8\\\">자주 묻는 질문</h2>\\n  <div class=\\\"space-y-6\\\">\\n    <div class=\\\"border-b border-gray-200 pb-6\\\">\\n      <p class=\\\"font-bold text-lg mb-2\\\">중간에 연락이 안 되면 어쩌죠?</p>\\n      <p class=\\\"text-gray-700\\\">주 1회 진행 상황을 공유합니다. 단계별 확인 후 다음 단계로 넘어가며, 중간 산출물을 기준으로 계약 구조를 잡습니다. 모든 서버 설정과 코드는 문서화하여 납품하기 때문에, 실력 있는 개발자라면 누구나 바로 이어받아 운영할 수 있는 구조입니다.</p>\\n    </div>\\n    <div class=\\\"border-b border-gray-200 pb-6\\\">\\n      <p class=\\\"font-bold text-lg mb-2\\\">완성됐는데 마음에 안 들면요?</p>\\n      <p class=\\\"text-gray-700\\\">기획·디자인 확인 단계에서 화면 구성안을 먼저 공유하고 피드백을 반영한 뒤 개발에 들어갑니다. 개발 완료 후 수정 범위는 계약 시 명시합니다.</p>\\n    </div>\\n    <div class=\\\"border-b border-gray-200 pb-6\\\">\\n      <p class=\\\"font-bold text-lg mb-2\\\">오픈 후 버그가 나면요?</p>\\n      <p class=\\\"text-gray-700\\\">납품 후 1개월은 버그·오류를 무상으로 대응합니다. 이후 유지보수는 별도 협의로 진행합니다.</p>\\n    </div>\\n    <div class=\\\"border-b border-gray-200 pb-6\\\">\\n      <p class=\\\"font-bold text-lg mb-2\\\">추가 기능이 생기면 비용이 계속 붙나요?</p>\\n      <p class=\\\"text-gray-700\\\">초기 계약 범위를 명확히 정해 추가 견적이 불필요하게 붙는 상황을 방지합니다. 이후 기능 추가는 단위 기능 기준으로 협의합니다.</p>\\n    </div>\\n    <div class=\\\"border-b border-gray-200 pb-6\\\">\\n      <p class=\\\"font-bold text-lg mb-2\\\">나중에 다른 개발자에게 맡길 수 있나요?</p>\\n      <p class=\\\"text-gray-700\\\">업계 표준 기술로 만들기 때문에 어떤 웹 개발자도 코드를 보고 이어받을 수 있습니다. 운영 문서도 함께 납품합니다.</p>\\n    </div>\\n    <div class=\\\"border-b border-gray-200 pb-6\\\">\\n      <p class=\\\"font-bold text-lg mb-2\\\">결제, 택배사를 나중에 바꾸고 싶으면요?</p>\\n      <p class=\\\"text-gray-700\\\">처음부터 교체를 고려해 설계합니다. 결제사·택배사·이미지 저장소 변경 시 전면 재개발 없이 대응 가능합니다.</p>\\n    </div>\\n  </div>\\n</section>\\n\", \"title\": \"자주 묻는 질문\"}',8,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.537428'),(53,5,'text_content','{\"fit\": [\"플랫폼 수수료 없이 직접 판매 채널을 갖고 싶은 브랜드\", \"스마트스토어에서 자사몰로 이전을 고려 중인 곳\", \"고객 데이터를 직접 쌓고 활용하고 싶은 곳\", \"초기 개발 비용보다 장기 운영 비용이 더 중요한 곳\"], \"html\": \"\\n<section class=\\\"py-8\\\">\\n  <div class=\\\"grid md:grid-cols-2 gap-8\\\">\\n    <div class=\\\"bg-green-50 rounded-xl p-6\\\">\\n      <h2 class=\\\"text-xl font-bold mb-4 text-green-800\\\">이런 분께 맞습니다</h2>\\n      <ul class=\\\"space-y-3 text-gray-700\\\">\\n        <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-green-600 mt-1\\\">✓</span> 플랫폼 수수료 없이 직접 판매 채널을 갖고 싶은 브랜드</li>\\n        <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-green-600 mt-1\\\">✓</span> 스마트스토어에서 자사몰로 이전을 고려 중인 곳</li>\\n        <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-green-600 mt-1\\\">✓</span> 고객 데이터를 직접 쌓고 활용하고 싶은 곳</li>\\n        <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-green-600 mt-1\\\">✓</span> 초기 개발 비용보다 장기 운영 비용이 더 중요한 곳</li>\\n      </ul>\\n    </div>\\n    <div class=\\\"bg-gray-50 rounded-xl p-6\\\">\\n      <h2 class=\\\"text-xl font-bold mb-4 text-gray-700\\\">이런 분께는 맞지 않습니다</h2>\\n      <ul class=\\\"space-y-3 text-gray-600\\\">\\n        <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-gray-400 mt-1\\\">✕</span> 이번 주 오픈이 필요한 경우 (카페24나 스마트스토어가 더 빠릅니다)</li>\\n        <li class=\\\"flex items-start gap-2\\\"><span class=\\\"text-gray-400 mt-1\\\">✕</span> 월 거래액이 매우 낮아 개발 비용 회수가 어려운 초기 단계</li>\\n      </ul>\\n    </div>\\n  </div>\\n</section>\\n\", \"title\": \"이런 분께 맞습니다\", \"not_fit\": [\"이번 주 오픈이 필요한 경우 (카페24나 스마트스토어가 더 빠릅니다)\", \"월 거래액이 매우 낮아 개발 비용 회수가 어려운 초기 단계\"]}',9,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.539750'),(54,5,'text_content','{\"html\": \"\\n<section class=\\\"py-12 text-center\\\">\\n  <h2 class=\\\"text-2xl font-bold mb-4\\\">문의</h2>\\n  <p class=\\\"text-gray-700 mb-6\\\">상담은 무료입니다. 사업 종류와 원하는 기능을 간략히 알려주시면 1~2일 내 견적 범위를 안내드립니다.</p>\\n  <a href=\\\"mailto:rerub0831@gmail.com\\\" class=\\\"inline-block bg-black text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors\\\">이메일로 문의하기 →</a>\\n  <p class=\\\"mt-4 text-sm text-gray-500\\\">rerub0831@gmail.com · 요구사항을 들은 후 범위와 일정을 협의합니다.</p>\\n</section>\\n\", \"note\": \"요구사항을 들은 후 범위와 일정을 협의합니다.\", \"email\": \"rerub0831@gmail.com\", \"title\": \"문의\", \"cta_link\": \"mailto:rerub0831@gmail.com\", \"cta_text\": \"이메일로 문의하기\", \"description\": \"상담은 무료입니다. 사업 종류와 원하는 기능을 간략히 알려주시면 1~2일 내 견적 범위를 안내드립니다.\"}',10,1,'2026-03-26 12:00:47.000000','2026-03-26 12:06:25.541795');
/*!40000 ALTER TABLE `page_blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default',
  `is_published` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_pages_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pages`
--

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES (1,'home','홈 메인 페이지','default',1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(2,'summer-sale','여름 세일 기획전','default',1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(3,'new-arrivals','신상품 모아보기','default',0,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(4,'about','브랜드 소개','default',1,'2026-03-26 11:25:20.000000','2026-03-26 11:25:20.000000'),(5,'marketing','배민 출신 개발자가 설계한, 10년이 지나도 다시 만들 필요 없는 자사몰','default',1,'2026-03-26 12:00:47.000000','2026-03-26 12:00:47.000000');
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `payment_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` enum('card','bank_transfer','virtual_account','phone','mock') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mock',
  `amount` decimal(12,2) NOT NULL,
  `status` enum('pending','confirmed','cancelled','partial_cancelled','refunded','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `gateway` enum('mock','toss','inicis') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mock',
  `paid_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_response` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_b2f7b823a21562eeca20e72b00` (`order_id`),
  UNIQUE KEY `IDX_65cfdd66e9b0ac854c99edcb5a` (`payment_key`),
  KEY `IDX_32b41cdb985a296213e9a928b5` (`status`),
  CONSTRAINT `FK_b2f7b823a21562eeca20e72b006` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `point_history`
--

DROP TABLE IF EXISTS `point_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `point_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `type` enum('earn','spend','expire','admin_adjust') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `balance` int NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_point_history_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `point_history`
--

LOCK TABLES `point_history` WRITE;
/*!40000 ALTER TABLE `point_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `point_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alt` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_thumbnail` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_4f166bb8c2bfcef2498d97b4068` (`product_id`),
  CONSTRAINT `FK_4f166bb8c2bfcef2498d97b4068` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (1,1,'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800','옥화당 주니 서시호 정면',0,1),(2,1,'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800','주니 서시호 측면',1,0),(3,1,'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800','주니 서시호 뚜껑 상세',2,0),(4,2,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','주니 주형호',0,1),(5,3,'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800','주니 석표호',0,1),(6,4,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800','자사 편평호',0,1),(7,5,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800','자사 서시호',0,1),(8,6,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800','자사 주형호',0,1),(9,7,'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800','단니 석표호',0,1),(10,8,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800','단니 편평호',0,1),(11,9,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','흑니 주형호',0,1),(12,10,'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800','청회니 서시호',0,1),(13,11,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','반장 고수 생병',0,1),(14,11,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','반장 생병 포장지 상세',1,0),(15,12,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','빙도 고수 생병',0,1),(16,13,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','대익 7572 숙병',0,1),(17,14,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','하관 FT 숙타',0,1),(18,15,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','홍인 노차 소분',0,1),(19,16,'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800','경덕진 청화 다완 6P',0,1),(20,17,'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800','건수요 천목유 다완',0,1),(21,18,'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800','대나무 다반',0,1),(22,19,'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800','옥화당 입문 다도구 세트',0,1),(23,19,'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800','세트 구성품 전체',1,0),(24,20,'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800','대나무 차도구 5종',0,1),(25,21,'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800','유리 공도배',0,1),(26,22,'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800','여요 빙렬유 다완',0,1);
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_options`
--

DROP TABLE IF EXISTS `product_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_options` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` int NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_49677f87ad61a8b2a31f33c8a2c` (`product_id`),
  CONSTRAINT `FK_49677f87ad61a8b2a31f33c8a2c` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_options`
--

LOCK TABLES `product_options` WRITE;
/*!40000 ALTER TABLE `product_options` DISABLE KEYS */;
INSERT INTO `product_options` VALUES (1,1,'포장','일반 포장',0.00,3,0),(2,1,'포장','전통 목함 선물포장',30000.00,2,1),(3,4,'포장','일반 포장',0.00,5,0),(4,4,'포장','전통 목함 선물포장',30000.00,3,1),(5,11,'보관','기본 포장',0.00,15,0),(6,11,'보관','전통 죽지 보관함 포함',15000.00,5,1),(7,12,'보관','기본 포장',0.00,8,0),(8,12,'보관','전통 죽지 보관함 포함',15000.00,2,1),(9,19,'자사호 니로','자사 (기본)',0.00,4,0),(10,19,'자사호 니로','단니 (+20,000)',20000.00,2,1),(11,19,'자사호 니로','주니 (+50,000)',50000.00,1,2);
/*!40000 ALTER TABLE `product_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category_id` bigint DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `short_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `sale_price` decimal(12,2) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','active','soldout','hidden') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `is_featured` tinyint NOT NULL DEFAULT '0',
  `view_count` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_464f927ae360106b783ed0b410` (`slug`),
  UNIQUE KEY `IDX_c44ac33a05b144dd0d9ddcf932` (`sku`),
  KEY `IDX_3db55e142a0d99d53e7e2ba207` (`is_featured`),
  KEY `IDX_1846199852a695713b1f8f5e9a` (`status`),
  KEY `IDX_9a5f6868c96e0069e699f33e12` (`category_id`),
  KEY `IDX_products_category_id` (`category_id`),
  KEY `IDX_products_status` (`status`),
  KEY `IDX_products_created_at` (`created_at`),
  FULLTEXT KEY `IDX_product_name_fulltext` (`name`) /*!50100 WITH PARSER `ngram` */ ,
  CONSTRAINT `FK_9a5f6868c96e0069e699f33e124` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,10,'옥화당 주니 서시호 120ml','zhuní-xishi-120','복건성 주니(朱泥) 원료로 제작한 서시형 자사호입니다. 주니 특유의 선홍빛 발색과 높은 수축률이 만들어내는 정교한 라인이 특징입니다. 용량 120ml로 공부차(功夫茶) 독음에 최적화되어 있으며, 우린 횟수가 늘수록 자연스러운 광택이 살아납니다.','복건 주니 · 서시형 · 120ml · 공부차 전용',580000.00,NULL,3,'OHD-ZX-001','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(2,10,'옥화당 주니 주형호 80ml','zhuní-zhu-80','작은 공으로 빚은 듯한 주형(珠形) 자사호. 진한 주홍빛 주니 태토가 아름다우며, 반구형 뚜껑과 짧은 직각 주둥이가 조화를 이룹니다. 단차(單泡) 한 잔 분량인 80ml로 일인 다의(茶儀)에 어울립니다.','복건 주니 · 주형 · 80ml · 1인용',420000.00,380000.00,5,'OHD-ZZ-002','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(3,10,'옥화당 주니 석표호 160ml','zhuní-shipiao-160','돌표주박 형상을 본 딴 석표형(石瓢形) 주니호. 삼각형 뚜껑 손잡이와 직선적인 흐름이 현대적 감각과 전통미를 동시에 담아냅니다. 160ml 중용량으로 1~2인 차회에 적합합니다.','복건 주니 · 석표형 · 160ml',650000.00,NULL,2,'OHD-ZS-003','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(4,11,'옥화당 자사 편평호 200ml','zǐshā-biānpíng-200','의흥(宜興) 정통 자사니로 성형한 편평호. 납작한 원판 형태에 부드러운 곡선이 흐르며, 자사 특유의 깊은 자주빛이 우리는 보이차와 완벽하게 어울립니다. 200ml 용량으로 3~4인 소규모 차회에 알맞습니다.','의흥 자사 · 편평형 · 200ml',380000.00,NULL,8,'OHD-ZB-004','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(5,11,'옥화당 자사 서시호 150ml','zǐshā-xishi-150','부드러운 선과 봉긋한 뚜껑이 여성미를 풍기는 자사 서시호. 깊은 자주빛 자사니가 보이 생차의 꽃향과 잘 어우러집니다. 사용할수록 내부에 차기(茶氣)가 쌓여 맛이 한층 깊어집니다.','의흥 자사 · 서시형 · 150ml',450000.00,400000.00,4,'OHD-ZX-005','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(6,11,'옥화당 자사 주형호 180ml','zǐshā-zhu-180','둥글고 균형잡힌 주형 자사호. 자사니 특유의 투기성(透氣性)이 뛰어나 찻잎 향이 살아나며 열 보존력이 우수합니다. 보이숙차나 무이암차에 특히 잘 맞습니다.','의흥 자사 · 주형 · 180ml',320000.00,NULL,10,'OHD-ZZ-006','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(7,12,'옥화당 단니 석표호 220ml','duānní-shipiao-220','밝은 황갈색의 단니(段泥) 태토로 성형한 석표호. 단니 특유의 연황색 발색이 차실(茶室)에 따뜻한 분위기를 더합니다. 녹차·우롱차에도 활용 가능하며, 220ml 대용량으로 3~5인 차회에 적합합니다.','의흥 단니 · 석표형 · 220ml',520000.00,NULL,3,'OHD-DS-007','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(8,12,'옥화당 단니 편평호 140ml','duānní-biānpíng-140','단니의 황갈색과 편평 디자인이 만난 절제미. 넓은 저면과 낮은 높이가 안정적인 실루엣을 만들며, 묵직한 향의 노숙차에 잘 어울립니다.','의흥 단니 · 편평형 · 140ml',480000.00,430000.00,2,'OHD-DB-008','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(9,13,'옥화당 흑니 주형호 100ml','hēiní-zhu-100','깊고 무게감 있는 흑니(黑泥) 주형호. 완전히 소성된 흑색 표면은 세월이 지날수록 윤기가 더해집니다. 보이 숙차나 진한 무이암차를 우릴 때 찻물의 잡미를 잡아주는 효과가 있습니다.','흑니 · 주형 · 100ml',350000.00,NULL,6,'OHD-HZ-009','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(10,14,'옥화당 청회니 서시호 130ml','qīnghuīní-xishi-130','청회빛 차가운 색조를 띠는 청회니(靑灰泥) 서시호. 섬세한 질감의 태토가 손에 닿는 촉감이 좋으며, 향이 섬세한 백차·녹차·황차에 특히 잘 어울립니다.','청회니 · 서시형 · 130ml',420000.00,NULL,4,'OHD-QX-010','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(11,30,'2019년 반장 고수 생병 357g','banjang-gushu-2019-sheng','운남성 맹해현 반장(班章) 고수차(古樹茶) 원료로 압제한 생병(生餅). 강렬한 쓴맛 뒤에 오는 깊은 회감(回甘)이 특징이며, 장기 보관 시 뛰어난 전화(轉化)를 기대할 수 있습니다. 357g 표준 병차.','반장 고수 · 생병 357g · 2019년 · 강렬한 회감',180000.00,NULL,20,'OHD-PT-011','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(12,30,'2021년 빙도 고수 생병 357g','bingdao-gushu-2021-sheng','운남 임창 빙도(冰島) 고수원료 생병. 빙도 특유의 달콤한 화밀향과 부드러운 쓴맛, 긴 여운의 감미(甘味)로 최고급 생차 중 하나로 꼽힙니다.','빙도 고수 · 생병 357g · 2021년 · 화밀향',320000.00,NULL,10,'OHD-PT-012','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(13,31,'2015년 대익 7572 숙병 357g','dayi-7572-2015-shou','보이숙차의 기준이 되는 대익(大益) 7572 배방. 2015년 압제본으로 부드럽게 발효된 홍탕(紅湯)과 진한 대추·목이버섯향이 특징입니다. 입문용 숙차로 추천.','대익 7572 · 숙병 357g · 2015년 · 입문 추천',85000.00,75000.00,30,'OHD-PS-013','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(14,31,'2010년 하관 FT 숙타 250g','xiaguan-ft-2010-shou-tuo','하관차창(下關茶廠) FT 배방 숙타차(熟沱茶). 단단히 압제된 버섯 모양의 타차 형태로, 10년 이상 숙성되어 부드럽고 진한 탕색이 돋보입니다.','하관 FT · 숙타 250g · 2010년 · 10년 숙성',65000.00,NULL,15,'OHD-PS-014','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(15,32,'1990년대 홍인 노숙병 (소분) 10g','hong-yin-1990s-aged-10g','1990년대 제작 추정 홍인(紅印) 계열 노차 소분. 수십 년 자연 숙성된 약향(藥香)과 함목향(樟木香)이 깊게 배어 있습니다. 시음 목적 소분 상품이며 재고가 한정적입니다.','홍인 계열 노차 · 10g 소분 · 1990년대',120000.00,NULL,8,'OHD-PA-015','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(16,40,'경덕진 청화 다완 6P 세트','jingdezhen-blue-white-teacup-6p','경덕진(景德鎭) 전통 청화자기 다완 6개 세트. 코발트블루 수묵화 문양이 섬세하게 그려져 있으며, 얇은 태토와 투명 유약으로 찻물 색을 감상하기에 좋습니다.','경덕진 청화 · 다완 6P · 80ml',120000.00,105000.00,12,'OHD-TW-016','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(17,40,'건수요 천목유 다완 단품','jian-ware-tenmoku-teacup','송대(宋代) 건요(建窯) 천목유(天目釉) 재현 다완. 산화철 유약이 고온에서 만들어내는 은빛 토끼 털 문양(兎毫紋)이 아름답습니다. 말차(抹茶) 및 탕차(湯茶)에 최적화된 넓은 입구 형태.','건수요 천목유 · 토호문 · 말차용',58000.00,NULL,20,'OHD-TW-017','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(18,41,'대나무 다반 40×25cm','bamboo-tea-tray-40x25','천연 대나무를 슬라이스 가공한 다반(茶盤). 물받이 서랍이 내장되어 있어 행다(行茶) 중 흘린 물을 깔끔하게 처리할 수 있습니다. 40×25cm 중형으로 자사호 + 다완 4개 배치 가능.','천연 대나무 · 40×25cm · 물받이 내장',89000.00,NULL,15,'OHD-TR-018','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(19,42,'옥화당 입문 다도구 세트','okhwadang-starter-tea-set','자사호 입문자를 위한 올인원 다도구 세트. 자사 주형호 180ml, 청화 다완 2P, 대나무 다반, 차헌·차칙·차협·차루 4종 차도구(茶道具), 차통(茶筒)이 포함된 구성입니다.','자사호+다완+다반+차도구 세트 · 입문 구성',280000.00,240000.00,7,'OHD-TS-019','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(20,43,'대나무 차도구 5종 세트','bamboo-tea-tools-5p','차헌(茶獻)·차칙(茶則)·차협(茶夾)·차루(茶漏)·차침(茶針) 5종으로 구성된 대나무 차도구 세트. 천연 대나무 특유의 은은한 향이 나며 차도구 통(筒)이 함께 제공됩니다.','대나무 차도구 5종 · 차헌/차칙/차협/차루/차침',35000.00,NULL,25,'OHD-TT-020','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(21,43,'유리 공도배 (公道杯) 200ml','glass-fairness-cup-200ml','투명 내열유리 공도배. 우린 찻물을 고르게 나눠주는 필수 다구로, 맑은 탕색 감상에 최적입니다. 200ml 용량에 세밀한 눈금 인쇄가 특징입니다.','내열유리 공도배 · 200ml · 탕색 감상',22000.00,NULL,40,'OHD-TT-021','active',0,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611'),(22,40,'여요 빙렬유 다완 단품','ru-ware-crackle-teacup','북송(北宋) 여요(汝窯) 빙렬유(氷裂釉) 재현 다완. 천청색(天靑色) 유약 표면에 자연스럽게 형성된 빙렬(氷裂) 문양이 고아한 아름다움을 자아냅니다. 백차·녹차·청차에 어울립니다.','여요 빙렬유 · 천청색 · 100ml',75000.00,NULL,10,'OHD-TW-022','active',1,0,'2026-03-29 14:07:45.542611','2026-03-29 14:07:45.542611');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `type` enum('timesale','exhibition','event') COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `discount_rate` int DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
INSERT INTO `promotions` VALUES (1,'봄 기획전 — 주니 신작','복건 주니 신작 자사호 선착순 특가. 재고 한정으로 조기 마감될 수 있습니다.','exhibition','2026-03-29 00:00:00','2026-04-30 23:59:59',1,NULL,'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800','2026-03-29 14:07:45.557006'),(2,'입문 세트 14% 타임세일','옥화당 입문 다도구 세트 한정 수량 특가 — 280,000원 → 240,000원','timesale','2026-03-29 09:00:00','2026-04-05 23:59:59',1,14,'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800','2026-03-29 14:07:45.557006'),(3,'보이차 입문 이벤트','대익 7572 숙병 구매 시 대나무 차도구 5종 증정 이벤트','event','2026-04-01 00:00:00','2026-04-30 23:59:59',1,NULL,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800','2026-03-29 14:07:45.557006');
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `order_item_id` bigint NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `image_urls` json DEFAULT NULL,
  `is_visible` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_review_order_item` (`order_item_id`),
  KEY `IDX_review_product_id` (`product_id`),
  KEY `IDX_review_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping`
--

DROP TABLE IF EXISTS `shipping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `carrier` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mock',
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('payment_confirmed','preparing','shipped','in_transit','delivered','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'payment_confirmed',
  `shipped_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a37456893780ce2dfe0a7484c2` (`order_id`),
  CONSTRAINT `FK_a37456893780ce2dfe0a7484c22` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping`
--

LOCK TABLES `shipping` WRITE;
/*!40000 ALTER TABLE `shipping` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_settings`
--

DROP TABLE IF EXISTS `site_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `group` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `options` text COLLATE utf8mb4_unicode_ci,
  `default_value` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_site_settings_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_settings`
--

LOCK TABLES `site_settings` WRITE;
/*!40000 ALTER TABLE `site_settings` DISABLE KEYS */;
INSERT INTO `site_settings` VALUES (1,'color_primary','#8B4513','color','대표색','color',NULL,'#2563eb',1),(2,'color_primary_foreground','#FFFDF7','color','대표색 텍스트','color',NULL,'#ffffff',2),(3,'color_secondary','#f8f9f1','color','보조색','color',NULL,'#f1f5f9',3),(4,'color_background','#F5F0E8','color','배경색','color',NULL,'#ffffff',4),(5,'color_foreground','#2C1810','color','기본 텍스트색','color',NULL,'#0f172a',5),(6,'color_destructive','#db6b6b','color','삭제/경고색','color',NULL,'#ef4444',6),(7,'color_border','#E8DFD0','color','테두리색','color',NULL,'#e2e8f0',7),(8,'color_muted','#F2EDE4','color','음소거 배경색','color',NULL,'#f1f5f9',8),(9,'color_muted_foreground','#8B7355','color','음소거 텍스트색','color',NULL,'#64748b',9),(10,'color_ring','#8B4513','color','포커스 링 색','color',NULL,'#2563eb',10),(11,'font_family_base','\'Pretendard\', sans-serif','typography','기본 폰트','text',NULL,'\'Pretendard\', sans-serif',11),(12,'font_size_base','1rem','typography','기본 폰트 크기','text',NULL,'1rem',12),(13,'font_weight_normal','400','typography','일반 폰트 굵기','number',NULL,'400',13),(14,'font_weight_bold','700','typography','굵은 폰트 굵기','number',NULL,'700',14),(15,'line_height_base','1.5','typography','기본 줄 간격','number',NULL,'1.5',15),(16,'spacing_xs','0.25rem','spacing','최소 간격','text',NULL,'0.25rem',16),(17,'spacing_sm','0.5rem','spacing','작은 간격','text',NULL,'0.5rem',17),(18,'spacing_md','1rem','spacing','기본 간격','text',NULL,'1rem',18),(19,'spacing_lg','1.5rem','spacing','큰 간격','text',NULL,'1.5rem',19),(20,'spacing_xl','2rem','spacing','최대 간격','text',NULL,'2rem',20),(21,'radius_sm','0.25rem','radius','작은 모서리','text',NULL,'0.25rem',21),(22,'radius_md','0.375rem','radius','기본 모서리','text',NULL,'0.375rem',22),(23,'radius_lg','0.5rem','radius','큰 모서리','text',NULL,'0.5rem',23),(24,'color_secondary_foreground','#24290f','color','보조색 텍스트','color',NULL,'#0f172a',3),(25,'color_destructive_foreground','#f4f3f1','color','삭제/경고색 텍스트','color',NULL,'#ffffff',7),(26,'color_accent','#A0522D','color','강조색','color',NULL,'#f1f5f9',11),(27,'color_accent_foreground','#FFFDF7','color','강조색 텍스트','color',NULL,'#0f172a',12),(28,'color_card','#F9F5EE','color','카드 배경색','color',NULL,'#ffffff',13),(29,'color_card_foreground','#2C1810','color','카드 텍스트색','color',NULL,'#0f172a',14),(30,'color_input','#efede1','color','입력 필드 색','color',NULL,'#e2e8f0',15);
/*!40000 ALTER TABLE `site_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_addresses`
--

DROP TABLE IF EXISTS `user_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_addresses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `recipient_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zipcode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_detail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `label` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_7a5100ce0548ef27a6f1533a5c` (`user_id`),
  CONSTRAINT `FK_7a5100ce0548ef27a6f1533a5ce` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_addresses`
--

LOCK TABLES `user_addresses` WRITE;
/*!40000 ALTER TABLE `user_addresses` DISABLE KEYS */;
INSERT INTO `user_addresses` VALUES (2,1,'박지우','010-2593-1422','03726','연희로10길 58-8',NULL,NULL,1,'2026-03-26 08:18:33.238939');
/*!40000 ALTER TABLE `user_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_authentications`
--

DROP TABLE IF EXISTS `user_authentications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_authentications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `provider` enum('kakao','google') COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_token` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_156b26dc2b4cba804fd9dfe335` (`provider`,`provider_id`),
  KEY `FK_user_authentications_user_id` (`user_id`),
  CONSTRAINT `FK_163ff5c9a502621798f57606e80` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_authentications`
--

LOCK TABLES `user_authentications` WRITE;
/*!40000 ALTER TABLE `user_authentications` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_authentications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_coupons`
--

DROP TABLE IF EXISTS `user_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_coupons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `coupon_id` bigint NOT NULL,
  `status` enum('available','used','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `used_at` datetime DEFAULT NULL,
  `order_id` bigint DEFAULT NULL,
  `issued_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_user_coupon` (`user_id`,`coupon_id`),
  KEY `FK_user_coupons_user` (`user_id`),
  KEY `FK_user_coupons_coupon` (`coupon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_coupons`
--

LOCK TABLES `user_coupons` WRITE;
/*!40000 ALTER TABLE `user_coupons` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('user','admin','super_admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `refresh_token` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  KEY `IDX_ace513fa30d485cfd25c11a9e4` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'rerub0831@gmail.com','$2b$10$wJAaOWFn9rdHbx3K5AEzu.mpoUHtqMxPWzE9WSWSm15Vj85WdCL7S','박지우',NULL,'admin',1,'$2b$10$T2IHainlPHSxNDvZyuPO9.W3HdD.1Rr0vPZAg5DQeSCnrLJv3Lj.G','2026-03-26 05:04:45.759139','2026-03-29 14:04:06.000000'),(2,'test_cart@test.com','$2b$10$oe0RiBM7H3BAATi0ip1eGO1NT0wCqeKG3SBowfVaLUDytUC4i9dRq','테스트',NULL,'user',1,'$2b$10$Whfh..dr0XMTUeEv.7gzY.9DPM1oOBqsLoHOGCWQfRuw06mL/mKJK','2026-03-26 06:18:44.645457','2026-03-26 06:18:44.000000'),(3,'test2_cart@test.com','$2b$10$yICUqkVMdV.yu9IUVU7F7uc754wywBlXAGCgRC/ao3LQ7mOHM6uyS','테스트2',NULL,'user',1,'$2b$10$rXD2XhGu0dpRzne6QKeWpu/K1LYATnA0P9y9R10q7ad1LEAel5DCy','2026-03-26 06:26:02.523496','2026-03-26 06:27:35.000000'),(4,'carttest999@test.com','$2b$10$4l/Mqok3lGJuc2/uWUiZS.5TXBGlysr0vzjJ2bmsVCGO3p7C/Xel.','테스터',NULL,'user',1,'$2b$10$H55UwL79RQjdk.oa5PJg6OK55wn8530V5xztJR/6eAKJWI4Q9flJS','2026-03-26 08:21:09.757626','2026-03-26 08:21:09.000000');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlist`
--

DROP TABLE IF EXISTS `wishlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlist` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_user_product` (`user_id`,`product_id`),
  KEY `FK_wishlist_user` (`user_id`),
  KEY `FK_wishlist_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlist`
--

LOCK TABLES `wishlist` WRITE;
/*!40000 ALTER TABLE `wishlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `wishlist` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-29 23:08:34

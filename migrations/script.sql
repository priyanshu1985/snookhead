CREATE DATABASE  IF NOT EXISTS `snookhead` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `snookhead`;
-- MySQL dump 10.13  Distrib 8.0.44, for macos15 (arm64)
--
-- Host: localhost    Database: snookhead
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `active_tables`
--

DROP TABLE IF EXISTS `active_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `active_tables` (
  `active_id` int NOT NULL AUTO_INCREMENT,
  `table_id` int NOT NULL,
  `game_id` int NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('active','paused','completed') DEFAULT 'active',
  PRIMARY KEY (`active_id`),
  KEY `table_id` (`table_id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `active_tables_ibfk_104` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `active_tables_ibfk_105` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `active_tables`
--

LOCK TABLES `active_tables` WRITE;
/*!40000 ALTER TABLE `active_tables` DISABLE KEYS */;
INSERT INTO `active_tables` VALUES (1,1,1,'2025-11-29 08:24:34',NULL,'active'),(2,2,1,'2025-11-29 11:17:00',NULL,'active'),(3,3,1,'2025-11-29 11:20:48',NULL,'active'),(4,4,1,'2025-11-29 11:46:29',NULL,'active'),(5,5,1,'2025-11-29 14:33:20',NULL,'active'),(6,6,1,'2025-11-29 15:45:16',NULL,'active'),(7,7,1,'2025-12-01 15:39:20',NULL,'active'),(8,9,2,'2025-12-01 16:09:42',NULL,'active'),(9,8,3,'2025-12-07 19:31:46',NULL,'active'),(10,12,2,'2025-12-14 07:09:50',NULL,'active');
/*!40000 ALTER TABLE `active_tables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  `performed_by` int DEFAULT NULL,
  `performed_by_name` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `detail` json DEFAULT NULL COMMENT 'Detailed information about the action',
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `status` enum('SUCCESS','FAILURE','WARNING') NOT NULL DEFAULT 'SUCCESS',
  `error_message` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_entity_type_entity_id` (`entity_type`,`entity_id`),
  KEY `audit_logs_action` (`action`),
  KEY `audit_logs_performed_by` (`performed_by`),
  KEY `audit_logs_created_at` (`createdAt`),
  KEY `audit_logs_status` (`status`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bills`
--

DROP TABLE IF EXISTS `bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int DEFAULT NULL,
  `status` enum('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  `details` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `bill_number` varchar(50) NOT NULL,
  `customer_name` varchar(100) NOT NULL DEFAULT 'Walk-in Customer',
  `customer_phone` varchar(20) DEFAULT NULL,
  `session_id` int DEFAULT NULL,
  `table_charges` decimal(10,2) NOT NULL DEFAULT '0.00',
  `menu_charges` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bill_items` json DEFAULT NULL,
  `items_summary` text,
  `session_duration` int DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `table_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_number` (`bill_number`),
  UNIQUE KEY `bill_number_2` (`bill_number`),
  UNIQUE KEY `bill_number_3` (`bill_number`),
  UNIQUE KEY `bill_number_4` (`bill_number`),
  UNIQUE KEY `bill_number_5` (`bill_number`),
  UNIQUE KEY `bill_number_6` (`bill_number`),
  UNIQUE KEY `bill_number_7` (`bill_number`),
  UNIQUE KEY `bill_number_8` (`bill_number`),
  UNIQUE KEY `bill_number_9` (`bill_number`),
  UNIQUE KEY `bill_number_10` (`bill_number`),
  UNIQUE KEY `bill_number_11` (`bill_number`),
  UNIQUE KEY `bill_number_12` (`bill_number`),
  UNIQUE KEY `bill_number_13` (`bill_number`),
  UNIQUE KEY `bill_number_14` (`bill_number`),
  UNIQUE KEY `bill_number_15` (`bill_number`),
  UNIQUE KEY `bill_number_16` (`bill_number`),
  UNIQUE KEY `bill_number_17` (`bill_number`),
  UNIQUE KEY `bill_number_18` (`bill_number`),
  UNIQUE KEY `bill_number_19` (`bill_number`),
  UNIQUE KEY `bill_number_20` (`bill_number`),
  UNIQUE KEY `bill_number_21` (`bill_number`),
  UNIQUE KEY `bill_number_22` (`bill_number`),
  UNIQUE KEY `bill_number_23` (`bill_number`),
  UNIQUE KEY `bill_number_24` (`bill_number`),
  UNIQUE KEY `bill_number_25` (`bill_number`),
  UNIQUE KEY `bill_number_26` (`bill_number`),
  UNIQUE KEY `bill_number_27` (`bill_number`),
  UNIQUE KEY `bill_number_28` (`bill_number`),
  UNIQUE KEY `bill_number_29` (`bill_number`),
  UNIQUE KEY `bill_number_30` (`bill_number`),
  UNIQUE KEY `bill_number_31` (`bill_number`),
  UNIQUE KEY `bill_number_32` (`bill_number`),
  UNIQUE KEY `bill_number_33` (`bill_number`),
  UNIQUE KEY `bill_number_34` (`bill_number`),
  UNIQUE KEY `bill_number_35` (`bill_number`),
  UNIQUE KEY `bill_number_36` (`bill_number`),
  UNIQUE KEY `bill_number_37` (`bill_number`),
  UNIQUE KEY `bill_number_38` (`bill_number`),
  UNIQUE KEY `bill_number_39` (`bill_number`),
  UNIQUE KEY `bill_number_40` (`bill_number`),
  UNIQUE KEY `bill_number_41` (`bill_number`),
  UNIQUE KEY `bill_number_42` (`bill_number`),
  UNIQUE KEY `bill_number_43` (`bill_number`),
  UNIQUE KEY `bill_number_44` (`bill_number`),
  UNIQUE KEY `bill_number_45` (`bill_number`),
  UNIQUE KEY `bill_number_46` (`bill_number`),
  UNIQUE KEY `bill_number_47` (`bill_number`),
  UNIQUE KEY `bill_number_48` (`bill_number`),
  KEY `bills_bill_number` (`bill_number`),
  KEY `bills_customer_phone` (`customer_phone`),
  KEY `bills_status` (`status`),
  KEY `bills_table_id` (`table_id`),
  KEY `orderId` (`orderId`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `bills_ibfk_175` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bills_ibfk_176` FOREIGN KEY (`session_id`) REFERENCES `active_tables` (`active_id`),
  CONSTRAINT `bills_ibfk_177` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bills`
--

LOCK TABLES `bills` WRITE;
/*!40000 ALTER TABLE `bills` DISABLE KEYS */;
INSERT INTO `bills` VALUES (2,NULL,'paid','{\"booking_time\":\"2025-11-29T16:14:25.175Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"230100.00\",\"menu_charges\":0,\"total_amount\":\"230100.000\"}}','2025-11-29 16:37:28','2025-12-01 15:40:54','BILL-1764434248435-060LDMASZ','Walk-in Customer','+91 XXXXXXXXXX',NULL,230100.00,0.00,'[]','Table charges (23 min)',23,'2025-12-01 15:40:54',230100.00,1),(3,NULL,'pending','{\"booking_time\":\"2025-11-29T14:33:20.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"1930700.00\",\"menu_charges\":0,\"total_amount\":\"1930700.000\"}}','2025-11-29 17:46:34','2025-11-29 17:46:34','BILL-1764438394925-XOBELCFM1','Walk-in Customer','+91 XXXXXXXXXX',NULL,1930700.00,0.00,'[]','Table charges (193 min)',193,NULL,1930700.00,5),(4,NULL,'pending','{\"booking_time\":\"2025-11-29T15:45:16.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"1300700.00\",\"menu_charges\":0,\"total_amount\":\"1300700.000\"}}','2025-11-29 17:56:05','2025-11-29 17:56:05','BILL-1764438965724-Y1O1I60IR','Walk-in Customer','+91 XXXXXXXXXX',NULL,1300700.00,0.00,'[]','Table charges (130 min)',130,NULL,1300700.00,6),(5,NULL,'paid','{\"booking_time\":\"2025-12-01T15:39:20.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":0,\"menu_charges\":60,\"total_amount\":60}}','2025-12-01 15:40:10','2025-12-07 20:36:19','BILL-1764603610718-2Z5GIFUU5','Walk-in Customer','+91 XXXXXXXXXX',NULL,0.00,60.00,'[{\"name\": \"maggie\", \"unit\": \"piece\", \"price\": 60, \"total\": 60, \"category\": \"prepared\", \"quantity\": 1, \"menu_item_id\": 4}]','Table charges (0 min), maggie x1',0,'2025-12-07 20:36:19',60.00,7),(6,NULL,'paid','{\"booking_time\":\"2025-12-01T15:39:20.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"40400.00\",\"menu_charges\":0,\"total_amount\":\"40400.000\"}}','2025-12-01 15:44:19','2025-12-07 20:22:46','BILL-1764603859385-6YDK40N27','Walk-in Customer','+91 XXXXXXXXXX',NULL,40400.00,0.00,'[]','Table charges (4 min)',4,'2025-12-07 20:22:46',40400.00,7),(7,NULL,'pending','{\"booking_time\":\"2025-12-01T15:39:20.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"50400.00\",\"menu_charges\":0,\"total_amount\":\"50400.000\"}}','2025-12-01 15:44:30','2025-12-01 15:44:30','BILL-1764603870881-HL60DYQ1U','Walk-in Customer','+91 XXXXXXXXXX',NULL,50400.00,0.00,'[]','Table charges (5 min)',5,NULL,50400.00,7),(8,NULL,'pending','{\"booking_time\":\"2025-12-01T15:39:20.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"70400.00\",\"menu_charges\":0,\"total_amount\":\"70400.000\"}}','2025-12-01 15:46:55','2025-12-01 15:46:55','BILL-1764604015581-7CD6IX3E6','Walk-in Customer','+91 XXXXXXXXXX',NULL,70400.00,0.00,'[]','Table charges (7 min)',7,NULL,70400.00,7),(9,NULL,'paid','{\"booking_time\":\"2025-12-01T16:09:42.000Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"70400.00\",\"menu_charges\":0,\"total_amount\":\"70400.000\"}}','2025-12-01 16:17:27','2025-12-07 20:22:26','BILL-1764605847978-A21B0D601','Walk-in Customer','+91 XXXXXXXXXX',NULL,70400.00,0.00,'[]','Table charges (7 min)',7,'2025-12-07 20:22:26',70400.00,9),(10,NULL,'pending','{\"booking_time\":\"2025-12-13T22:02:31.246Z\",\"table_price_per_min\":10,\"frame_charges\":0,\"calculation_breakdown\":{\"table_charges\":\"20100.00\",\"menu_charges\":0,\"total_amount\":\"20100.000\"}}','2025-12-13 22:04:32','2025-12-13 22:04:32','BILL-1765663472172-PVWOBYP1C','Walk-in Customer','+91 XXXXXXXXXX',NULL,20100.00,0.00,'[]','Table charges (2 min)',2,NULL,20100.00,1);
/*!40000 ALTER TABLE `bills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `external_id` varchar(100) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text,
  `created_by` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `phone_2` (`phone`),
  UNIQUE KEY `phone_3` (`phone`),
  UNIQUE KEY `phone_4` (`phone`),
  UNIQUE KEY `phone_5` (`phone`),
  UNIQUE KEY `phone_6` (`phone`),
  UNIQUE KEY `phone_7` (`phone`),
  UNIQUE KEY `phone_8` (`phone`),
  UNIQUE KEY `phone_9` (`phone`),
  UNIQUE KEY `phone_10` (`phone`),
  UNIQUE KEY `phone_11` (`phone`),
  UNIQUE KEY `phone_12` (`phone`),
  UNIQUE KEY `phone_13` (`phone`),
  UNIQUE KEY `phone_14` (`phone`),
  UNIQUE KEY `phone_15` (`phone`),
  UNIQUE KEY `phone_16` (`phone`),
  UNIQUE KEY `phone_17` (`phone`),
  UNIQUE KEY `external_id` (`external_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `external_id_2` (`external_id`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `external_id_3` (`external_id`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `external_id_4` (`external_id`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `external_id_5` (`external_id`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `external_id_6` (`external_id`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `external_id_7` (`external_id`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `external_id_8` (`external_id`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `external_id_9` (`external_id`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `external_id_10` (`external_id`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `external_id_11` (`external_id`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `external_id_12` (`external_id`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `external_id_13` (`external_id`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `external_id_14` (`external_id`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `external_id_15` (`external_id`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `external_id_16` (`external_id`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `external_id_17` (`external_id`),
  UNIQUE KEY `email_17` (`email`),
  KEY `customers_phone` (`phone`),
  KEY `customers_email` (`email`),
  KEY `customers_external_id` (`external_id`),
  KEY `customers_is_active` (`is_active`),
  KEY `created_by` (`created_by`),
  KEY `customers_created_by` (`created_by`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES ('7f02cc37-665b-4c78-916a-2ef73b05df4f',NULL,'Rohit Sharma','9876543210','rohit@example.com',NULL,1,1,'2025-12-13 18:29:14','2025-12-13 18:29:14');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `food_items`
--

DROP TABLE IF EXISTS `food_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `image_url` varchar(300) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `food_items`
--

LOCK TABLES `food_items` WRITE;
/*!40000 ALTER TABLE `food_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `food_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `game_sessions`
--

DROP TABLE IF EXISTS `game_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_sessions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `session_number` varchar(50) NOT NULL COMMENT 'Unique session identifier for tracking',
  `customer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Customer playing the game',
  `table_id` int NOT NULL COMMENT 'Table being used for the game',
  `game_type` enum('SNOOKER','POOL_8_BALL','POOL_9_BALL','AMERICAN_POOL','CAROM') NOT NULL COMMENT 'Type of game being played',
  `status` enum('ACTIVE','PAUSED','COMPLETED','CANCELLED','ABANDONED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Current status of the game session',
  `start_time` datetime NOT NULL COMMENT 'When the game session started',
  `end_time` datetime DEFAULT NULL COMMENT 'When the game session ended',
  `pause_time` datetime DEFAULT NULL COMMENT 'When the game was paused (if applicable)',
  `resume_time` datetime DEFAULT NULL COMMENT 'When the game was resumed after pause',
  `duration_minutes` int DEFAULT NULL COMMENT 'Total playing time in minutes',
  `pause_duration_minutes` int DEFAULT '0' COMMENT 'Total paused time in minutes',
  `rate_per_minute` decimal(8,2) NOT NULL COMMENT 'Rate per minute for this session',
  `total_amount` decimal(10,2) DEFAULT NULL COMMENT 'Total amount for the session',
  `payment_status` enum('PENDING','PAID','PARTIAL','CREDIT','REFUNDED') NOT NULL DEFAULT 'PENDING' COMMENT 'Payment status for the session',
  `payment_method` enum('WALLET','CASH','CARD','UPI','CREDIT','MIXED') DEFAULT NULL COMMENT 'How the session was paid for',
  `created_by` int NOT NULL COMMENT 'Staff member who created this session',
  `notes` text COMMENT 'Additional notes about the session',
  `metadata` json DEFAULT NULL COMMENT 'Additional session metadata (scores, breaks, etc.)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_number` (`session_number`),
  UNIQUE KEY `idx_game_sessions_session_number` (`session_number`),
  UNIQUE KEY `session_number_2` (`session_number`),
  UNIQUE KEY `session_number_3` (`session_number`),
  UNIQUE KEY `session_number_4` (`session_number`),
  UNIQUE KEY `session_number_5` (`session_number`),
  UNIQUE KEY `session_number_6` (`session_number`),
  UNIQUE KEY `session_number_7` (`session_number`),
  UNIQUE KEY `session_number_8` (`session_number`),
  UNIQUE KEY `session_number_9` (`session_number`),
  UNIQUE KEY `session_number_10` (`session_number`),
  UNIQUE KEY `session_number_11` (`session_number`),
  UNIQUE KEY `session_number_12` (`session_number`),
  UNIQUE KEY `session_number_13` (`session_number`),
  UNIQUE KEY `session_number_14` (`session_number`),
  UNIQUE KEY `session_number_15` (`session_number`),
  UNIQUE KEY `session_number_16` (`session_number`),
  KEY `idx_game_sessions_customer_id` (`customer_id`),
  KEY `idx_game_sessions_table_id` (`table_id`),
  KEY `idx_game_sessions_status` (`status`),
  KEY `idx_game_sessions_start_time` (`start_time`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `game_sessions_ibfk_46` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `game_sessions_ibfk_47` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `game_sessions_ibfk_48` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_sessions`
--

LOCK TABLES `game_sessions` WRITE;
/*!40000 ALTER TABLE `game_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `game_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `game_id` int NOT NULL AUTO_INCREMENT,
  `game_name` varchar(250) NOT NULL,
  `game_createdon` datetime DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `game_modify` varchar(250) DEFAULT NULL,
  `modified_by` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`game_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` VALUES (1,'ps5','2025-11-22 09:02:47','admin@snookhead.com',NULL,NULL),(2,'circktet','2025-11-25 16:42:04','admin@snookhead.com',NULL,NULL),(3,'foot','2025-11-25 20:01:34','admin@snookhead.com',NULL,NULL),(4,'Snooker','2025-11-25 20:16:07','system',NULL,NULL),(5,'Snooker','2025-11-25 20:16:07','system',NULL,NULL),(6,'Pool','2025-11-25 20:16:07','system',NULL,NULL),(7,'Pool','2025-11-25 20:16:07','system',NULL,NULL),(8,'Table Tennis','2025-11-25 20:16:07','system',NULL,NULL),(9,'Table Tennis','2025-11-25 20:16:07','system',NULL,NULL),(10,'Chess','2025-11-25 20:16:07','system',NULL,NULL),(11,'Chess','2025-11-25 20:16:07','system',NULL,NULL),(12,'dds','2025-11-25 20:21:45','admin@snookhead.com',NULL,NULL),(13,'chess','2025-11-26 16:30:09','admin@snookhead.com',NULL,NULL),(14,'goood','2025-11-27 17:02:22','admin@snookhead.com',NULL,NULL),(15,'hockey','2025-12-01 15:35:42','admin@snookhead.com',NULL,NULL);
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menuitems`
--

DROP TABLE IF EXISTS `menuitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menuitems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` enum('Food','Fast Food','Beverages','Snacks','Desserts','prepared','packed','cigarette') NOT NULL DEFAULT 'Food',
  `description` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int DEFAULT '0',
  `threshold` int DEFAULT '5',
  `supplierPhone` varchar(20) DEFAULT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'piece',
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menuitems`
--

LOCK TABLES `menuitems` WRITE;
/*!40000 ALTER TABLE `menuitems` DISABLE KEYS */;
INSERT INTO `menuitems` VALUES (1,'momo','prepared','spicy',100.00,0,0,NULL,NULL,'2025-11-26 15:24:27','2025-11-26 15:24:27','piece',1),(2,'panner chilly','packed','spicy',200.00,0,0,NULL,NULL,'2025-11-27 17:06:35','2025-11-27 17:06:35','piece',1),(3,'choti advance','cigarette','smkoe',30.00,0,0,NULL,NULL,'2025-11-28 06:11:03','2025-11-28 06:11:03','piece',1),(4,'maggie','prepared','spicy',60.00,0,0,NULL,NULL,'2025-11-28 06:18:07','2025-11-28 06:18:07','piece',1),(5,'packed','packed','balaji',20.00,0,0,NULL,NULL,'2025-11-28 06:18:43','2025-11-28 06:18:43','piece',1),(6,'gold','cigarette','smoke',20.00,0,0,NULL,NULL,'2025-11-28 06:19:16','2025-11-28 06:19:16','piece',1),(7,'momo','prepared','spicy',200.00,0,5,NULL,NULL,'2025-11-28 10:14:02','2025-11-28 10:14:02','piece',1),(8,'Chips','packed','salty',20.00,0,5,NULL,NULL,'2025-12-01 15:37:29','2025-12-01 15:37:29','piece',1);
/*!40000 ALTER TABLE `menuitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderitems`
--

DROP TABLE IF EXISTS `orderitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderitems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int DEFAULT NULL,
  `menuItemId` int DEFAULT NULL,
  `qty` int DEFAULT '1',
  `priceEach` decimal(10,2) DEFAULT '0.00',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `orderId` (`orderId`),
  KEY `menuItemId` (`menuItemId`),
  CONSTRAINT `orderitems_ibfk_107` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orderitems_ibfk_108` FOREIGN KEY (`menuItemId`) REFERENCES `menuitems` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderitems`
--

LOCK TABLES `orderitems` WRITE;
/*!40000 ALTER TABLE `orderitems` DISABLE KEYS */;
INSERT INTO `orderitems` VALUES (4,7,1,1,100.00,'2025-11-28 10:47:57','2025-11-28 10:47:57'),(5,8,1,1,100.00,'2025-11-28 10:52:21','2025-11-28 10:52:21'),(6,9,1,1,100.00,'2025-11-28 10:56:14','2025-11-28 10:56:14'),(7,10,7,1,200.00,'2025-11-28 17:47:04','2025-11-28 17:47:04'),(8,11,7,1,200.00,'2025-11-28 17:47:18','2025-11-28 17:47:18'),(9,12,7,1,200.00,'2025-11-28 17:47:55','2025-11-28 17:47:55'),(10,13,7,1,200.00,'2025-11-28 17:48:05','2025-11-28 17:48:05'),(11,14,1,1,100.00,'2025-11-28 17:52:37','2025-11-28 17:52:37'),(12,15,1,1,100.00,'2025-11-28 17:52:44','2025-11-28 17:52:44'),(13,16,1,1,100.00,'2025-11-28 17:56:33','2025-11-28 17:56:33'),(14,17,1,1,100.00,'2025-11-28 17:56:40','2025-11-28 17:56:40'),(15,22,1,1,100.00,'2025-11-29 14:26:51','2025-11-29 14:26:51'),(16,23,1,1,100.00,'2025-11-29 14:27:16','2025-11-29 14:27:16'),(17,26,4,1,60.00,'2025-11-29 17:16:53','2025-11-29 17:16:53'),(18,27,4,1,60.00,'2025-11-29 17:17:18','2025-11-29 17:17:18');
/*!40000 ALTER TABLE `orderitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `total` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `active_id` int DEFAULT NULL,
  `personName` varchar(100) DEFAULT NULL,
  `paymentMethod` enum('offline','online','hybrid') DEFAULT 'offline',
  `cashAmount` decimal(10,2) DEFAULT '0.00',
  `onlineAmount` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `active_id` (`active_id`),
  CONSTRAINT `orders_ibfk_106` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_107` FOREIGN KEY (`active_id`) REFERENCES `active_tables` (`active_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (2,1,0.00,'pending','2025-11-28 10:18:15','2025-11-28 10:18:15',NULL,'amit','online',0.00,100.00),(3,1,0.00,'pending','2025-11-28 10:19:06','2025-11-28 10:19:06',NULL,'amit','online',0.00,100.00),(4,1,0.00,'pending','2025-11-28 10:33:54','2025-11-28 10:33:54',NULL,'amit','online',0.00,100.00),(5,1,0.00,'pending','2025-11-28 10:44:21','2025-11-28 10:44:21',NULL,'amit','online',0.00,100.00),(6,1,0.00,'pending','2025-11-28 10:45:42','2025-11-28 10:45:42',NULL,'Guest','online',0.00,100.00),(7,1,100.00,'pending','2025-11-28 10:47:57','2025-11-28 10:47:57',NULL,'Guest','online',0.00,100.00),(8,1,100.00,'pending','2025-11-28 10:52:21','2025-11-28 10:52:22',NULL,'Guest','online',0.00,100.00),(9,1,100.00,'pending','2025-11-28 10:56:14','2025-11-28 10:56:14',NULL,'Guest','online',0.00,100.00),(10,1,200.00,'pending','2025-11-28 17:47:04','2025-11-28 17:47:04',NULL,'amit','offline',200.00,0.00),(11,1,200.00,'pending','2025-11-28 17:47:18','2025-11-28 17:47:18',NULL,'amit','online',0.00,200.00),(12,1,200.00,'pending','2025-11-28 17:47:55','2025-11-28 17:47:55',NULL,'amit','offline',200.00,0.00),(13,1,200.00,'pending','2025-11-28 17:48:05','2025-11-28 17:48:05',NULL,'amit','online',0.00,200.00),(14,1,100.00,'pending','2025-11-28 17:52:37','2025-11-28 17:52:37',NULL,'ram','offline',100.00,0.00),(15,1,100.00,'pending','2025-11-28 17:52:44','2025-11-28 17:52:44',NULL,'ram','online',0.00,100.00),(16,1,100.00,'pending','2025-11-28 17:56:33','2025-11-28 17:56:33',NULL,'sham','offline',100.00,0.00),(17,1,100.00,'pending','2025-11-28 17:56:40','2025-11-28 17:56:40',NULL,'sham','online',0.00,100.00),(18,1,0.00,'pending','2025-11-29 08:24:34','2025-11-29 08:24:34',NULL,NULL,'offline',0.00,0.00),(19,1,0.00,'pending','2025-11-29 11:17:00','2025-11-29 11:17:00',NULL,NULL,'offline',0.00,0.00),(20,1,0.00,'pending','2025-11-29 11:20:48','2025-11-29 11:20:48',NULL,NULL,'offline',0.00,0.00),(21,1,0.00,'pending','2025-11-29 11:46:29','2025-11-29 11:46:29',NULL,NULL,'offline',0.00,0.00),(22,1,100.00,'pending','2025-11-29 14:26:51','2025-11-29 14:26:51',NULL,'amit','offline',100.00,0.00),(23,1,100.00,'pending','2025-11-29 14:27:16','2025-11-29 14:27:16',NULL,'amit','online',0.00,100.00),(24,1,0.00,'pending','2025-11-29 14:33:20','2025-11-29 14:33:20',NULL,NULL,'offline',0.00,0.00),(25,1,0.00,'pending','2025-11-29 15:45:16','2025-11-29 15:45:16',NULL,NULL,'offline',0.00,0.00),(26,1,60.00,'pending','2025-11-29 17:16:53','2025-11-29 17:16:53',NULL,'pm','offline',60.00,0.00),(27,1,60.00,'pending','2025-11-29 17:17:18','2025-11-29 17:17:18',NULL,'pm','online',0.00,60.00),(28,1,0.00,'pending','2025-12-01 15:39:20','2025-12-01 15:39:20',NULL,NULL,'offline',0.00,0.00),(29,1,0.00,'pending','2025-12-01 16:09:42','2025-12-01 16:09:42',NULL,NULL,'offline',0.00,0.00),(30,1,0.00,'pending','2025-12-07 19:31:46','2025-12-07 19:31:46',NULL,NULL,'offline',0.00,0.00),(31,1,0.00,'pending','2025-12-14 07:09:50','2025-12-14 07:09:50',NULL,NULL,'offline',0.00,0.00);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qr_codes`
--

DROP TABLE IF EXISTS `qr_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_codes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `customer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `qr_token` varchar(500) NOT NULL,
  `qr_image` longtext,
  `qr_image_url` varchar(500) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `scan_count` int NOT NULL DEFAULT '0',
  `last_scanned_at` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL COMMENT 'Additional QR code metadata',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_token` (`qr_token`),
  UNIQUE KEY `qr_token_2` (`qr_token`),
  UNIQUE KEY `qr_token_3` (`qr_token`),
  UNIQUE KEY `qr_token_4` (`qr_token`),
  UNIQUE KEY `qr_token_5` (`qr_token`),
  UNIQUE KEY `qr_token_6` (`qr_token`),
  UNIQUE KEY `qr_token_7` (`qr_token`),
  UNIQUE KEY `qr_token_8` (`qr_token`),
  UNIQUE KEY `qr_token_9` (`qr_token`),
  UNIQUE KEY `qr_token_10` (`qr_token`),
  UNIQUE KEY `qr_token_11` (`qr_token`),
  UNIQUE KEY `qr_token_12` (`qr_token`),
  UNIQUE KEY `qr_token_13` (`qr_token`),
  KEY `qr_codes_qr_token` (`qr_token`),
  KEY `qr_codes_customer_id` (`customer_id`),
  KEY `qr_codes_is_active` (`is_active`),
  KEY `qr_codes_expires_at` (`expires_at`),
  CONSTRAINT `qr_codes_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qr_codes`
--

LOCK TABLES `qr_codes` WRITE;
/*!40000 ALTER TABLE `qr_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `qr_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queue`
--

DROP TABLE IF EXISTS `queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `members` int NOT NULL DEFAULT '1',
  `game_id` int NOT NULL,
  `preferred_table_id` int DEFAULT NULL,
  `estimated_wait_minutes` int DEFAULT NULL,
  `status` enum('waiting','assigned','seated','served','cancelled') DEFAULT 'waiting',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `preferred_table_id` (`preferred_table_id`),
  CONSTRAINT `queue_ibfk_1` FOREIGN KEY (`preferred_table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queue`
--

LOCK TABLES `queue` WRITE;
/*!40000 ALTER TABLE `queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `tableId` int DEFAULT NULL,
  `fromTime` datetime DEFAULT NULL,
  `toTime` datetime DEFAULT NULL,
  `status` enum('pending','active','done','cancelled') DEFAULT 'pending',
  `notes` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `tableId` (`tableId`),
  CONSTRAINT `reservations_ibfk_115` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservations_ibfk_116` FOREIGN KEY (`tableId`) REFERENCES `tables` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tables`
--

DROP TABLE IF EXISTS `tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `dimension` varchar(32) DEFAULT NULL,
  `onboardDate` date DEFAULT NULL,
  `type` varchar(32) DEFAULT NULL,
  `pricePerMin` decimal(10,2) DEFAULT NULL,
  `status` enum('available','reserved','maintenance') DEFAULT 'available',
  `frameCharge` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `game_id` int NOT NULL,
  PRIMARY KEY (`id`,`game_id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `tables_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tables`
--

LOCK TABLES `tables` WRITE;
/*!40000 ALTER TABLE `tables` DISABLE KEYS */;
INSERT INTO `tables` VALUES (1,'tab','12','2005-12-12','play',200.00,'reserved',100.00,'2025-11-25 20:16:40','2025-11-29 08:24:35',1),(2,'table2','12','2001-10-01','button',200.00,'reserved',1000.00,'2025-11-26 14:55:16','2025-11-29 11:17:00',1),(3,'class','10','1020-01-01','door',100.00,'reserved',200.00,'2025-11-26 16:16:20','2025-11-29 11:20:48',1),(4,'turf1','12','2005-10-12','game',800.00,'reserved',700.00,'2025-11-27 08:39:29','2025-11-29 11:46:29',1),(5,'turf1','12','2005-10-12','game',800.00,'reserved',700.00,'2025-11-27 08:39:51','2025-11-29 14:33:20',1),(6,'turf1','12','2005-10-12','game',800.00,'reserved',700.00,'2025-11-27 09:06:28','2025-11-29 15:45:16',1),(7,'item.category',NULL,NULL,NULL,200.00,'reserved',400.00,'2025-11-27 09:13:22','2025-12-01 15:39:20',1),(8,'play','12',NULL,NULL,200.00,'reserved',500.00,'2025-11-27 09:33:26','2025-12-07 19:31:46',3),(9,'turf',NULL,NULL,NULL,800.00,'available',400.00,'2025-11-27 09:34:36','2025-12-01 16:17:28',2),(10,'table1','12','2001-12-01','snokker',200.00,'available',100.00,'2025-11-29 17:40:26','2025-11-29 17:40:26',4),(11,'Table1','12','2001-12-01','Table2',200.00,'available',100.00,'2025-12-01 15:36:18','2025-12-01 15:36:18',15),(12,'Jainam table','69 x 69','2005-12-12','pool',34.00,'reserved',100.00,'2025-12-08 18:18:08','2025-12-14 07:09:50',2);
/*!40000 ALTER TABLE `tables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `wallet_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `customer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `game_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Reference to game session if transaction is game-related',
  `type` enum('TOPUP','DEDUCT','GAME_PAYMENT','CREDIT_ISSUED','CREDIT_SETTLED','REFUND','ADJUSTMENT') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance_before` decimal(15,2) NOT NULL,
  `balance_after` decimal(15,2) NOT NULL,
  `reference` varchar(200) DEFAULT NULL COMMENT 'Bill ID, Payment Gateway ID, or other reference',
  `description` text,
  `metadata` json DEFAULT NULL COMMENT 'Game ID, notes, cashier ID, etc.',
  `created_by` int DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','FAILED','REVERSED') NOT NULL DEFAULT 'COMPLETED',
  `idempotency_key` varchar(100) DEFAULT NULL COMMENT 'Prevents duplicate transactions',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_2` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_3` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_4` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_5` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_6` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_7` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_8` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_9` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_10` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_11` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_12` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_13` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_14` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_15` (`idempotency_key`),
  UNIQUE KEY `idempotency_key_16` (`idempotency_key`),
  KEY `transactions_wallet_id_created_at` (`wallet_id`,`createdAt`),
  KEY `transactions_customer_id_created_at` (`customer_id`,`createdAt`),
  KEY `transactions_type` (`type`),
  KEY `transactions_reference` (`reference`),
  KEY `transactions_status` (`status`),
  KEY `transactions_idempotency_key` (`idempotency_key`),
  KEY `transactions_created_by` (`created_by`),
  KEY `game_session_id` (`game_session_id`),
  CONSTRAINT `transactions_ibfk_61` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_62` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_63` FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_64` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `email` varchar(120) NOT NULL,
  `passwordHash` varchar(128) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('staff','owner','admin','customer') DEFAULT 'customer',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `email_30` (`email`),
  UNIQUE KEY `email_31` (`email`),
  UNIQUE KEY `email_32` (`email`),
  UNIQUE KEY `email_33` (`email`),
  UNIQUE KEY `email_34` (`email`),
  UNIQUE KEY `email_35` (`email`),
  UNIQUE KEY `email_36` (`email`),
  UNIQUE KEY `email_37` (`email`),
  UNIQUE KEY `email_38` (`email`),
  UNIQUE KEY `email_39` (`email`),
  UNIQUE KEY `email_40` (`email`),
  UNIQUE KEY `email_41` (`email`),
  UNIQUE KEY `email_42` (`email`),
  UNIQUE KEY `email_43` (`email`),
  UNIQUE KEY `email_44` (`email`),
  UNIQUE KEY `email_45` (`email`),
  UNIQUE KEY `email_46` (`email`),
  UNIQUE KEY `email_47` (`email`),
  UNIQUE KEY `email_48` (`email`),
  UNIQUE KEY `email_49` (`email`),
  UNIQUE KEY `email_50` (`email`),
  UNIQUE KEY `email_51` (`email`),
  UNIQUE KEY `email_52` (`email`),
  UNIQUE KEY `email_53` (`email`),
  UNIQUE KEY `email_54` (`email`),
  UNIQUE KEY `email_55` (`email`),
  UNIQUE KEY `email_56` (`email`),
  UNIQUE KEY `email_57` (`email`),
  UNIQUE KEY `email_58` (`email`),
  UNIQUE KEY `email_59` (`email`),
  UNIQUE KEY `email_60` (`email`),
  UNIQUE KEY `email_61` (`email`),
  UNIQUE KEY `email_62` (`email`),
  UNIQUE KEY `email_63` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrator','admin@snookhead.com','$2b$10$GRWom3w9ZEzdgSXUoLCQQORzPNOspTLcGtv/mAH/hQI1IT7j6045q',NULL,'admin','2025-11-20 19:27:09','2025-11-20 19:27:09'),(4,'PM','demo@gmaail.com','$2b$10$HFXjMUlZCNG1GAFHeqH2ReD14BMSo0f8Yeqk0BBesEneXJwy00UEC','+919595594320','customer','2025-11-21 19:46:56','2025-11-21 19:46:56');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `customer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `credit_limit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `reserved_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `last_transaction_at` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `phone_no` varchar(14) DEFAULT NULL,
  `qr_id` varchar(50) NOT NULL,
  `qr_code` blob,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_id` (`customer_id`),
  KEY `wallets_customer_id` (`customer_id`),
  KEY `wallets_balance` (`balance`),
  CONSTRAINT `wallets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES ('1c9ebc38-4abe-48ad-ae6e-9693048e5ffe','7f02cc37-665b-4c78-916a-2ef73b05df4f',0.00,0.00,'INR',0.00,NULL,'2025-12-13 20:16:29','2025-12-13 20:16:29',NULL,'WALLET-1c9ebc38',_binary 'PNG\r\n\Z\n\0\0\0\rIHDR\0\0\0\Ô\0\0\0\Ô\0\0\0\ä\Þ\r\0\0\0IDATx\ì\Z~\Ò\0\0\n/IDAT\íÁA\ØÀ\0ÁLbþÿ\å\\\ë\Ô\0Á\ÉöVýÁZëµ\Ö5k­k\ÖZ\×<¬µ®yXk]ó°Öº\æa­u\Í\ÃZëµ\Ö5k­k\ÖZ\×<¬µ®yXk]ó°Öº\æa­u\Í©üM_¨L\'*SÅ\ÊTñ\Ê\'*7UL*SÅ\ÊT1©üM_<¬µ®yXk]ó°Öº\æ\Ë*nR¹©bR¹©bR*N*NTNTÞ¨T~\ÊTñF\ÅM*7=¬µ®yXk]ó°Öº\æ_¦òF\Å*\'\ÊT1©Lo¨Lo¨LSÅ¤2U¨L*oTL*ÿ\Ê¿\éa­u\Í\ÃZëµ\Ö5?ü©8©8©xCeªTÞ¨T\ÞP9©xC\å¤bRyCeªøoö°Öº\æa­u\Í\ÃZ\ëþÇ©L¿Ieª8QTnª¸Ieª*&ÿO\ÖZ\×<¬µ®yXk]ó\Ã/«ø*&©\â\r©bR9©T¦7T¦\ßTñ\äa­u\Í\ÃZëµ\Ö5?\\¦òDeªTNT¦IeªxCeªø¢bR*&©bR*&©bR*NTþ=¬µ®yXk]ó°Öºæ*þ¨¼Q1©L\ÊM_TL*\'*_¨L\'\'ÿM\ÖZ\×<¬µ®yXk]cð\ÊT1©\ÜTq¢2UL*oT¨LÊ¿Tñ\Ê\Ê\'*7Uü¦µ\Ö5k­k\ÖZ\×üp\ÊI\ÅM*\'*\'\Êoª8Q*\ÞPyCå¦I\å¤bR*NTNT¦/\ÖZ\×<¬µ®yXk]ó\Ã/«Tnª8Q*\ÞPù¢bRùB\å¤bR*¦IeªT&©â7T¦\ÖZ\×<¬µ®yXk]ó\ÃeoTÜ¤2U\ÜTqSÅ¤rR1©L*SÅ\Ê\ßT1©LSÅ\ÊT1©¼Qñ\Å\ÃZëµ\Ö5k­k~øe*\'*7UL*SÅ¤2U¼¡2UL*SÅ¤2UL*7©LÊ¤2U¨L\ÊT1©¼Q1©L\'*7=¬µ®yXk]ó°Öº\Æþà¿\ÊIÅ\Êÿ\ÊTñ\ÊT1©T|¡2U|¡òE\Åk­k\ÖZ\×<¬µ®±?ø@eª8Q*&IåIeªT¦I\å7UL*oT¨LÊ¿T1©¼Qñ\ÖZ\×<¬µ®yXk]ó\Ãe*SÅ\ÊTñ/U¼¡2UL*SÅ\ÊTqRq¢2©¼¡2U|¡2U¼¡r\ÊTñ\Å\ÃZëµ\Ö5k­k~øe*SÅ¤r¢òFÅ¤ò\Êo¨TL*oT¼Qq¢2©LoT¼¡rRñ\ÊTq\Ó\ÃZëµ\Ö5k­k\ì.R*&ß¤2U|¡rRñ\ÊI\Å*SÅ\ÊTq\ÊTñ\Ê_<¬µ®yXk]ó°Öº\Æþ\à¿©bRy£\â\r©bR¹©bR*&©bR*¾P9©T¦7T¦ÿdk­k\ÖZ\×<¬µ®ù\áUL*S\ÅMo¨TTL*S\Å\Ê\ÊI\ÅIÅ¤r\ÊT1©TL*\'7=¬µ®yXk]ó°Öº\Æþ\à©bRùoRñ\ÊT1©üM\ÊTñ\ÊI\Å*SÅ¤2U\Üô°Öº\æa­u\Í\ÃZ\ë\Zû¿H\å¤\â\r7*&*NTN*\ÞP*¾P9©TN*&7T¦IeªT¦/\ÖZ\×<¬µ®yXk]ó\ÃG*SÅ¤2UL*\'*S\ÅI\Å\ßT1©LSÅ¤r¢2U¨TL*SÅ\ÊTq¢2UL*\'*S\Å\ÊTq\Ó\ÃZëµ\Ö5k­k~¸Lå¦7TN*~S\ÅMÿ\ÊT1©LS\Åo¨üKk­k\ÖZ\×<¬µ®ù\á?\Ê_T|¡2U¼¡òE\Å\'\ÊTq¢ò\ÊM\Ó\ÃZëµ\Ö5k­k~¸¬\âD\å¤\â\rIeª¸I\å¤bR9©TÞ¨T¦I\å&©bªT¦¿I\å¤âµ\Ö5k­k\ÖZ\×üð\ËTN*&7T¦/*¾¨8©8Q9©TN*&/T¦©bR9©Tnª¸\éa­u\Í\ÃZëµ\Ö5?ü²Iå¦ß¤ò\ÊIÅ\ÊT1©L\Ê*SÅ\ÊIÅ¤ò/=¬µ®yXk]ó°Öº\Æþ\à7*&©bR9©T¦I\å7UL*SÅ\ÊT1©TL*\'ÿ\ÊIÅ\ÊTñ\ÊTñ\Å\ÃZëµ\Ö5k­k~ø¨\â\r7*&\ßT1©L\'*\'*S\ÅT1©¼¡2UL*\Êo¨\ÜT1©üKk­k\ÖZ\×<¬µ®ù\á«T¾¨T¦IeR*&/*NT¦/T¦/TNTN*&©â\éa­u\Í\ÃZëµ\Ö5?ü2©\â¤\â?YÅÊ\Ê*oTL\ÊIÅ¤2U¼Q1©¼¡ò*nzXk]ó°Öº\æa­uýÁ*\'o¨T¨L\Ê\'*S\ÅM*\'\ÊTñ\ÊTq¢2UL*SÅ\ÊIÅ\ÊI\Åk­k\ÖZ\×<¬µ®±?¸HeªT¦ß¤rR1©T¼¡ò7UÜ¤2UÜ¤òEÅ¤rR1©L_<¬µ®yXk]ó°Öº\Æþ\àR*&7*\ÞP9©TN*\ÞP*¾Pù¢\âD\å¤bR9©xCå¦\ÖZ\×<¬µ®yXk]ó\Ãe*7U¼¡2UL*o¨Ü¤2UL*SÅ¤rRq¢ò\Ê*o¨|Q1©Tü¦µ\Ö5k­k\ÖZ\×üð\ÊTq¢ò\ÊI\ÅM\ÊIÅ¤2ULÊ\ÊoªTN*nRùBeªxCeªø\âa­u\Í\ÃZëµ\Ö5?|TñF\Å\'*_TT¨¼¡rRñ\Êß¤2UL*S\Åo¨L*ÿ\Ò\ÃZëµ\Ö5k­k~øH\åoª*¾P9©8©øM*SÅ\ÊI\ÅI\Å\Ê*S\ÅIÅ¤2Uü¦µ\Ö5k­k\ÖZ\×üpY\ÅM*\'*SÅ¤2UL*SÅ\ÊT1©LSÅ¤rRq\Ê\'*\'\'*\'o¨¼¡2U|ñ°Öº\æa­u\Í\ÃZ\ë~\Ê¿I\åD\å\r©\âDå©bR9Q*nR¹©\â¤â¦µ\Ö5k­k\ÖZ\×üð?FeªxCeªT¦I\åDeªxCeªT¦/T¦/T¦I\å&7*¾xXk]ó°Öº\æa­u\Íÿc*&©\â\r©\â\r/T¦IeªT¦©bR*¦IeªøBå\ÖZ\×<¬µ®yXk]ó\Ã/«øMÊ\ÊI\Å*S\ÅM\'*SÅ¤r¢rR1©¼¡2U¼¡òE\ÅozXk]ó°Öº\æa­u\Í©üM*7©L\Ê*S\Å*oT¨¨LÊ¤2UL*SÅ¤2U|¡2U\Üô°Öº\æa­u\Í\ÃZ\ë\Zûµ\Ök­k\ÖZ\×<¬µ®yXk]ó°Öº\æa­u\Í\ÃZëµ\Ö5k­k\ÖZ\×<¬µ®yXk]ó°Öº\æa­u\Í\ÃZ\ëÿ+:O\0\èþef\0\0\0\0IEND®B`');
/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-21  1:50:27

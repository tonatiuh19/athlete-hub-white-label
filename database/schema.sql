-- Athlete Hub Database Schema
-- Last updated: 2026-05-31
-- Source of truth — modify via database/migrations/
-- Compatible with: TiDB Cloud Serverless (MySQL 8.0)

-- MySQL dump 10.13  Distrib 9.6.0, for macos26.2 (arm64)
--
-- Host: gateway01.us-east-1.prod.aws.tidbcloud.com    Database: athlete-hub
-- ------------------------------------------------------
-- Server version	8.0.11-TiDB-v8.5.3-serverless

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
-- Table structure for table `admin_otp_codes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_otp_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('login','email_verify') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_admin_otp_admin_id` (`admin_id`),
  KEY `idx_admin_otp_expires` (`expires_at`),
  KEY `idx_admin_otp_lookup` (`admin_id`,`purpose`,`expires_at`),
  CONSTRAINT `fk_admin_otp_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_admin_sessions_admin` (`admin_id`),
  KEY `idx_admin_sessions_expires` (`expires_at`),
  UNIQUE KEY `token_hash` (`token_hash`),
  CONSTRAINT `fk_admin_sessions_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admins`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('super_admin','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_language` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `preferred_theme` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'UI theme: light | dark | system',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_admins_status` (`status`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uk_admins_public_uuid` (`public_uuid`),
  KEY `idx_admins_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `athlete_otp_codes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `athlete_otp_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `athlete_id` int unsigned NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('email','sms') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `purpose` enum('login','register','verify') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_athlete_otp_athlete` (`athlete_id`),
  KEY `idx_athlete_otp_expires` (`expires_at`),
  KEY `idx_athlete_otp_lookup` (`athlete_id`,`purpose`,`expires_at`),
  CONSTRAINT `fk_athlete_otp_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `athlete_password_resets`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `athlete_password_resets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `athlete_id` int unsigned NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_athlete_password_resets_athlete` (`athlete_id`),
  KEY `idx_athlete_password_resets_expires` (`expires_at`),
  KEY `idx_athlete_password_resets_lookup` (`token_hash`,`expires_at`),
  CONSTRAINT `fk_athlete_password_resets_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `athlete_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `athlete_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `athlete_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_athlete_sessions_athlete` (`athlete_id`),
  KEY `idx_athlete_sessions_expires` (`expires_at`),
  UNIQUE KEY `token_hash` (`token_hash`),
  CONSTRAINT `fk_athlete_sessions_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `athletes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `athletes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'scrypt hash; NULL = must set via reset',
  `password_set_at` datetime DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_verified_at` datetime DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shirt_size` enum('XS','S','M','L','XL','XXL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT 'MX',
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_language` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `preferred_theme` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'UI theme: light | dark | system',
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apple_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clerk_user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Clerk user id (sub) for SSO linking',
  `stripe_customer_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe Customer ID for saved cards',
  `status` enum('active','suspended','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `is_simulation` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Throwaway sim athlete (safe to wipe if no live regs)',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_athletes_email` (`email`),
  UNIQUE KEY `uk_athletes_phone` (`phone`),
  KEY `idx_athletes_status` (`status`),
  UNIQUE KEY `uk_athletes_public_uuid` (`public_uuid`),
  UNIQUE KEY `uk_athletes_clerk_user_id` (`clerk_user_id`),
  KEY `idx_athletes_name` (`last_name`,`first_name`),
  KEY `idx_athletes_city` (`city`,`country`),
  KEY `idx_athletes_stripe_customer` (`stripe_customer_id`),
  KEY `idx_athletes_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `actor_type` enum('athlete','organizer_member','admin','system') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` int unsigned DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int unsigned DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_audit_logs_actor` (`actor_type`,`actor_id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `check_in_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `check_in_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` int unsigned NOT NULL,
  `event_id` int unsigned NOT NULL,
  `checked_in_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `method` enum('qr_scan','manual','kiosk','api') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'qr_scan',
  `operator_type` enum('organizer_member','admin','system') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_id` int unsigned DEFAULT NULL,
  `location_label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_check_in_registration` (`registration_id`),
  KEY `idx_check_in_event_time` (`event_id`,`checked_in_at`),
  CONSTRAINT `fk_check_in_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_check_in_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `discount_codes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discount_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned DEFAULT NULL COMMENT 'Null = platform-wide or organizer-wide via organizer_id',
  `organizer_id` int unsigned DEFAULT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_type` enum('percent','fixed_cents') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent',
  `discount_value` int unsigned NOT NULL COMMENT 'Percent (1-100) or cents',
  `applies_to` enum('registration','service_fee','total') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registration',
  `max_uses` int unsigned DEFAULT NULL,
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `min_purchase_cents` int unsigned DEFAULT NULL,
  `valid_from` datetime DEFAULT NULL,
  `valid_until` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_discount_code_event` (`event_id`,`code`),
  KEY `idx_discount_codes_organizer` (`organizer_id`),
  KEY `idx_discount_codes_active` (`is_active`,`valid_from`,`valid_until`),
  CONSTRAINT `fk_discount_codes_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_discount_codes_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_categories`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `distance_km` decimal(8,2) DEFAULT NULL,
  `difficulty` enum('beginner','intermediate','advanced','expert') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity` int unsigned DEFAULT NULL,
  `sold_count` int unsigned NOT NULL DEFAULT '0',
  `price_cents` int unsigned NOT NULL COMMENT 'Registration price IVA included (MXN cents)',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `gender_restriction` enum('any','male','female') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'any',
  `min_age` tinyint unsigned DEFAULT NULL,
  `max_age` tinyint unsigned DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `waitlist_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `registration_opens_at` datetime DEFAULT NULL,
  `registration_closes_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_event_categories_event` (`event_id`),
  UNIQUE KEY `uk_event_categories_public_uuid` (`public_uuid`),
  KEY `idx_event_categories_active_price` (`event_id`,`is_active`,`price_cents`),
  CONSTRAINT `fk_event_categories_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_extras`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_extras` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'IVA included MXN cents',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `image_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_type` enum('merch','addon','folio','service','experience','custom') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom',
  `max_per_athlete` tinyint unsigned NOT NULL DEFAULT '1',
  `capacity` int unsigned DEFAULT NULL,
  `sold_count` int unsigned NOT NULL DEFAULT '0',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `scope_type` enum('all_categories','selected_categories') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all_categories',
  `sales_opens_at` datetime DEFAULT NULL,
  `sales_closes_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_event_extras_public_uuid` (`public_uuid`),
  KEY `idx_event_extras_event` (`event_id`),
  KEY `idx_event_extras_active` (`event_id`,`is_active`,`sort_order`),
  CONSTRAINT `fk_event_extras_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_extra_categories`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_extra_categories` (
  `event_extra_id` int unsigned NOT NULL,
  `event_category_id` int unsigned NOT NULL,
  PRIMARY KEY (`event_extra_id`,`event_category_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_event_extra_categories_category` (`event_category_id`),
  CONSTRAINT `fk_event_extra_categories_extra` FOREIGN KEY (`event_extra_id`) REFERENCES `event_extras` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_extra_categories_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_extra_fields`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_extra_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_extra_id` int unsigned NOT NULL,
  `field_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_type` enum('text','textarea','select','checkbox','number','date') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `field_kind` enum('standard','mx_shipping_block') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `options_json` json DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_event_extra_field_key` (`event_extra_id`,`field_key`),
  KEY `idx_event_extra_fields_extra` (`event_extra_id`,`sort_order`),
  CONSTRAINT `fk_event_extra_fields_extra` FOREIGN KEY (`event_extra_id`) REFERENCES `event_extras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_registration_fields`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_registration_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `field_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_type` enum('text','textarea','select','checkbox','number','date','file') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `options_json` json DEFAULT NULL COMMENT 'For select/checkbox options',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `validation_rules_json` json DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `scope_type` enum('all_categories','selected_categories') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all_categories',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_event_field_key` (`event_id`,`field_key`),
  CONSTRAINT `fk_event_reg_fields_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_registration_field_categories`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_registration_field_categories` (
  `event_registration_field_id` int unsigned NOT NULL,
  `event_category_id` int unsigned NOT NULL,
  PRIMARY KEY (`event_registration_field_id`,`event_category_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_event_reg_field_categories_category` (`event_category_id`),
  CONSTRAINT `fk_event_reg_field_categories_field` FOREIGN KEY (`event_registration_field_id`) REFERENCES `event_registration_fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_reg_field_categories_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_results`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_results` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `registration_id` int unsigned NOT NULL,
  `event_category_id` int unsigned NOT NULL,
  `overall_rank` int unsigned DEFAULT NULL,
  `category_rank` int unsigned DEFAULT NULL,
  `gender_rank` int unsigned DEFAULT NULL,
  `finish_time_ms` int unsigned DEFAULT NULL COMMENT 'Finish time in milliseconds',
  `status` enum('finished','dnf','dns','dq') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'finished',
  `pace_per_km_ms` int unsigned DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_event_results_registration` (`registration_id`),
  KEY `idx_event_results_event` (`event_id`),
  KEY `idx_event_results_category` (`event_category_id`),
  CONSTRAINT `fk_event_results_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_results_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_results_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_schedule_waves`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_schedule_waves` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `event_category_id` int unsigned DEFAULT NULL COMMENT 'Null = applies to all categories',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_at` datetime NOT NULL,
  `capacity` int unsigned DEFAULT NULL,
  `registered_count` int unsigned NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_schedule_waves_event` (`event_id`,`starts_at`),
  KEY `fk_schedule_waves_category` (`event_category_id`),
  CONSTRAINT `fk_schedule_waves_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedule_waves_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_sponsors`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_sponsors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tier` enum('title','gold','silver','bronze','partner') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'partner',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_event_sponsors_event` (`event_id`,`sort_order`),
  CONSTRAINT `fk_event_sponsors_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sponsor_analytics_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sponsor_analytics_events` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_sponsor_id` int unsigned NOT NULL,
  `event_id` int unsigned NOT NULL,
  `event_type` enum('impression','click') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_sponsor_analytics_sponsor` (`event_sponsor_id`,`event_type`),
  KEY `idx_sponsor_analytics_event` (`event_id`),
  CONSTRAINT `fk_sponsor_analytics_sponsor` FOREIGN KEY (`event_sponsor_id`) REFERENCES `event_sponsors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sponsor_analytics_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_tags`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_tags` (
  `event_id` int unsigned NOT NULL,
  `tag_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`,`tag_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_event_tags_tag` (`tag_id`),
  CONSTRAINT `fk_event_tags_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_waivers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_waivers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CDN URL for PDF responsiva',
  `content_type` enum('html','pdf','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'html',
  `audience` enum('all','adult','minor') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT 'all=everyone; adult=age>=18 on event start; minor=age<18',
  `category_ids` json DEFAULT NULL COMMENT 'NULL or [] = all categories; else array of event_categories.id',
  `version` int unsigned NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_event_waivers_event` (`event_id`),
  CONSTRAINT `fk_event_waivers_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `geo_states`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `geo_states` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `country` char(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MX',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_geo_states_country_code` (`country`,`code`),
  KEY `idx_geo_states_country_active` (`country`,`is_active`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `geo_cities`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `geo_cities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `state_id` int unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cvegeo` char(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'INEGI clave geoestadística (state+mun)',
  `cve_ent` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'INEGI entidad federativa 01-32',
  `cve_mun` char(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'INEGI municipio 001-999',
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'seed' COMMENT 'seed | inegi | manual',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_geo_cities_state_name` (`state_id`,`name`),
  UNIQUE KEY `uk_geo_cities_cvegeo` (`cvegeo`),
  KEY `idx_geo_cities_state_active` (`state_id`,`is_active`),
  KEY `idx_geo_cities_source` (`source`),
  CONSTRAINT `fk_geo_cities_state` FOREIGN KEY (`state_id`) REFERENCES `geo_states` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `sport_type_id` int unsigned NOT NULL,
  `venue_id` int unsigned DEFAULT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subdomain` varchar(63) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Vanity host label for {subdomain}.<PUBLIC_APP_URL apex>; immutable; globally unique',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_keywords` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','pending_approval','published','cancelled','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `submitted_for_approval_at` datetime DEFAULT NULL,
  `approval_rejection_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visibility` enum('public','private','unlisted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `registration_opens_at` datetime DEFAULT NULL,
  `registration_closes_at` datetime DEFAULT NULL,
  `check_in_opens_at` datetime DEFAULT NULL,
  `check_in_closes_at` datetime DEFAULT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Mexico_City',
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_country` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MX',
  `location_lat` decimal(10,7) DEFAULT NULL,
  `location_lng` decimal(10,7) DEFAULT NULL,
  `hero_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banner_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_fee_percent` decimal(5,2) DEFAULT NULL COMMENT 'Override organizer default; null = use organizer default',
  `fee_presentation` enum('pass_through','absorb_all') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL = inherit organizer.fee_presentation',
  `msi_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'When 1, Stripe checkout can offer MSI 3/6/9; Platform fee uplifts only if athlete selects a plan',
  `manual_sales_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'When 1, staff may record cash manual sales (provider=manual) for this event',
  `allows_transfers` tinyint(1) NOT NULL DEFAULT '0',
  `transfer_fee_cents` int unsigned NOT NULL DEFAULT '0',
  `requires_waiver` tinyint(1) NOT NULL DEFAULT '1',
  `max_registrations` int unsigned DEFAULT NULL,
  `max_registrations_per_order` int unsigned NOT NULL DEFAULT '10' COMMENT 'Max tickets per single checkout (organizer configurable)',
  `bib_mode` enum('folio','separate') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'folio' COMMENT 'folio: registration_number is also bib_number at checkout; separate: staff assigns bib later',
  `auto_deactivate_after_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 = after event day ends, set visibility=unlisted (hide from marketplace)',
  `is_simulation` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = organizer simulation; never marketplace-listed',
  `simulation_access_token` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Opaque token for gated sim checkout URL',
  `simulation_expires_at` datetime DEFAULT NULL COMMENT 'Wipe generated data after this (3d from last activity)',
  `simulation_last_activity_at` datetime DEFAULT NULL COMMENT 'Last checkout/reg/reset activity',
  `cloned_from_event_id` int unsigned DEFAULT NULL COMMENT 'Source event when cloned into a simulation',
  `registration_count` int unsigned NOT NULL DEFAULT '0',
  `resend_confirmed_segment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Resend segment for confirmed registrants',
  `version` int unsigned NOT NULL DEFAULT '1' COMMENT 'Optimistic locking',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_events_organizer_slug` (`organizer_id`,`slug`),
  KEY `idx_events_status` (`status`),
  KEY `idx_events_start_date` (`start_date`),
  KEY `idx_events_sport` (`sport_type_id`),
  UNIQUE KEY `uk_events_public_uuid` (`public_uuid`),
  UNIQUE KEY `uk_events_slug_global` (`slug`),
  UNIQUE KEY `uk_events_subdomain` (`subdomain`),
  UNIQUE KEY `uk_events_simulation_token` (`simulation_access_token`),
  KEY `idx_events_marketplace` (`status`,`visibility`,`start_date`),
  KEY `idx_events_featured` (`featured`,`start_date`),
  KEY `idx_events_city` (`location_city`,`location_country`),
  KEY `idx_events_organizer_status` (`organizer_id`,`status`),
  KEY `idx_events_simulation_expiry` (`is_simulation`,`simulation_expires_at`),
  KEY `idx_events_deleted` (`deleted_at`),
  KEY `fk_events_venue` (`venue_id`),
  CONSTRAINT `fk_events_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_events_sport_type` FOREIGN KEY (`sport_type_id`) REFERENCES `sport_types` (`id`),
  CONSTRAINT `fk_events_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_courses`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_courses` (
  `event_id` int unsigned NOT NULL,
  `route_geojson` json NOT NULL COMMENT 'GeoJSON LineString or Feature',
  `points_json` json NOT NULL COMMENT 'Array of {type,name,lat,lng,km,description}',
  `distance_km` decimal(8,3) DEFAULT NULL,
  `elevation_gain_m` int unsigned DEFAULT NULL,
  `elevation_profile_json` json DEFAULT NULL COMMENT 'Array of {km, elevation_m}',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`) /*T![clustered_index] CLUSTERED */,
  CONSTRAINT `fk_event_courses_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_requests`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `athlete_id` int unsigned NOT NULL,
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_regime` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cfdi_use` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postal_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','processing','issued','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `organizer_cfdi_uuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CFDI for registration (organizer)',
  `platform_cfdi_uuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CFDI for service fee (platform)',
  `organizer_pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organizer_xml_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform_pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform_xml_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `issued_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_invoice_requests_payment` (`payment_id`),
  KEY `idx_invoice_requests_athlete` (`athlete_id`),
  KEY `idx_invoice_requests_status` (`status`),
  CONSTRAINT `fk_invoice_requests_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
  CONSTRAINT `fk_invoice_requests_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `media_assets`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_assets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` enum('event','organizer','athlete','venue','sponsor') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int unsigned NOT NULL,
  `asset_type` enum('hero','banner','logo','gallery','document','route_map','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alt_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size_bytes` int unsigned DEFAULT NULL,
  `width_px` int unsigned DEFAULT NULL,
  `height_px` int unsigned DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_media_public_uuid` (`public_uuid`),
  KEY `idx_media_entity` (`entity_type`,`entity_id`,`asset_type`),
  KEY `idx_media_primary` (`entity_type`,`entity_id`,`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_broadcast_audience`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_broadcast_audience` (
  `event_id` int unsigned NOT NULL,
  `athlete_id` int unsigned NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `in_resend_segment` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`,`athlete_id`),
  KEY `idx_eba_event_email` (`event_id`,`email`),
  CONSTRAINT `fk_eba_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eba_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_broadcasts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_broadcasts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `created_by_member_id` int unsigned DEFAULT NULL,
  `created_by_admin_id` int unsigned DEFAULT NULL,
  `audience_type` enum('confirmed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `rendered_html` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_display` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resend_broadcast_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resend_segment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','scheduled','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `send_mode` enum('now','scheduled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'now',
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `recipient_count` int unsigned NOT NULL DEFAULT '0',
  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_broadcasts_public_uuid` (`public_uuid`),
  KEY `idx_event_broadcasts_event` (`event_id`,`created_at`),
  KEY `idx_event_broadcasts_status` (`status`,`scheduled_at`),
  CONSTRAINT `fk_event_broadcasts_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_broadcasts_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_queue`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_queue` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `recipient_type` enum('athlete','organizer_member','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_id` int unsigned NOT NULL,
  `channel` enum('email','sms','push') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `to_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `scheduled_for` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` datetime DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_notification_queue_status` (`status`,`scheduled_for`),
  KEY `idx_notification_queue_recipient` (`recipient_type`,`recipient_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_members`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_members` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('owner','organizer','marketing','finance','timing','operations','sponsor','seller') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'organizer',
  `event_access_scope` enum('organization','events') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'organization',
  `status` enum('invited','active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'invited',
  `invited_at` datetime DEFAULT NULL,
  `invited_by_member_id` int unsigned DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_language` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `preferred_theme` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'UI theme: light | dark | system',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_organizer_member_email` (`organizer_id`,`email`),
  KEY `idx_organizer_members_organizer` (`organizer_id`),
  KEY `idx_organizer_members_status` (`status`),
  UNIQUE KEY `uk_organizer_members_public_uuid` (`public_uuid`),
  KEY `idx_organizer_members_email` (`email`),
  KEY `idx_organizer_members_deleted` (`deleted_at`),
  CONSTRAINT `fk_organizer_members_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_member_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_member_events` (
  `organizer_member_id` int unsigned NOT NULL,
  `event_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`organizer_member_id`,`event_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_organizer_member_events_event` (`event_id`),
  CONSTRAINT `fk_organizer_member_events_member` FOREIGN KEY (`organizer_member_id`) REFERENCES `organizer_members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_organizer_member_events_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_otp_codes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_otp_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_member_id` int unsigned NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('login','email_verify') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_organizer_otp_member` (`organizer_member_id`),
  KEY `idx_organizer_otp_expires` (`expires_at`),
  KEY `idx_organizer_otp_lookup` (`organizer_member_id`,`purpose`,`expires_at`),
  CONSTRAINT `fk_organizer_otp_member` FOREIGN KEY (`organizer_member_id`) REFERENCES `organizer_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_member_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_organizer_sessions_member` (`organizer_member_id`),
  KEY `idx_organizer_sessions_expires` (`expires_at`),
  UNIQUE KEY `token_hash` (`token_hash`),
  CONSTRAINT `fk_organizer_sessions_member` FOREIGN KEY (`organizer_member_id`) REFERENCES `organizer_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_settings`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `setting_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_organizer_setting` (`organizer_id`,`setting_key`),
  CONSTRAINT `fk_organizer_settings_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `billing_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MX',
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','active','suspended','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `stripe_account_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe Connect account ID',
  `stripe_onboarding_complete` tinyint(1) NOT NULL DEFAULT '0',
  `stripe_connect_status` enum('not_started','pending','action_required','ready','restricted','disabled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  `stripe_charges_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `stripe_payouts_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `stripe_details_submitted` tinyint(1) NOT NULL DEFAULT '0',
  `stripe_connect_onboarded_at` datetime DEFAULT NULL,
  `stripe_connect_last_synced_at` datetime DEFAULT NULL,
  `stripe_connect_onboarding_mode` enum('self','admin') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payout_terms_accepted_at` datetime DEFAULT NULL,
  `payout_fee_acknowledged_at` datetime DEFAULT NULL,
  `service_fee_percent` decimal(5,2) NOT NULL DEFAULT '11.00' COMMENT 'Platform service fee % (IVA included in display)',
  `fee_presentation` enum('pass_through','absorb_all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pass_through' COMMENT 'pass_through: athlete pays fee on top; absorb_all: list price is final sticker',
  `payout_rail` enum('stripe','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe' COMMENT 'Preferred checkout/payout rail',
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mexican tax ID for invoicing',
  `tax_regime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_organizers_status` (`status`),
  KEY `idx_organizers_stripe` (`stripe_account_id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `uk_organizers_public_uuid` (`public_uuid`),
  KEY `idx_organizers_city` (`city`,`country`),
  KEY `idx_organizers_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_payout_accounts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_payout_accounts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `nickname` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `holder_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clabe_enc` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `clabe_last4` char(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clabe_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SHA-256 hex for duplicate detection',
  `bank_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `person_type` enum('persona_fisica','persona_moral') COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_regime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `curp` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_street` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_ext_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_int_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_neighborhood` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_municipality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_postal_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `constancia_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_statement_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('draft','submitted','verified','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `rejection_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locked_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verified_by_admin_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_opa_organizer` (`organizer_id`),
  KEY `idx_opa_org_status` (`organizer_id`,`status`),
  KEY `idx_opa_clabe_hash` (`organizer_id`,`clabe_hash`),
  CONSTRAINT `fk_opa_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizer_payout_account_clabe_reveals`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizer_payout_account_clabe_reveals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `payout_account_id` int unsigned NOT NULL,
  `admin_id` int unsigned NOT NULL,
  `clabe_last4` char(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_opa_reveal_account` (`payout_account_id`),
  KEY `idx_opa_reveal_admin` (`admin_id`),
  KEY `idx_opa_reveal_org_created` (`organizer_id`,`created_at`),
  CONSTRAINT `fk_opa_reveal_account` FOREIGN KEY (`payout_account_id`) REFERENCES `organizer_payout_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_opa_reveal_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_refunds`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_refunds` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `amount_cents` int unsigned NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','succeeded','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `provider` enum('stripe','mock','mercadopago','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe',
  `stripe_refund_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mercadopago_refund_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by_type` enum('athlete','organizer_member','admin','system') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by_id` int unsigned DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_payment_refunds_payment` (`payment_id`),
  KEY `idx_payment_refunds_stripe` (`stripe_refund_id`),
  CONSTRAINT `fk_payment_refunds_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_spei_settlements`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_spei_settlements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `event_id` int unsigned DEFAULT NULL,
  `amount_cents` int unsigned NOT NULL COMMENT 'registration_amount_cents portion for organizer',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `status` enum('pending','sent','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payout_account_id` int unsigned DEFAULT NULL,
  `marked_sent_by_admin_id` int unsigned DEFAULT NULL,
  `marked_sent_at` datetime DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_pss_payment` (`payment_id`),
  KEY `idx_pss_organizer_status` (`organizer_id`,`status`),
  KEY `idx_pss_status_created` (`status`,`created_at`),
  CONSTRAINT `fk_pss_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pss_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`),
  CONSTRAINT `fk_pss_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pss_payout_account` FOREIGN KEY (`payout_account_id`) REFERENCES `organizer_payout_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pss_marked_sent_admin` FOREIGN KEY (`marked_sent_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotency_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registration_id` int unsigned DEFAULT NULL,
  `athlete_id` int unsigned NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `event_id` int unsigned DEFAULT NULL,
  `amount_cents` int unsigned NOT NULL COMMENT 'Total charged to participant',
  `registration_amount_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'Portion for organizer (inscription)',
  `service_fee_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'Platform service fee',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `status` enum('pending','processing','succeeded','failed','refunded','partially_refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `failure_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider` enum('stripe','mock','manual','mercadopago') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe',
  `recorded_by_member_id` int unsigned DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripe_charge_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripe_transfer_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Transfer to organizer Connect account',
  `stripe_application_fee_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mercadopago_payment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mercadopago_preference_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_simulation` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_payments_registration` (`registration_id`),
  KEY `idx_payments_athlete` (`athlete_id`),
  KEY `idx_payments_organizer` (`organizer_id`),
  KEY `idx_payments_event` (`event_id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_stripe_pi` (`stripe_payment_intent_id`),
  UNIQUE KEY `uk_payments_public_uuid` (`public_uuid`),
  UNIQUE KEY `uk_payments_idempotency` (`idempotency_key`),
  UNIQUE KEY `uk_payments_stripe_pi` (`stripe_payment_intent_id`),
  KEY `idx_payments_created` (`created_at`),
  KEY `idx_payments_event_status` (`event_id`,`status`),
  KEY `idx_payments_simulation` (`is_simulation`,`event_id`),
  KEY `fk_payments_recorded_by_member` (`recorded_by_member_id`),
  CONSTRAINT `fk_payments_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`),
  CONSTRAINT `fk_payments_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`),
  CONSTRAINT `fk_payments_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_recorded_by_member` FOREIGN KEY (`recorded_by_member_id`) REFERENCES `organizer_members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_orders`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `purchaser_athlete_id` int unsigned NOT NULL,
  `payment_id` int unsigned DEFAULT NULL,
  `status` enum('pending','confirmed','cancelled','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `item_count` tinyint unsigned NOT NULL,
  `subtotal_cents` int unsigned NOT NULL DEFAULT '0',
  `service_fee_cents` int unsigned NOT NULL DEFAULT '0',
  `discount_code_id` int unsigned DEFAULT NULL,
  `discount_amount_cents` int unsigned NOT NULL DEFAULT '0',
  `total_cents` int unsigned NOT NULL DEFAULT '0',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_simulation` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_registration_orders_public_uuid` (`public_uuid`),
  KEY `idx_registration_orders_event` (`event_id`),
  KEY `idx_registration_orders_purchaser` (`purchaser_athlete_id`),
  KEY `idx_registration_orders_payment` (`payment_id`),
  CONSTRAINT `fk_registration_orders_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registration_orders_purchaser` FOREIGN KEY (`purchaser_athlete_id`) REFERENCES `athletes` (`id`),
  CONSTRAINT `fk_registration_orders_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_registration_orders_discount` FOREIGN KEY (`discount_code_id`) REFERENCES `discount_codes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_field_values`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_field_values` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` int unsigned NOT NULL,
  `field_id` int unsigned NOT NULL,
  `value_text` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_reg_field_value` (`registration_id`,`field_id`),
  KEY `fk_reg_field_values_field` (`field_id`),
  CONSTRAINT `fk_reg_field_values_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reg_field_values_field` FOREIGN KEY (`field_id`) REFERENCES `event_registration_fields` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_status_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` int unsigned NOT NULL,
  `from_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_type` enum('athlete','organizer_member','admin','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `actor_id` int unsigned DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_reg_status_hist_registration` (`registration_id`,`created_at`),
  CONSTRAINT `fk_reg_status_hist_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_transfers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_transfers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` int unsigned NOT NULL,
  `from_athlete_id` int unsigned NOT NULL,
  `to_athlete_id` int unsigned NOT NULL,
  `transfer_fee_cents` int unsigned NOT NULL DEFAULT '0',
  `status` enum('pending','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_id` int unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_reg_transfers_registration` (`registration_id`),
  KEY `fk_reg_transfers_from` (`from_athlete_id`),
  KEY `fk_reg_transfers_to` (`to_athlete_id`),
  KEY `fk_reg_transfers_payment` (`payment_id`),
  CONSTRAINT `fk_reg_transfers_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reg_transfers_from` FOREIGN KEY (`from_athlete_id`) REFERENCES `athletes` (`id`),
  CONSTRAINT `fk_reg_transfers_to` FOREIGN KEY (`to_athlete_id`) REFERENCES `athletes` (`id`),
  CONSTRAINT `fk_reg_transfers_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_waiver_signatures`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_waiver_signatures` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` int unsigned NOT NULL,
  `waiver_id` int unsigned NOT NULL,
  `waiver_version_at_sign` int unsigned DEFAULT NULL,
  `signed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_data` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Base64 signature image or typed name',
  `acceptance_pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CDN URL of stamped acceptance certificate PDF',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_waiver_sigs_registration` (`registration_id`),
  UNIQUE KEY `uk_waiver_sig_registration_waiver` (`registration_id`,`waiver_id`),
  KEY `fk_waiver_sigs_waiver` (`waiver_id`),
  CONSTRAINT `fk_waiver_sigs_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waiver_sigs_waiver` FOREIGN KEY (`waiver_id`) REFERENCES `event_waivers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_folio_segments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_folio_segments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `category_scope` enum('all_categories','selected_categories') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all_categories',
  `coupon_scope` enum('any','none','any_coupon','specific_coupon') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'any',
  `discount_code_id` int unsigned DEFAULT NULL,
  `counter_scope` enum('segment','event','category') COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix_value` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `category_code` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `pattern_tokens` json NOT NULL,
  `seq_padding` tinyint unsigned NOT NULL DEFAULT 5,
  `start_number` int unsigned NOT NULL DEFAULT 1,
  `end_number` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_folio_segments_event` (`event_id`,`sort_order`),
  KEY `fk_folio_segments_discount` (`discount_code_id`),
  CONSTRAINT `fk_folio_segments_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_folio_segments_discount` FOREIGN KEY (`discount_code_id`) REFERENCES `discount_codes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_folio_segment_categories`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_folio_segment_categories` (
  `folio_segment_id` int unsigned NOT NULL,
  `event_category_id` int unsigned NOT NULL,
  PRIMARY KEY (`folio_segment_id`,`event_category_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_folio_seg_cat_category` (`event_category_id`),
  CONSTRAINT `fk_folio_seg_cat_segment` FOREIGN KEY (`folio_segment_id`) REFERENCES `event_folio_segments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_folio_seg_cat_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_folio_counters`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_folio_counters` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `counter_scope` enum('segment','event','category') COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_issued_number` int unsigned NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_folio_counter` (`event_id`,`counter_scope`,`scope_key`),
  CONSTRAINT `fk_folio_counters_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registrations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `event_category_id` int unsigned NOT NULL,
  `athlete_id` int unsigned NOT NULL,
  `registration_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `folio_segment_id` int unsigned DEFAULT NULL,
  `qr_code_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bib_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending_payment','confirmed','cancelled','transferred','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_payment',
  `price_cents` int unsigned NOT NULL COMMENT 'Category price at time of registration',
  `service_fee_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'Platform service fee IVA included',
  `total_cents` int unsigned NOT NULL,
  `discount_code_id` int unsigned DEFAULT NULL,
  `schedule_wave_id` int unsigned DEFAULT NULL,
  `source` enum('web','mobile','admin','api','transfer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `payment_id` int unsigned DEFAULT NULL,
  `order_id` int unsigned DEFAULT NULL COMMENT 'Group order when purchased with others',
  `purchaser_athlete_id` int unsigned DEFAULT NULL COMMENT 'Who paid (may differ from athlete_id)',
  `guest_claim_token` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Guest invite to claim account',
  `waiver_signed_at` datetime DEFAULT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `is_simulation` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_registrations_number` (`event_id`,`registration_number`),
  KEY `idx_registrations_athlete` (`athlete_id`),
  KEY `idx_registrations_event` (`event_id`),
  KEY `idx_registrations_status` (`status`),
  UNIQUE KEY `qr_code_token` (`qr_code_token`),
  KEY `fk_registrations_category` (`event_category_id`),
  KEY `fk_registrations_payment` (`payment_id`),
  KEY `idx_registrations_order` (`order_id`),
  KEY `idx_registrations_purchaser` (`purchaser_athlete_id`),
  UNIQUE KEY `uk_registrations_guest_claim` (`guest_claim_token`),
  UNIQUE KEY `uk_registrations_public_uuid` (`public_uuid`),
  KEY `idx_registrations_event_status` (`event_id`,`status`),
  KEY `idx_registrations_category_status` (`event_category_id`,`status`),
  KEY `idx_registrations_created` (`created_at`),
  KEY `idx_registrations_deleted` (`deleted_at`),
  KEY `idx_registrations_simulation` (`is_simulation`,`event_id`),
  KEY `fk_registrations_discount` (`discount_code_id`),
  KEY `fk_registrations_wave` (`schedule_wave_id`),
  KEY `fk_registrations_folio_segment` (`folio_segment_id`),
  CONSTRAINT `fk_registrations_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registrations_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`),
  CONSTRAINT `fk_registrations_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`),
  CONSTRAINT `fk_registrations_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_registrations_order` FOREIGN KEY (`order_id`) REFERENCES `registration_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_registrations_purchaser` FOREIGN KEY (`purchaser_athlete_id`) REFERENCES `athletes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_registrations_discount` FOREIGN KEY (`discount_code_id`) REFERENCES `discount_codes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_registrations_wave` FOREIGN KEY (`schedule_wave_id`) REFERENCES `event_schedule_waves` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_registrations_folio_segment` FOREIGN KEY (`folio_segment_id`) REFERENCES `event_folio_segments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_extras`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_extras` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` int unsigned NOT NULL,
  `event_extra_id` int unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` tinyint unsigned NOT NULL DEFAULT '1',
  `unit_price_cents` int unsigned NOT NULL,
  `total_cents` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_registration_extras_registration` (`registration_id`),
  KEY `idx_registration_extras_extra` (`event_extra_id`),
  CONSTRAINT `fk_registration_extras_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registration_extras_extra` FOREIGN KEY (`event_extra_id`) REFERENCES `event_extras` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registration_extra_field_values`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_extra_field_values` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `registration_extra_id` int unsigned NOT NULL,
  `field_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_text` text COLLATE utf8mb4_unicode_ci,
  `value_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_reg_extra_field_values_line` (`registration_extra_id`),
  CONSTRAINT `fk_reg_extra_field_values_line` FOREIGN KEY (`registration_extra_id`) REFERENCES `registration_extras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_splits`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_splits` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `result_id` int unsigned NOT NULL,
  `split_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `split_order` int NOT NULL DEFAULT '0',
  `distance_km` decimal(8,2) DEFAULT NULL,
  `elapsed_ms` int unsigned NOT NULL COMMENT 'Elapsed time at split in ms',
  `pace_per_km_ms` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_result_splits_result` (`result_id`),
  CONSTRAINT `fk_result_splits_result` FOREIGN KEY (`result_id`) REFERENCES `event_results` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sport_types`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_sport_types_active` (`is_active`,`sort_order`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=2000001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stripe_webhook_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stripe_webhook_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stripe_event_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_json` json NOT NULL,
  `status` enum('received','processing','processed','failed','ignored') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'received',
  `error_message` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_stripe_event_id` (`stripe_event_id`),
  KEY `idx_stripe_webhooks_status` (`status`,`created_at`),
  KEY `idx_stripe_webhooks_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('distance','terrain','audience','feature','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_tags_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `venues`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venues` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` char(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MX',
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Mexico_City',
  `capacity` int unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_venues_public_uuid` (`public_uuid`),
  KEY `idx_venues_city_country` (`city`,`country`),
  KEY `idx_venues_geo` (`lat`,`lng`),
  KEY `idx_venues_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `waitlist_batches`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waitlist_batches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `purchaser_athlete_id` int unsigned NOT NULL,
  `status` enum('pending','partial','complete','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_waitlist_batches_public_uuid` (`public_uuid`),
  KEY `idx_waitlist_batches_event` (`event_id`),
  KEY `idx_waitlist_batches_purchaser` (`purchaser_athlete_id`),
  CONSTRAINT `fk_waitlist_batches_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waitlist_batches_purchaser` FOREIGN KEY (`purchaser_athlete_id`) REFERENCES `athletes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `waitlist_entries`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waitlist_entries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int unsigned NOT NULL,
  `event_category_id` int unsigned NOT NULL,
  `athlete_id` int unsigned NOT NULL,
  `status` enum('waiting','offered','converted','expired','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `position` int unsigned NOT NULL DEFAULT '1',
  `offered_at` datetime DEFAULT NULL,
  `offer_expires_at` datetime DEFAULT NULL,
  `converted_registration_id` int unsigned DEFAULT NULL,
  `batch_id` int unsigned DEFAULT NULL,
  `participant_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Guest email when not athlete account',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_waitlist_athlete_category` (`event_category_id`,`athlete_id`),
  KEY `idx_waitlist_event_status` (`event_id`,`status`,`position`),
  KEY `fk_waitlist_athlete` (`athlete_id`),
  KEY `fk_waitlist_registration` (`converted_registration_id`),
  KEY `idx_waitlist_batch` (`batch_id`),
  CONSTRAINT `fk_waitlist_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waitlist_category` FOREIGN KEY (`event_category_id`) REFERENCES `event_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waitlist_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waitlist_registration` FOREIGN KEY (`converted_registration_id`) REFERENCES `registrations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_waitlist_batch` FOREIGN KEY (`batch_id`) REFERENCES `waitlist_batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_settings`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` mediumtext COLLATE utf8mb4_unicode_ci,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uk_system_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;






/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-30 21:55:49

-- Atleita white-label additions
-- Atleita white-label: organizer microsites, theme, sections, legal, email templates
-- Fresh TiDB schema companion migration (apply after base athlete-hub tables exist).

CREATE TABLE IF NOT EXISTS `organizer_sites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `subdomain` varchar(63) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','published','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `template_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general_v1',
  `locale_default` enum('es','en') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_sites_organizer` (`organizer_id`),
  UNIQUE KEY `uk_organizer_sites_subdomain` (`subdomain`),
  KEY `idx_organizer_sites_status` (`status`),
  CONSTRAINT `fk_organizer_sites_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizer_site_themes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_site_id` int unsigned NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favicon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hero_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#214B3A',
  `secondary_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#18231F',
  `accent_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#D7ED70',
  `background_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#F7F9F6',
  `text_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#18231F',
  `font_family` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Archivo, system-ui, sans-serif',
  `button_radius_px` smallint unsigned NOT NULL DEFAULT 10,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_site_themes_site` (`organizer_site_id`),
  CONSTRAINT `fk_organizer_site_themes_site` FOREIGN KEY (`organizer_site_id`) REFERENCES `organizer_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizer_site_sections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_site_id` int unsigned NOT NULL,
  `section_key` enum('hero','about','upcoming_events','sponsors','faq','footer_links') COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` smallint unsigned NOT NULL DEFAULT 0,
  `content_json` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_site_sections` (`organizer_site_id`,`section_key`),
  CONSTRAINT `fk_organizer_site_sections_site` FOREIGN KEY (`organizer_site_id`) REFERENCES `organizer_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizer_site_legal_documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_site_id` int unsigned NOT NULL,
  `document_key` enum('terms','privacy','refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `locale` enum('es','en') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_site_legal` (`organizer_site_id`,`document_key`,`locale`),
  CONSTRAINT `fk_organizer_site_legal_site` FOREIGN KEY (`organizer_site_id`) REFERENCES `organizer_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform defaults + organizer/event overrides for athlete-facing + broadcast emails.
-- OTP templates are platform-owned; only chrome (logo/colors) may be injected at send time.
CREATE TABLE IF NOT EXISTS `email_template_definitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `audience` enum('athlete','organizer','admin','broadcast') COLLATE utf8mb4_unicode_ci NOT NULL,
  `editable_by_organizer` tinyint(1) NOT NULL DEFAULT 0,
  `supports_event_override` tinyint(1) NOT NULL DEFAULT 0,
  `required_tokens_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_template_definitions_key` (`template_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `scope` enum('platform','organizer','event') COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer_id` int unsigned DEFAULT NULL,
  `event_id` int unsigned DEFAULT NULL,
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locale` enum('es','en') COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `preheader` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by_type` enum('admin','organizer') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_templates_scope` (`scope`,`organizer_id`,`event_id`,`template_key`,`locale`),
  KEY `idx_email_templates_org` (`organizer_id`,`template_key`),
  KEY `idx_email_templates_event` (`event_id`,`template_key`),
  CONSTRAINT `fk_email_templates_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_templates_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `email_template_definitions`
  (`template_key`, `audience`, `editable_by_organizer`, `supports_event_override`, `required_tokens_json`)
VALUES
  ('otp_login', 'athlete', 0, 0, JSON_ARRAY('code', 'minutes', 'organizer_name', 'powered_by')),
  ('otp_register', 'athlete', 0, 0, JSON_ARRAY('code', 'minutes', 'organizer_name', 'powered_by')),
  ('welcomeAthlete', 'athlete', 1, 0, JSON_ARRAY('first_name', 'cta_url')),
  ('registrationConfirmed', 'athlete', 1, 1, JSON_ARRAY('first_name', 'event_name', 'folio', 'cta_url')),
  ('waiverAcceptanceUpdated', 'athlete', 1, 1, JSON_ARRAY('first_name', 'event_name')),
  ('groupOrderSummary', 'athlete', 1, 1, JSON_ARRAY('first_name', 'event_name', 'total')),
  ('eventBroadcast', 'broadcast', 1, 1, JSON_ARRAY('first_name', 'event_name', 'body'))
ON DUPLICATE KEY UPDATE
  `editable_by_organizer` = VALUES(`editable_by_organizer`),
  `supports_event_override` = VALUES(`supports_event_override`);


-- SEO CRM - MySQL Database Setup Script
-- Совместимо с MySQL 5.7+ / MariaDB 10.2+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Удаление существующих таблиц (если есть)
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `sites`;
DROP TABLE IF EXISTS `task_templates`;
DROP TABLE IF EXISTS `managers`;

-- Таблица менеджеров
CREATE TABLE `managers` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `name` VARCHAR(255) NOT NULL,
    `telegram` VARCHAR(255) DEFAULT NULL,
    `comment` TEXT DEFAULT NULL,
    `position` INT DEFAULT 0,
    `deleted_at` DATETIME DEFAULT NULL,
    INDEX `idx_managers_deleted` (`deleted_at`),
    INDEX `idx_managers_position` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица шаблонов задач
CREATE TABLE `task_templates` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `title` VARCHAR(255) NOT NULL,
    `order` INT DEFAULT 0,
    `position` INT DEFAULT 0,
    INDEX `idx_templates_position` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица сайтов
CREATE TABLE `sites` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `manager_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `comment` TEXT DEFAULT NULL,
    `position` INT DEFAULT 0,
    `deleted_at` DATETIME DEFAULT NULL,
    INDEX `idx_sites_manager_id` (`manager_id`),
    INDEX `idx_sites_deleted` (`deleted_at`),
    INDEX `idx_sites_position` (`position`),
    FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица задач
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `site_id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) DEFAULT NULL,
    `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
    `comment` TEXT DEFAULT NULL,
    `position` INT DEFAULT 0,
    `deleted_at` DATETIME DEFAULT NULL,
    INDEX `idx_tasks_site_id` (`site_id`),
    INDEX `idx_tasks_template_id` (`template_id`),
    INDEX `idx_tasks_deleted` (`deleted_at`),
    FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица логов аудита
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` CHAR(36) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `details` TEXT DEFAULT NULL,
    `user_name` VARCHAR(255) DEFAULT 'Пользователь',
    INDEX `idx_logs_created` (`created_at`),
    INDEX `idx_logs_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Начальные данные: шаблоны задач
INSERT INTO `task_templates` (`id`, `title`, `position`, `order`) VALUES
(UUID(), 'Яндекс поиск', 0, 0),
(UUID(), 'Яндекс ретаргетинг', 1, 1),
(UUID(), 'Гугл поиск', 2, 2),
(UUID(), 'Гугл ремаркетинг', 3, 3),
(UUID(), 'Доски объявлений', 4, 4),
(UUID(), 'Лайф Чат', 5, 5),
(UUID(), 'Рассылка', 6, 6),
(UUID(), 'Метрика', 7, 7),
(UUID(), 'Аналитика', 8, 8),
(UUID(), 'SEO', 9, 9);

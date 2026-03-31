<?php
/**
 * SEO CRM — конфигурация бд
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');
define('DB_CHARSET', 'utf8mb4');

// Пароль для входа в CRM
define('APP_PASSWORD', 'your_app_password');

// Режим отладки — false на production
define('DEBUG_MODE', false);

// CORS
define('CORS_ORIGIN', '*');
<?php
/**
 * SEO CRM - Audit Logs API
 * 
 * Endpoints:
 * GET  /api/logs.php  - Get recent audit logs
 * POST /api/logs.php  - Create new audit log entry
 */

// Clear OPcache for this file
if (function_exists('opcache_invalidate')) {
    opcache_invalidate(__FILE__, true);
}

require_once __DIR__ . '/db.php';

setApiHeaders();

try {
    $db = Database::getInstance();
} catch (Exception $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $limit = isset($_GET['limit']) ? min((int) $_GET['limit'], 100) : 50;

            $stmt = $db->prepare("
                SELECT * FROM audit_logs 
                ORDER BY created_at DESC 
                LIMIT :limit
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            jsonResponse($stmt->fetchAll());
            break;

        case 'POST':
            $data = getJsonInput();

            if (empty($data['entity_type']) || empty($data['entity_id']) || empty($data['action'])) {
                errorResponse('entity_type, entity_id, and action are required');
            }

            $uuid = Database::generateUUID();

            $stmt = $db->prepare("
                INSERT INTO audit_logs (id, entity_type, entity_id, action, details, user_name) 
                VALUES (:id, :entity_type, :entity_id, :action, :details, :user_name)
            ");

            $stmt->execute([
                'id' => $uuid,
                'entity_type' => $data['entity_type'],
                'entity_id' => $data['entity_id'],
                'action' => $data['action'],
                'details' => $data['details'] ?? null,
                'user_name' => $data['user_name'] ?? 'Пользователь'
            ]);

            jsonResponse(['success' => true, 'id' => $uuid], 201);
            break;

        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        errorResponse('Server error: ' . $e->getMessage(), 500);
    } else {
        errorResponse('Server error', 500);
    }
}

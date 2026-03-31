<?php
/**
 * SEO CRM - Trash and Restore API
 * 
 * GET  /api/trash.php       — All soft-deleted items
 * PUT  /api/trash.php?id=X  — Restore deleted item (set deleted_at to null)
 */

require_once __DIR__ . '/db.php';

setApiHeaders();

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$type = $_GET['type'] ?? null;

try {
    switch ($method) {
        case 'GET':
            $stmt = $db->query("
                SELECT 'manager' as type, id, name as title, deleted_at 
                FROM managers 
                WHERE deleted_at IS NOT NULL 
                ORDER BY deleted_at DESC
            ");
            $managers = $stmt->fetchAll();
            
            $stmt = $db->query("
                SELECT 'site' as type, s.id, s.url as title, s.deleted_at, m.name as manager_name
                FROM sites s
                LEFT JOIN managers m ON s.manager_id = m.id
                WHERE s.deleted_at IS NOT NULL 
                ORDER BY s.deleted_at DESC
            ");
            $sites = $stmt->fetchAll();
            
            $stmt = $db->query("
                SELECT 'task' as type, t.id, tt.title as title, t.deleted_at, s.url as site_url
                FROM tasks t
                LEFT JOIN task_templates tt ON t.template_id = tt.id
                LEFT JOIN sites s ON t.site_id = s.id
                WHERE t.deleted_at IS NOT NULL 
                ORDER BY t.deleted_at DESC
            ");
            $tasks = $stmt->fetchAll();
            
            jsonResponse([
                'managers' => $managers,
                'sites' => $sites,
                'tasks' => $tasks
            ]);
            break;
            
        case 'PUT':
            if (!$id || !$type) {
                errorResponse('id and type parameters are required');
            }
            
            $table = match ($type) {
                'manager', 'managers' => 'managers',
                'site', 'sites' => 'sites',
                'task', 'tasks' => 'tasks',
                default => null
            };

            if (!$table) {
                errorResponse('Invalid type. Must be manager, site, or task');
            }
            
            $stmt = $db->prepare("UPDATE {$table} SET deleted_at = NULL WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            jsonResponse(['success' => true, 'message' => 'Item restored']);
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

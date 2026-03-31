<?php
/**
 * SEO CRM - Unified Data API
 * 
 * GET /api/data.php — Full CRM tree in a single request (managers → sites → tasks).
 * Alternative endpoint for initial data load.
 */

require_once __DIR__ . '/db.php';

setApiHeaders();

$db = Database::getInstance();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $stmt = $db->query("
        SELECT * FROM managers 
        WHERE deleted_at IS NULL 
        ORDER BY position ASC
    ");
    $managers = $stmt->fetchAll();

    $stmt = $db->query("
        SELECT * FROM sites 
        WHERE deleted_at IS NULL 
        ORDER BY position ASC
    ");
    $sites = $stmt->fetchAll();

    $stmt = $db->query("
        SELECT t.*, 
               tt.id as tpl_id,
               tt.title as tpl_title,
               tt.position as tpl_position,
               tt.`order` as tpl_order
        FROM tasks t
        LEFT JOIN task_templates tt ON t.template_id = tt.id
        WHERE t.deleted_at IS NULL 
        ORDER BY COALESCE(tt.position, t.position) ASC
    ");
    $tasksRaw = $stmt->fetchAll();

    $tasksBySite = [];
    foreach ($tasksRaw as $task) {
        $siteId = $task['site_id'];
        if (!isset($tasksBySite[$siteId])) {
            $tasksBySite[$siteId] = [];
        }
        
        $tasksBySite[$siteId][] = [
            'id' => $task['id'],
            'created_at' => $task['created_at'],
            'updated_at' => $task['updated_at'],
            'site_id' => $task['site_id'],
            'template_id' => $task['template_id'],
            'is_completed' => (bool)$task['is_completed'],
            'comment' => $task['comment'],
            'position' => (int)$task['position'],
            'deleted_at' => $task['deleted_at'],
            'template' => $task['tpl_id'] ? [
                'id' => $task['tpl_id'],
                'title' => $task['tpl_title'],
                'position' => (int)$task['tpl_position'],
                'order' => (int)$task['tpl_order']
            ] : null
        ];
    }

    $sitesByManager = [];
    foreach ($sites as $site) {
        $managerId = $site['manager_id'];
        if (!isset($sitesByManager[$managerId])) {
            $sitesByManager[$managerId] = [];
        }
        
        $sitesByManager[$managerId][] = [
            'id' => $site['id'],
            'created_at' => $site['created_at'],
            'updated_at' => $site['updated_at'],
            'manager_id' => $site['manager_id'],
            'url' => $site['url'],
            'comment' => $site['comment'],
            'position' => (int)$site['position'],
            'deleted_at' => $site['deleted_at'],
            'tasks' => $tasksBySite[$site['id']] ?? []
        ];
    }

    $result = [];
    foreach ($managers as $manager) {
        $result[] = [
            'id' => $manager['id'],
            'created_at' => $manager['created_at'],
            'updated_at' => $manager['updated_at'],
            'name' => $manager['name'],
            'telegram' => $manager['telegram'],
            'comment' => $manager['comment'],
            'position' => (int)$manager['position'],
            'deleted_at' => $manager['deleted_at'],
            'sites' => $sitesByManager[$manager['id']] ?? []
        ];
    }
    
    jsonResponse(['managers' => $result]);
    
} catch (Exception $e) {
    if (DEBUG_MODE) {
        errorResponse('Database error: ' . $e->getMessage(), 500);
    } else {
        errorResponse('Failed to load data', 500);
    }
}

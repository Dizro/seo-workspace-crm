<?php
/**
 * SEO CRM - Tasks API
 * 
 * GET    /api/tasks.php       — All tasks with template info
 * PUT    /api/tasks.php?id=X  — Update task (toggle completion, update comment)
 * DELETE /api/tasks.php?id=X  — Soft delete task
 */

require_once __DIR__ . '/db.php';

setApiHeaders();

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            // `order` is a reserved word — backticks required
            $stmt = $db->query("
                SELECT t.*, 
                       tt.title as template_title, 
                       tt.position as template_position,
                       tt.`order` as template_order
                FROM tasks t
                LEFT JOIN task_templates tt ON t.template_id = tt.id
                WHERE t.deleted_at IS NULL 
                ORDER BY t.site_id, COALESCE(tt.position, t.position) ASC
            ");
            
            $tasks = $stmt->fetchAll();
            
            $result = array_map(function($task) {
                return [
                    'id' => $task['id'],
                    'created_at' => $task['created_at'],
                    'updated_at' => $task['updated_at'],
                    'site_id' => $task['site_id'],
                    'template_id' => $task['template_id'],
                    'is_completed' => (bool)$task['is_completed'],
                    'comment' => $task['comment'],
                    'position' => $task['position'],
                    'deleted_at' => $task['deleted_at'],
                    'template' => $task['template_id'] ? [
                        'id' => $task['template_id'],
                        'title' => $task['template_title'],
                        'position' => $task['template_position'],
                        'order' => $task['template_order']
                    ] : null
                ];
            }, $tasks);
            
            jsonResponse($result);
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('Task ID is required');
            }
            
            $data = getJsonInput();
            $updates = [];
            $params = ['id' => $id];
            
            if (isset($data['is_completed'])) {
                $updates[] = 'is_completed = :is_completed';
                $params['is_completed'] = $data['is_completed'] ? 1 : 0;
            }
            if (isset($data['comment'])) {
                $updates[] = 'comment = :comment';
                $params['comment'] = $data['comment'];
            }
            if (isset($data['position'])) {
                $updates[] = 'position = :position';
                $params['position'] = (int)$data['position'];
            }
            if (isset($data['deleted_at'])) {
                $updates[] = 'deleted_at = :deleted_at';
                $params['deleted_at'] = date('Y-m-d H:i:s', strtotime($data['deleted_at']));
            }
            
            if (empty($updates)) {
                errorResponse('No fields to update');
            }
            
            $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            // `order` is a reserved word — backticks required
            $stmt = $db->prepare("
                SELECT t.*, tt.title as template_title, tt.position as template_position, tt.`order` as template_order
                FROM tasks t
                LEFT JOIN task_templates tt ON t.template_id = tt.id
                WHERE t.id = :id
            ");
            $stmt->execute(['id' => $id]);
            jsonResponse($stmt->fetch());
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('Task ID is required');
            }
            
            $stmt = $db->prepare("UPDATE tasks SET deleted_at = NOW() WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            jsonResponse(['success' => true, 'message' => 'Task deleted']);
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

<?php
/**
 * SEO CRM - Task Templates API
 * 
 * GET    /api/templates.php       — All templates
 * POST   /api/templates.php       — Create template
 * PUT    /api/templates.php?id=X  — Update template
 * DELETE /api/templates.php?id=X  — Hard delete template
 */

require_once __DIR__ . '/db.php';

setApiHeaders();

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            $stmt = $db->query("
                SELECT * FROM task_templates 
                ORDER BY position ASC
            ");
            jsonResponse($stmt->fetchAll());
            break;
            
        case 'POST':
            $data = getJsonInput();
            
            if (empty($data['title'])) {
                errorResponse('Title is required');
            }
            
            $uuid = Database::generateUUID();
            
            $stmt = $db->query("SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM task_templates");
            $nextPos = $stmt->fetch()['next_pos'];
            
            $stmt = $db->prepare("
                INSERT INTO task_templates (id, title, position, `order`) 
                VALUES (:id, :title, :position, :ord)
            ");
            
            $stmt->execute([
                'id' => $uuid,
                'title' => trim($data['title']),
                'position' => $data['position'] ?? $nextPos,
                'ord' => $data['order'] ?? $nextPos
            ]);
            
            $stmt = $db->prepare("SELECT * FROM task_templates WHERE id = :id");
            $stmt->execute(['id' => $uuid]);
            jsonResponse($stmt->fetch(), 201);
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('Template ID is required');
            }
            
            $data = getJsonInput();
            $updates = [];
            $params = ['id' => $id];
            
            if (isset($data['title'])) {
                $updates[] = 'title = :title';
                $params['title'] = trim($data['title']);
            }
            if (isset($data['position'])) {
                $updates[] = 'position = :position';
                $params['position'] = (int)$data['position'];
            }
            if (isset($data['order'])) {
                $updates[] = '`order` = :ord';
                $params['ord'] = (int)$data['order'];
            }
            
            if (empty($updates)) {
                errorResponse('No fields to update');
            }
            
            $sql = "UPDATE task_templates SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $stmt = $db->prepare("SELECT * FROM task_templates WHERE id = :id");
            $stmt->execute(['id' => $id]);
            jsonResponse($stmt->fetch());
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('Template ID is required');
            }
            
            $stmt = $db->prepare("DELETE FROM task_templates WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            jsonResponse(['success' => true, 'message' => 'Template deleted']);
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

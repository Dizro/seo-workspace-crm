<?php
/**
 * SEO CRM - Managers API
 * 
 * GET    /api/managers.php       — All active managers
 * POST   /api/managers.php       — Create manager
 * PUT    /api/managers.php?id=X  — Update manager
 * DELETE /api/managers.php?id=X  — Soft delete manager
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
                SELECT * FROM managers 
                WHERE deleted_at IS NULL 
                ORDER BY position ASC
            ");
            jsonResponse($stmt->fetchAll());
            break;
            
        case 'POST':
            $data = getJsonInput();
            
            if (empty($data['name'])) {
                errorResponse('Name is required');
            }
            
            $uuid = Database::generateUUID();
            
            $stmt = $db->query("SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM managers WHERE deleted_at IS NULL");
            $nextPos = $stmt->fetch()['next_pos'];
            
            $stmt = $db->prepare("
                INSERT INTO managers (id, name, telegram, comment, position) 
                VALUES (:id, :name, :telegram, :comment, :position)
            ");
            
            $stmt->execute([
                'id' => $uuid,
                'name' => trim($data['name']),
                'telegram' => $data['telegram'] ?? null,
                'comment' => $data['comment'] ?? null,
                'position' => $nextPos
            ]);
            
            $stmt = $db->prepare("SELECT * FROM managers WHERE id = :id");
            $stmt->execute(['id' => $uuid]);
            jsonResponse($stmt->fetch(), 201);
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('Manager ID is required');
            }
            
            $data = getJsonInput();
            $updates = [];
            $params = ['id' => $id];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params['name'] = trim($data['name']);
            }
            if (isset($data['telegram'])) {
                $updates[] = 'telegram = :telegram';
                $params['telegram'] = $data['telegram'];
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
            
            $sql = "UPDATE managers SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $stmt = $db->prepare("SELECT * FROM managers WHERE id = :id");
            $stmt->execute(['id' => $id]);
            jsonResponse($stmt->fetch());
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('Manager ID is required');
            }
            
            $stmt = $db->prepare("UPDATE managers SET deleted_at = NOW() WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            jsonResponse(['success' => true, 'message' => 'Manager deleted']);
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

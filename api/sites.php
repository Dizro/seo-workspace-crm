<?php
/**
 * SEO CRM - Sites API
 * 
 * GET    /api/sites.php              — All active sites
 * POST   /api/sites.php              — Create site with auto-generated tasks from templates
 * PUT    /api/sites.php?id=X         — Update site
 * DELETE /api/sites.php?id=X         — Soft delete site
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
                SELECT s.*, m.name as manager_name 
                FROM sites s
                LEFT JOIN managers m ON s.manager_id = m.id
                WHERE s.deleted_at IS NULL 
                ORDER BY s.position ASC
            ");
            jsonResponse($stmt->fetchAll());
            break;
            
        case 'POST':
            $data = getJsonInput();
            
            if (empty($data['url'])) {
                errorResponse('URL is required');
            }
            if (empty($data['manager_id'])) {
                errorResponse('Manager ID is required');
            }
            
            $siteId = Database::generateUUID();
            
            $stmt = $db->prepare("
                SELECT COALESCE(MAX(position), -1) + 1 AS next_pos 
                FROM sites 
                WHERE manager_id = :manager_id AND deleted_at IS NULL
            ");
            $stmt->execute(['manager_id' => $data['manager_id']]);
            $nextPos = $stmt->fetch()['next_pos'];
            
            // Transaction: site + tasks must be created atomically
            $db->beginTransaction();
            
            try {
                $stmt = $db->prepare("
                    INSERT INTO sites (id, manager_id, url, comment, position) 
                    VALUES (:id, :manager_id, :url, :comment, :position)
                ");
                
                $stmt->execute([
                    'id' => $siteId,
                    'manager_id' => $data['manager_id'],
                    'url' => trim($data['url']),
                    'comment' => $data['comment'] ?? null,
                    'position' => $nextPos
                ]);
                
                $stmt = $db->query("SELECT id, position FROM task_templates ORDER BY position ASC");
                $templates = $stmt->fetchAll();
                
                if (!empty($templates)) {
                    $taskStmt = $db->prepare("
                        INSERT INTO tasks (id, site_id, template_id, is_completed, position) 
                        VALUES (:id, :site_id, :template_id, 0, :position)
                    ");
                    
                    foreach ($templates as $template) {
                        $taskStmt->execute([
                            'id' => Database::generateUUID(),
                            'site_id' => $siteId,
                            'template_id' => $template['id'],
                            'position' => $template['position']
                        ]);
                    }
                }
                
                $db->commit();
                
                $stmt = $db->prepare("SELECT * FROM sites WHERE id = :id");
                $stmt->execute(['id' => $siteId]);
                jsonResponse($stmt->fetch(), 201);
                
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Failed to create site: ' . $e->getMessage(), 500);
            }
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('Site ID is required');
            }
            
            $data = getJsonInput();
            $updates = [];
            $params = ['id' => $id];
            
            if (isset($data['url'])) {
                $updates[] = 'url = :url';
                $params['url'] = trim($data['url']);
            }
            if (isset($data['manager_id'])) {
                $updates[] = 'manager_id = :manager_id';
                $params['manager_id'] = $data['manager_id'];
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
            
            $sql = "UPDATE sites SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $stmt = $db->prepare("SELECT * FROM sites WHERE id = :id");
            $stmt->execute(['id' => $id]);
            jsonResponse($stmt->fetch());
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('Site ID is required');
            }
            
            $stmt = $db->prepare("UPDATE sites SET deleted_at = NOW() WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            jsonResponse(['success' => true, 'message' => 'Site deleted']);
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

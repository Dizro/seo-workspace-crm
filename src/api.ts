const API_BASE = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}` };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function getManagers() {
  return apiFetch<any[]>('/managers.php');
}

export async function createManager(payload: { name: string; telegram?: string; comment?: string }) {
  return apiFetch<any>('/managers.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateManager(id: string, payload: Record<string, any>) {
  return apiFetch<any>(`/managers.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteManager(id: string) {
  return apiFetch<any>(`/managers.php?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getSites() {
  return apiFetch<any[]>('/sites.php');
}

export async function createSite(payload: { url: string; manager_id: string; comment?: string }) {
  return apiFetch<any>('/sites.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSite(id: string, payload: Record<string, any>) {
  return apiFetch<any>(`/sites.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSite(id: string) {
  return apiFetch<any>(`/sites.php?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getTasks() {
  return apiFetch<any[]>('/tasks.php');
}

export async function updateTask(id: string, payload: Record<string, any>) {
  return apiFetch<any>(`/tasks.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id: string) {
  return apiFetch<any>(`/tasks.php?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getTemplates() {
  return apiFetch<any[]>('/templates.php');
}

export async function createTemplate(payload: { title: string; position?: number }) {
  return apiFetch<any>('/templates.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTemplate(id: string, payload: Record<string, any>) {
  return apiFetch<any>(`/templates.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTemplate(id: string) {
  return apiFetch<any>(`/templates.php?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getLogs(limit = 50) {
  return apiFetch<any[]>(`/logs.php?limit=${limit}`);
}

export async function createLog(payload: {
  entity_type: string;
  entity_id: string;
  action: string;
  details?: string;
  user_name?: string;
}) {
  return apiFetch<any>('/logs.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAllData() {
  return apiFetch<{ managers: any[] }>('/crm_data.php');
}

export async function getTrash() {
  return apiFetch<{ managers: any[]; sites: any[]; tasks: any[] }>('/trash.php');
}

export async function restoreItem(type: 'manager' | 'site' | 'task', id: string) {
  return apiFetch<any>(`/trash.php?type=${type}&id=${id}`, {
    method: 'PUT',
  });
}

const api = {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  getSites,
  createSite,
  updateSite,
  deleteSite,
  getTasks,
  updateTask,
  deleteTask,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getLogs,
  createLog,
  getAllData,
  getTrash,
  restoreItem,
};

export default api;

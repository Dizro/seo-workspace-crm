export interface TaskTemplate {
  id: string;
  title: string;
  order: number;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  site_id: string;
  template_id: string | null;
  is_completed: boolean;
  comment: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  template?: TaskTemplate;
}

export interface Site {
  id: string;
  manager_id: string;
  url: string;
  comment: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  tasks: Task[];
}

export interface Manager {
  id: string;
  name: string;
  telegram: string | null;
  comment: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  sites: Site[];
}

export interface FullManagerData extends Manager {
  sites: Site[];
}

export interface AuditLog {
  id: string;
  created_at: string;
  entity_type: 'manager' | 'site' | 'task' | 'template';
  entity_id: string;
  action: 'update' | 'delete' | 'restore' | 'create';
  details: string;
  user_name: string;
}

export interface TrashItem {
  id: string;
  type: 'manager' | 'site' | 'task';
  name: string;
  context: string;
  deleted_at: string;
}
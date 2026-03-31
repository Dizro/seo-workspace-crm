import React, { useState } from 'react';
import { Typography, Dropdown, Button } from 'antd';
import { DownOutlined, UpOutlined, MoreOutlined, HolderOutlined } from '@ant-design/icons';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Manager, Site, Task } from '../../types/db';
import { SiteCard } from './SiteCard';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { AddSite } from '../actions/AddSite';
import { notifyUndo } from '../../utils/notification';

const { Text } = Typography;

interface ManagerSectionProps {
  manager: Manager & { sites: (Site & { tasks: Task[] })[] };
  onChanged?: () => void;
}

export const ManagerSection: React.FC<ManagerSectionProps> = ({ manager, onChanged }) => {
  const queryClient = useQueryClient();
  const sites = manager?.sites ?? [];
  const [collapsed, setCollapsed] = useState(() => {
    if (!manager?.id) return false;
    return localStorage.getItem(`manager-collapsed-${manager.id}`) === 'true';
  });

  if (!manager) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: manager.id, data: { type: 'manager' }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 2 : 1
  };

  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem(`manager-collapsed-${manager.id}`, String(newVal));
  };

  const performDelete = async () => {
    await api.updateManager(manager.id, { deleted_at: new Date().toISOString() });
    await api.createLog({
      entity_type: 'manager',
      entity_id: manager.id,
      action: 'delete',
      details: `Менеджер ${manager.name} перемещен в корзину`
    });
    queryClient.invalidateQueries({ queryKey: ['crm-data'] });
  };

  const handleDeleteClick = () => {
    notifyUndo({
      text: `Удаление менеджера: ${manager.name}`,
      onCommit: performDelete,
      duration: 3
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="manager-card">
      <div className="manager-header">
        <div {...attributes} {...listeners} className="drag-handle"><HolderOutlined /></div>
        <div onClick={toggleCollapse} style={{ cursor: 'pointer', display: 'flex', color: '#9ca3af' }}>
          {collapsed ? <DownOutlined /> : <UpOutlined />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ fontSize: 15, color: '#1f2937' }}>{manager.name}</Text>
          {manager.telegram && <Text type="secondary" style={{ fontSize: 13 }}>{manager.telegram}</Text>}
          <div style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>
            {sites.length} сайтов
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AddSite managerId={manager.id} onAdded={() => onChanged?.()} />
          <Dropdown menu={{ items: [{ key: 'del', label: 'Удалить', danger: true, onClick: handleDeleteClick }] }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </div>
      </div>

      {!collapsed && (
        <SortableContext items={sites.map(s => s.id)} strategy={rectSortingStrategy}>
          <div className="manager-grid">
            {sites.length > 0 ? (
              sites.map(site => <SiteCard key={site.id} site={site} />)
            ) : (
              <div className="empty-state">
                Нет сайтов. Перетащите сюда или создайте.
              </div>
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
};
import React from 'react';
import { Typography, Tag, Card, Dropdown, Button } from 'antd';
import { MoreOutlined, LinkOutlined, HolderOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Site, Task } from '../../types/db';
import { TaskRow } from './TaskRow';
import { InlineComment } from '../ui/InlineComment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { notifyUndo } from '../../utils/notification';

const { Link } = Typography;

const SiteFavicon: React.FC<{ url: string }> = ({ url }) => {
  const getDomain = (u: string) => u.replace(/^https?:\/\//, '').split('/')[0];
  const src = `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
  return (
    <img src={src} alt="" style={{ width: 16, height: 16, marginTop: 2, borderRadius: 2 }} onError={(e) => e.currentTarget.style.display = 'none'} />
  );
};

export const SiteCard: React.FC<{ site: Site & { tasks: Task[] } }> = ({ site }) => {
  if (!site) return null;

  const queryClient = useQueryClient();
  const tasks = [...(site?.tasks ?? [])].sort((a, b) => {
    if (a.is_completed === b.is_completed) return 0;
    return a.is_completed ? 1 : -1;
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id, data: { type: 'site', managerId: site.manager_id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      await api.updateSite(site.id, { comment });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-data'] })
  });

  const performDelete = async () => {
    await api.updateSite(site.id, { deleted_at: new Date().toISOString() });
    await api.createLog({
      entity_type: 'site',
      entity_id: site.id,
      action: 'delete',
      details: `Сайт ${site.url} перемещен в корзину`
    });
    queryClient.invalidateQueries({ queryKey: ['crm-data'] });
  };

  const handleDeleteClick = () => {
    notifyUndo({
      text: `Удаление сайта ${site.url}`,
      onCommit: performDelete,
      duration: 3
    });
  };

  const completed = tasks.filter(t => t.is_completed).length;
  const total = tasks.length;
  const allDone = total > 0 && completed === total;

  return (
    <div ref={setNodeRef} style={style} className="site-card-wrapper">
      <Card className="site-card" styles={{ body: { padding: '16px' } }} hoverable>
        <div className="site-header">
          <div className="site-info">
            <div {...attributes} {...listeners} className="drag-handle" style={{ marginTop: 4 }}>
              <HolderOutlined />
            </div>
            <SiteFavicon url={site.url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`https://${site.url}`} target="_blank" className="site-link" ellipsis>
                {site.url} <LinkOutlined style={{ fontSize: 10, opacity: 0.5 }} />
              </Link>
              <InlineComment value={site.comment} onSave={(v) => commentMutation.mutateAsync(v)} placeholder="Заметка к сайту..." style={{ marginTop: 2 }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {total > 0 && (
              <Tag color={allDone ? 'success' : 'default'} style={{ marginRight: 0, fontSize: 11, border: 'none', background: allDone ? '#dcfce7' : '#f3f4f6', color: allDone ? '#166534' : '#6b7280' }}>
                {completed}/{total}
              </Tag>
            )}
            <Dropdown menu={{ items: [{ key: 'delete', label: 'Удалить сайт', danger: true, onClick: handleDeleteClick }] }} trigger={['click']} placement="bottomRight">
              <Button type="text" icon={<MoreOutlined />} size="small" style={{ color: '#9ca3af' }} />
            </Dropdown>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map(task => <TaskRow key={task.id} task={task} />)}
          {tasks.length === 0 && <div style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic', marginTop: 8 }}>Нет задач</div>}
        </div>
      </Card>
    </div>
  );
};
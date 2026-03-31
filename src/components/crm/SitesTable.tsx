import React from 'react';
import { Table, Tag, Typography, Progress, Empty } from 'antd';
import type { Site, Task, FullManagerData } from '../../types/db';
import { InlineComment } from '../ui/InlineComment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

const { Link } = Typography;

interface SitesTableProps {
  managers: FullManagerData[];
}

export const SitesTable: React.FC<SitesTableProps> = ({ managers }) => {
  const queryClient = useQueryClient();
  const safeManagers = managers ?? [];

  const flatData = safeManagers.flatMap(manager =>
    (manager?.sites ?? []).map(site => ({
      ...site,
      managerName: manager.name,
      key: site.id
    }))
  );

  const commentMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string, comment: string }) => {
      await api.updateSite(id, { comment });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['crm-data'] })
  });

  const columns = [
    {
      title: 'Сайт',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <Link href={`https://${url}`} target="_blank" strong>
          {url}
        </Link>
      )
    },
    {
      title: 'Менеджер',
      dataIndex: 'managerName',
      key: 'managerName',
      render: (name: string) => <Tag>{name}</Tag>,
      filters: safeManagers.map(m => ({ text: m.name, value: m.name })),
      onFilter: (value: any, record: any) => record.managerName === value,
    },
    {
      title: 'Прогресс',
      key: 'progress',
      render: (_: any, record: Site & { tasks: Task[] }) => {
        const recordTasks = record?.tasks ?? [];
        const total = recordTasks.length;
        const completed = recordTasks.filter(t => t.is_completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div style={{ width: 150 }}>
            <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} />
          </div>
        );
      },
      sorter: (a: any, b: any) => {
        const aTasks = a?.tasks ?? [];
        const bTasks = b?.tasks ?? [];
        const aPerc = aTasks.length ? (aTasks.filter((t: any) => t.is_completed).length / aTasks.length) : 0;
        const bPerc = bTasks.length ? (bTasks.filter((t: any) => t.is_completed).length / bTasks.length) : 0;
        return aPerc - bPerc;
      }
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      width: '40%',
      render: (comment: string, record: any) => (
        <InlineComment
          value={comment}
          onSave={(val) => commentMutation.mutate({ id: record.id, comment: val })}
          placeholder="Заметка..."
        />
      )
    }
  ];

  return (
    <Table
      dataSource={flatData}
      columns={columns}
      pagination={false}
      size="middle"
      style={{ background: '#fff', borderRadius: 8 }}
      locale={{
        emptyText: <Empty description="Нет данных" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      }}
    />
  );
};
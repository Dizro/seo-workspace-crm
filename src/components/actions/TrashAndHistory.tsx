import React, { useState } from 'react';
import { Modal, Tabs, List, Button, Tag, Typography, message, Skeleton, Empty } from 'antd';
import { HistoryOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import type { AuditLog, TrashItem } from '../../types/db';

const { Text } = Typography;

const styles = {
  primaryText: { color: '#333333', fontWeight: 500, fontSize: '14px' },
  secondaryText: { color: '#898d92', fontSize: '12px' },
  actionLink: { color: '#0055bb', fontSize: '13px', padding: 0, height: 'auto' },
  modalBody: { padding: 0, height: '65vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  listItem: { padding: '12px 0', borderBottom: '1px solid #f0f0f0' },
};

export const TrashAndHistory: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('history');

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.getLogs(50);
      if (response.error) throw new Error(response.error);
      return response.data as AuditLog[];
    },
    enabled: open && activeTab === 'history',
  });

  const { data: trash, isLoading: trashLoading } = useQuery({
    queryKey: ['trash-items'],
    queryFn: async () => {
      const response = await api.getTrash();
      if (response.error) throw new Error(response.error);

      const { managers, sites, tasks } = response.data!;

      const deletedManagers: TrashItem[] = (managers || []).map((m: any) => ({
        id: m.id, type: 'manager', name: m.title || m.name, context: 'Менеджер', deleted_at: m.deleted_at
      }));

      const deletedSites: TrashItem[] = (sites || []).map((s: any) => ({
        id: s.id, type: 'site', name: s.title || s.url, deleted_at: s.deleted_at,
        context: `Менеджер: ${s.manager_name || 'Неизвестно'}`
      }));

      const deletedTasks: TrashItem[] = (tasks || []).map((t: any) => ({
        id: t.id, type: 'task', deleted_at: t.deleted_at,
        name: t.title || 'Без названия',
        context: `Сайт: ${t.site_url || 'Неизвестно'}`
      }));

      return [...deletedManagers, ...deletedSites, ...deletedTasks].sort((a, b) =>
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      );
    },
    enabled: open && activeTab === 'trash',
  });

  const restoreMutation = useMutation({
    mutationFn: async (item: TrashItem) => {
      await api.restoreItem(item.type as 'manager' | 'site' | 'task', item.id);
      await api.createLog({
        entity_type: item.type,
        entity_id: item.id,
        action: 'restore',
        details: `Восстановлен объект: ${item.name}`,
        user_name: 'User'
      });
    },
    onSuccess: () => {
      message.success('Восстановлено');
      queryClient.invalidateQueries({ queryKey: ['crm-data'] });
      queryClient.invalidateQueries({ queryKey: ['trash-items'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'delete': return 'Удаление';
      case 'restore': return 'Восстановление';
      case 'create': return 'Создание';
      default: return 'Изменение';
    }
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
      styles={{ body: styles.modalBody }}
    >
      <div style={{ padding: '12px 24px 0', background: '#fff', borderBottom: '1px solid #eaeaea' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'history', label: <span><HistoryOutlined /> История</span> },
            { key: 'trash', label: <span><DeleteOutlined /> Корзина</span> },
          ]}
          tabBarStyle={{ marginBottom: 0, color: '#898d92' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {activeTab === 'history' && (
          historyLoading ? <div style={{ padding: 20 }}><Skeleton active paragraph={{ rows: 4 }} /></div> : (
            <List
              dataSource={history || []}
              locale={{ emptyText: <Empty description="История пуста" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              renderItem={(item) => (
                <List.Item style={styles.listItem}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.primaryText}>{item.details}</Text>
                      <Text style={styles.secondaryText}>{formatDate(item.created_at)}</Text>
                    </div>
                    <div>
                      <Tag bordered={false} style={{ color: '#898d92', background: '#f3f4f6', fontSize: 11, margin: 0 }}>
                        {getActionLabel(item.action)}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )
        )}

        {activeTab === 'trash' && (
          trashLoading ? <div style={{ padding: 20 }}><Skeleton active paragraph={{ rows: 4 }} /></div> : (
            <List
              dataSource={trash || []}
              locale={{ emptyText: <Empty description="Корзина пуста" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              renderItem={(item) => (
                <List.Item
                  style={styles.listItem}
                  actions={[
                    <Button
                      key="restore"
                      type="link"
                      style={styles.actionLink}
                      onClick={() => restoreMutation.mutate(item)}
                    >
                      Восстановить
                    </Button>
                  ]}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.primaryText}>{item.name}</Text>
                      <span style={{ fontSize: 11, color: '#999', border: '1px solid #eee', padding: '0 4px', borderRadius: 4, textTransform: 'uppercase' }}>
                        {item.type === 'site' ? 'Сайт' : item.type === 'manager' ? 'Менеджер' : 'Задача'}
                      </span>
                    </div>

                    <Text style={styles.secondaryText}>
                      {item.context}
                    </Text>

                    <Text style={{ ...styles.secondaryText, fontSize: 11, marginTop: 2 }}>
                      Удалено: {formatDate(item.deleted_at)}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          )
        )}
      </div>
    </Modal>
  );
};
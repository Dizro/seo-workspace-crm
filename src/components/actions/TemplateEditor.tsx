import React, { useState } from 'react';
import { Modal, Input, Button, Skeleton } from 'antd';
import { DeleteOutlined, PlusOutlined, HolderOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskTemplate } from '../../types/db';

const TemplateItem = ({ template, onDelete, onUpdate }: { template: TaskTemplate, onDelete: (id: string) => void, onUpdate: (id: string, val: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative' as const,
    marginBottom: 8,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', padding: '8px 12px', border: '1px solid #eee', borderRadius: 6 }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#ccc', display: 'flex' }}><HolderOutlined /></div>
        <Input
          defaultValue={template.title}
          onBlur={(e) => onUpdate(template.id, e.target.value)}
          variant="borderless"
          style={{ padding: 0, fontSize: 14 }}
        />
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(template.id)}
        />
      </div>
    </div>
  );
};

export const TemplateEditor: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [newTemplateTitle, setNewTemplateTitle] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.getTemplates();
      if (response.error) throw new Error(response.error);
      return (response.data || []) as TaskTemplate[];
    },
    enabled: open
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newTemplateTitle.trim()) return;
      const maxPos = templates?.length ? Math.max(...templates.map(t => t.position || 0)) : 0;
      await api.createTemplate({ title: newTemplateTitle, position: maxPos + 1 });
    },
    onSuccess: () => {
      setNewTemplateTitle('');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string, title: string }) => {
      await api.updateTemplate(id, { title });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.deleteTemplate(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] })
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: TaskTemplate[]) => {
      for (let i = 0; i < items.length; i++) {
        await api.updateTemplate(items[i].id, { position: i, order: i });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] })
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && templates && over) {
      const oldIndex = templates.findIndex(t => t.id === active.id);
      const newIndex = templates.findIndex(t => t.id === over.id);
      const newItems = arrayMove(templates, oldIndex, newIndex);
      queryClient.setQueryData(['templates'], newItems);
      reorderMutation.mutate(newItems);
    }
  };

  return (
    <Modal title="Настройка шаблонов задач" open={open} onCancel={onClose} footer={null} width={600}>
      <div style={{ marginBottom: 24, background: '#f9fafb', padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="Новая задача..."
            value={newTemplateTitle}
            onChange={(e) => setNewTemplateTitle(e.target.value)}
            onPressEnter={() => addMutation.mutate()}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => addMutation.mutate()} loading={addMutation.isPending}>
            Добавить
          </Button>
        </div>
      </div>

      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {isLoading ? <Skeleton active /> : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={templates?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
              {templates?.map(t => (
                <TemplateItem
                  key={t.id}
                  template={t}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onUpdate={(id, val) => updateMutation.mutate({ id, title: val })}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
        Эти задачи будут автоматически создаваться для всех новых сайтов в указанном порядке.
      </div>
    </Modal>
  );
};
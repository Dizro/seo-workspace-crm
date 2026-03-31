import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import type { Task } from '../../types/db';
import { InlineComment } from '../ui/InlineComment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

interface TaskRowProps {
  task: Task;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task }) => {
  const queryClient = useQueryClient();
  const [isCompleted, setIsCompleted] = useState(task.is_completed);

  useEffect(() => {
    setIsCompleted(task.is_completed);
  }, [task.is_completed]);

  const statusMutation = useMutation({
    mutationFn: async (newStatus: boolean) => {
      const response = await api.updateTask(task.id, { is_completed: newStatus });
      if (response.error) throw new Error(response.error);

      await api.createLog({
        entity_type: 'task',
        entity_id: task.id,
        action: 'update',
        details: `Статус: ${newStatus ? 'Готово' : 'В работе'}`
      });
    },
    onMutate: (newStatus) => {
      setIsCompleted(newStatus);
    },
    onError: () => {
      setIsCompleted(!isCompleted);
      message.error('Ошибка соединения');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-data'] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      await api.updateTask(task.id, { comment });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['crm-data'] })
  });

  return (
    <div className="task-row">
      <div
        className={`task-checkbox ${isCompleted ? 'checked' : 'unchecked'}`}
        onClick={() => statusMutation.mutate(!isCompleted)}
      >
        {isCompleted && <CheckOutlined style={{ fontSize: 10, color: '#fff' }} />}
      </div>

      <div className="task-content">
        <div className={`task-title ${isCompleted ? 'completed' : ''}`}>
          {task.template?.title || 'Задача'}
        </div>

        <div style={{ opacity: isCompleted ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <InlineComment
            value={task.comment}
            onSave={(v) => commentMutation.mutateAsync(v)}
            placeholder="добавить комментарий"
            style={{ marginTop: -2 }}
          />
        </div>
      </div>
    </div>
  );
};
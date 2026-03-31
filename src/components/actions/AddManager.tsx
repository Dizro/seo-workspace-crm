import React, { useState } from 'react';
import { Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifySuccess } from '../../utils/notification';

export const AddManager: React.FC<{ onAdded?: () => void }> = ({ onAdded }) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (payload: { name: string }) => {
      const response = await api.createManager(payload);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-data'] });
      onAdded?.();
      setOpen(false);
      notifySuccess('Менеджер добавлен');
    },
  });

  const handleSubmit = async (vals: { name: string }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await create.mutateAsync({ name: vals.name });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)}>Добавить менеджера</Button>
      <Modal open={open} title="Новый менеджер" onCancel={() => setOpen(false)} footer={null}>
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="Имя"
            rules={[{ required: true, message: 'Пожалуйста, введите имя менеджера' }]}
          >
            <Input placeholder="Например: Иван Петров" disabled={isSubmitting} />
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" type="primary" block loading={isSubmitting} disabled={isSubmitting}>
              Создать
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
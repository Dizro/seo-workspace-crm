import React, { useState } from 'react';
import { Button, Modal, Form, Input } from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import api from '../../api';
import { notifySuccess, notifyError } from '../../utils/notification';

interface Props {
  managerId: string;
  onAdded?: () => void;
}

export const AddSite: React.FC<Props> = ({ managerId, onAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const submit = async () => {
    if (loading) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      let cleanUrl = values.url.trim();
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

      const response = await api.createSite({
        manager_id: managerId,
        url: cleanUrl,
        comment: values.comment || null
      });

      if (response.error) throw new Error(response.error);

      setLoading(false);
      notifySuccess('Сайт добавлен, задачи созданы');

      form.resetFields();
      setOpen(false);
      onAdded?.();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      notifyError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="small" icon={<PlusOutlined />} onClick={() => setOpen(true)} disabled={loading}>
        Добавить сайт
      </Button>
      <Modal
        title="Новый сайт"
        open={open}
        onOk={submit}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        okText="Создать"
        cancelText="Отмена"
        okButtonProps={{ loading, disabled: loading }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="url" label="Адрес сайта" rules={[{ required: true, message: 'Введите адрес' }]}>
            <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://example.com" allowClear disabled={loading} />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={3} placeholder="Заметки..." disabled={loading} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
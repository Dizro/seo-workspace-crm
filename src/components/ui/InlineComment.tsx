import React, { useState, useEffect, useRef } from 'react';
import { Input, message } from 'antd';
import { LoadingOutlined, EditOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface InlineCommentProps {
  value: string | null;
  onSave: (val: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const InlineComment: React.FC<InlineCommentProps> = ({ 
  value, 
  onSave, 
  placeholder = "Добавить комментарий...",
  className,
  style
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const inputRef = useRef<any>(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus({ cursor: 'end' });
    }
  }, [isEditing]);

  const handleSave = async () => {
    setIsEditing(false);
    if ((localValue || '').trim() === (value || '').trim()) return;

    setIsSaving(true);
    try {
      await onSave(localValue);
    } catch (e) {
      message.error('Не удалось сохранить');
      setLocalValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setLocalValue(value || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={className} style={{ width: '100%', ...style }}>
        <TextArea
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoSize={{ minRows: 1, maxRows: 6 }}
          style={{
            fontSize: '13px',
            lineHeight: '1.5',
            padding: '4px 8px',
            borderRadius: 6,
            boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)',
            resize: 'none',
            marginTop: 4
          }}
        />
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, textAlign: 'right' }}>
          Ctrl+Enter для сохранения
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`inline-comment-wrapper ${className || ''}`}
      onClick={() => setIsEditing(true)}
      style={style}
    >
      {isSaving ? (
        <span style={{ color: '#2563eb', fontSize: 12 }}>
          <LoadingOutlined /> Сохранение...
        </span>
      ) : localValue ? (
        <div 
          className="inline-comment-text"
          title={localValue.length > 50 ? "Нажмите, чтобы редактировать" : ""}
        >
          {localValue}
        </div>
      ) : (
        <div className="inline-comment-placeholder">
           <EditOutlined style={{ fontSize: 12 }} /> 
           <span>{placeholder}</span>
        </div>
      )}
    </div>
  );
};
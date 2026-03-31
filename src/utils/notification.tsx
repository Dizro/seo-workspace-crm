import React from 'react';
import { notification } from 'antd';
import { CheckCircleFilled, InfoCircleFilled, DeleteOutlined } from '@ant-design/icons';

notification.config({
  placement: 'bottomRight',
  bottom: 30,
  duration: 3,
  rtl: false,
});

const notificationStyles = {
  body: { padding: 0, margin: 0 },
  style: {
    padding: 0,
    width: '360px',
    borderRadius: '6px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
    background: '#ffffff',
    border: '1px solid #ebebeb',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: 'hidden',
  }
};

const flexContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  gap: '16px',
  width: '100%',
};

const textBlockStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
  minWidth: 0,
};

const textStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#262626',
  fontWeight: 400,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const undoLinkStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: '#2563eb',
  fontWeight: 500,
  fontSize: '13px',
  whiteSpace: 'nowrap',
  border: 'none',
  background: 'transparent',
  padding: '4px 8px',
  marginRight: '-8px',
  borderRadius: '4px',
  transition: 'background 0.1s',
  flexShrink: 0,
};

export const notifySuccess = (text: string) => {
  notification.open({
    ...notificationStyles,
    message: null,
    description: (
      <div style={flexContainer}>
        <div style={textBlockStyle}>
          <CheckCircleFilled style={{ color: '#52c41a', fontSize: '18px', flexShrink: 0 }} />
          <span style={textStyle}>{text}</span>
        </div>
      </div>
    ),
    closeIcon: null,
  });
};

export const notifyError = (text: string) => {
  notification.open({
    ...notificationStyles,
    message: null,
    description: (
      <div style={flexContainer}>
        <div style={textBlockStyle}>
          <InfoCircleFilled style={{ color: '#ff4d4f', fontSize: '18px', flexShrink: 0 }} />
          <span style={textStyle}>{text}</span>
        </div>
      </div>
    ),
  });
};

interface UndoOptions {
  text: string;
  onCommit: () => void;
  duration?: number;
}

export const notifyUndo = ({ text, onCommit, duration = 3 }: UndoOptions) => {
  const key = `undo-${Date.now()}`;
  let isCancelled = false;
  let timer: any = null;

  const UndoContent = () => (
    <div>
      <div style={flexContainer}>
        <div style={textBlockStyle}>
          <DeleteOutlined style={{ color: '#8c8c8c', fontSize: '16px', flexShrink: 0 }} />
          <span style={textStyle} title={text}>
            {text}
          </span>
        </div>

        <div 
          onClick={() => {
            isCancelled = true;
            clearTimeout(timer);
            notification.destroy(key);
            notifySuccess('Восстановлено');
          }}
          style={undoLinkStyle}
          className="undo-hover-effect"
        >
          Отменить
        </div>
      </div>

      <div style={{ width: '100%', height: '2px', background: '#f5f5f5' }}>
        <div 
          style={{
            height: '100%',
            background: '#ff7700',
            width: '100%',
            animation: `shrink ${duration}s linear forwards`
          }}
        />
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
          .undo-hover-effect:hover {
            background-color: #f0f5ff !important;
          }
        `}</style>
      </div>
    </div>
  );

  notification.open({
    key,
    ...notificationStyles,
    duration: duration, 
    message: null,
    closeIcon: null,
    description: <UndoContent />,
    onClose: () => {}
  });

  timer = setTimeout(() => {
    if (!isCancelled) {
      onCommit();
      
      notification.open({
        key,
        ...notificationStyles,
        duration: 2,
        message: null,
        closeIcon: null,
        description: (
            <div style={flexContainer}>
                <div style={textBlockStyle}>
                    <DeleteOutlined style={{ color: '#bfbfbf', fontSize: '16px', flexShrink: 0 }} />
                    <span style={{ ...textStyle, color: '#8c8c8c' }}>Удалено</span>
                </div>
            </div>
        )
      });
    }
  }, duration * 1000);
};
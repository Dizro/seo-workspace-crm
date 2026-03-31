import React, { useState } from 'react';
import { Input, Button, Card, message } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!APP_PASSWORD) return true;
    return localStorage.getItem('crm_auth') === 'true';
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      if (input === APP_PASSWORD) {
        localStorage.setItem('crm_auth', 'true');
        setIsAuthenticated(true);
        message.success('Добро пожаловать');
      } else {
        message.error('Неверный пароль');
        setLoading(false);
      }
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#f0f2f5',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <Card 
        bordered={false}
        style={{ width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 8 }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ 
            margin: '0 0 8px', 
            fontSize: '24px', 
            fontWeight: 700, 
            color: '#1f2937',
            letterSpacing: '-0.5px'
          }}>
            SEO Workspace
          </h1>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            Вход в систему
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input.Password 
            size="large" 
            placeholder="Пароль" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ borderRadius: 6 }}
          />

          <Button 
            type="primary" 
            size="large" 
            block 
            onClick={handleLogin} 
            loading={loading}
            icon={<ArrowRightOutlined />}
            style={{ height: 40, fontSize: 15, fontWeight: 500, borderRadius: 6 }}
          >
            Войти
          </Button>
        </div>
      </Card>
    </div>
  );
};
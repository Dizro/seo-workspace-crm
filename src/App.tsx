import { useState } from 'react';
import { Layout, Button, Skeleton, Result, ConfigProvider, App as AntApp, theme, Dropdown, Segmented } from 'antd';
import { ReloadOutlined, MoreOutlined, AppstoreOutlined, BarsOutlined, HistoryOutlined, FormOutlined } from '@ant-design/icons';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import api from './api';
import { ManagerSection } from './components/crm/ManagerSection';
import { SitesTable } from './components/crm/SitesTable';
import { SiteCard } from './components/crm/SiteCard';
import { AuthGuard } from './components/auth/AuthGuard';
import { AddManager } from './components/actions/AddManager';
import { TrashAndHistory } from './components/actions/TrashAndHistory';
import { TemplateEditor } from './components/actions/TemplateEditor';
import type { FullManagerData } from './types/db';

const { Header, Content } = Layout;

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 5 } },
});

function Dashboard() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'manager' | 'site' | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['crm-data'],
    queryFn: async () => {
      const response = await api.getAllData();
      if (response.error) throw new Error(response.error);
      return response.data as { managers: FullManagerData[] };
    },
  });

  const moveSiteMutation = useMutation({
    mutationFn: async ({ siteId, managerId, newIndex }: { siteId: string, managerId: string, newIndex: number }) => {
      await api.updateSite(siteId, { manager_id: managerId, position: newIndex });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['crm-data'] })
  });

  const reorderManagersMutation = useMutation({
    mutationFn: async (items: { id: string, position: number }[]) => {
      for (const item of items) {
        await api.updateManager(item.id, { position: item.position });
      }
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const type = active.data.current?.type;
    setActiveType(type);
    const mgrList = data?.managers ?? [];
    if (type === 'manager') setActiveItem(mgrList.find(m => m.id === active.id));
    else if (type === 'site') {
      for (const mgr of mgrList) {
        const site = (mgr?.sites ?? []).find(s => s.id === active.id);
        if (site) { setActiveItem(site); break; }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); setActiveType(null); setActiveItem(null);
    if (!over) return;

    const mgrList = data?.managers ?? [];

    if (activeType === 'manager' && active.id !== over.id) {
      const oldIndex = mgrList.findIndex(m => m.id === active.id);
      const newIndex = mgrList.findIndex(m => m.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(mgrList, oldIndex, newIndex);
        const updates = newOrder.map((mgr, index) => ({ id: mgr.id, position: index }));
        reorderManagersMutation.mutate(updates);
        queryClient.setQueryData(['crm-data'], { managers: newOrder });
      }
    }

    if (activeType === 'site') {
      const activeSiteId = active.id as string;
      const overId = over.id as string;
      let sourceManagerId = '';
      mgrList.forEach(mgr => { if ((mgr?.sites ?? []).find(s => s.id === activeSiteId)) sourceManagerId = mgr.id; });
      let targetManagerId = '';
      let targetIndex = 0;
      const overManager = mgrList.find(m => m.id === overId);
      if (overManager) { targetManagerId = overManager.id; targetIndex = (overManager?.sites ?? []).length; }
      else {
        mgrList.forEach(mgr => {
          const idx = (mgr?.sites ?? []).findIndex(s => s.id === overId);
          if (idx !== -1) { targetManagerId = mgr.id; targetIndex = idx; }
        });
      }
      if (sourceManagerId && targetManagerId) {
        moveSiteMutation.mutate({ siteId: activeSiteId, managerId: targetManagerId, newIndex: targetIndex });
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, background: '#f0f2f5', minHeight: '100vh' }}>
        <Skeleton active paragraph={{ rows: 2 }} /><br />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <Skeleton.Node active style={{ width: '100%', height: 200 }} />
          <Skeleton.Node active style={{ width: '100%', height: 200 }} />
          <Skeleton.Node active style={{ width: '100%', height: 200 }} />
        </div>
      </div>
    );
  }

  if (isError) return <Result status="500" title="Ошибка" subTitle="Не удалось получить данные." extra={<Button type="primary" onClick={() => refetch()}>Повторить</Button>} />;

  const globalMenu = [
    { key: 'add-manager', label: <AddManager onAdded={() => queryClient.invalidateQueries({ queryKey: ['crm-data'] })} /> },
    { type: 'divider' as const },
    { key: 'templates', label: 'Настройка шаблонов', icon: <FormOutlined />, onClick: () => setTemplatesOpen(true) },
    { key: 'history', label: 'История и Корзина', icon: <HistoryOutlined />, onClick: () => setHistoryOpen(true) }
  ];

  const managers = data?.managers ?? [];
  const managersIds = managers.map(m => m.id);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header className="crm-header">
        <Segmented
          options={[{ value: 'grid', icon: <AppstoreOutlined /> }, { value: 'table', icon: <BarsOutlined /> }]}
          value={viewMode}
          onChange={(val: any) => setViewMode(val)}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button type="text" icon={<ReloadOutlined />} onClick={() => refetch()}>Обновить</Button>
          <Dropdown menu={{ items: globalMenu }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined style={{ fontSize: 20 }} />} />
          </Dropdown>
        </div>
      </Header>

      <Content className="crm-content">
        {viewMode === 'grid' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={managersIds} strategy={verticalListSortingStrategy}>
              {managers.map(manager => (
                <ManagerSection key={manager.id} manager={manager} onChanged={() => queryClient.invalidateQueries({ queryKey: ['crm-data'] })} />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
              {activeId && activeType === 'manager' && <div style={{ opacity: 0.8 }}><ManagerSection manager={activeItem} /></div>}
              {activeId && activeType === 'site' && <div style={{ width: 350, opacity: 0.9 }}><SiteCard site={activeItem} /></div>}
            </DragOverlay>

            {managers.length === 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh'
              }}>
                <div style={{ textAlign: 'center', maxWidth: 480 }}>

                  <div style={{ marginBottom: 24, opacity: 0.8 }}>
                    <svg width="184" height="152" viewBox="0 0 184 152" xmlns="http://www.w3.org/2000/svg" style={{ fill: '#e5e7eb' }}>
                      <g fill="none" fillRule="evenodd">
                        <g transform="translate(24 31.67)">
                          <ellipse fillOpacity=".8" fill="#F5F5F7" cx="67.797" cy="106.89" rx="67.797" ry="12.668"></ellipse>
                          <path d="M122.034 69.674L67.797 96.049 13.559 69.674v24.283c0 13.316 24.283 24.114 54.238 24.114 29.955 0 54.237-10.798 54.237-24.114V69.674z" fill="#DCE0E6"></path>
                          <path d="M33.83 0h67.933a4 4 0 0 1 4 4v93.344a4 4 0 0 1-4 4H33.83a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#FFF"></path>
                          <path d="M42.678 9.953h50.237a2 2 0 0 1 2 2V36.91a2 2 0 0 1-2 2H42.678a2 2 0 0 1-2-2V11.953a2 2 0 0 1 2-2zM42.94 49.767h49.713a2.262 2.262 0 1 1 0 4.524H42.94a2.262 2.262 0 0 1 0-4.524zM42.94 61.53h49.713a2.262 2.262 0 1 1 0 4.525H42.94a2.262 2.262 0 0 1 0-4.525zM121.813 105.032c-.775 3.071-3.497 5.36-6.735 5.36H20.515c-3.238 0-5.96-2.29-6.734-5.36a7.309 7.309 0 0 1-.222-1.79V69.675h26.318c2.907 0 5.25 2.448 5.25 5.42v.04c0 2.971 2.37 5.37 5.277 5.37h34.785c2.907 0 5.277-2.421 5.277-5.393V75.1c0-2.972 2.343-5.426 5.25-5.426h26.318v33.569c0 .617-.077 1.216-.221 1.789z" fill="#DCE0E6"></path>
                        </g>
                        <path d="M149.121 33.292l-6.83 2.65a1 1 0 0 1-1.317-1.23l1.937-6.207c-2.589-2.944-4.109-6.534-4.109-10.408C138.802 8.102 148.92 0 161.402 0 173.881 0 184 8.102 184 18.097c0 9.995-10.118 18.097-22.599 18.097-4.528 0-8.744-1.066-12.28-2.902z" fill="#DCE0E6" opacity=".6"></path>
                        <path d="M63.54 55.434l-1.475 9.332a.51.51 0 0 1-.504.434h-.002a.51.51 0 0 1-.497-.613l1.986-8.995a28.06 28.06 0 0 0-2.613-2.094c-8.988-6.145-12.222-18.342-7.222-27.24 4.999-8.898 17.523-11.134 26.51-4.988 8.988 6.144 12.223 18.341 7.223 27.24-.954 1.698-2.185 3.197-3.626 4.469l-19.78 2.455z" fill="#DCE0E6" opacity=".3"></path>
                      </g>
                    </svg>
                  </div>


                  <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 12 }}>
                    Добро пожаловать в SEO CRM
                  </h2>
                  <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
                    Здесь пока пусто. Создайте своего первого менеджера, чтобы начать распределять сайты и отслеживать задачи.
                  </p>


                  <div style={{ transform: 'scale(1.1)' }}>
                    <AddManager onAdded={() => queryClient.invalidateQueries({ queryKey: ['crm-data'] })} />
                  </div>
                </div>
              </div>
            )}

          </DndContext>
        ) : (
          <SitesTable managers={managers} />
        )}

        <TrashAndHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
        <TemplateEditor open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", colorPrimary: '#ff7700', borderRadius: 6, colorBgLayout: '#f0f2f5', fontSize: 13, controlHeight: 32 },
          components: { Button: { controlHeight: 32, fontWeight: 500 }, Card: { borderRadiusLG: 8 }, Input: { controlHeight: 32 } }
        }}
      >
        <AntApp>
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
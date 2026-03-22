/**
 * @file        效率工具代理頁面
 * @description 效率工具代理功能，展示各種效率提升的 AI 代理工具
 * @lastUpdate  2026-03-22 19:56:42
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState, useEffect } from 'react';
import { Tabs, Input, Row, Col, Button, Empty, App, Spin, Switch } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, HeartOutlined } from '@ant-design/icons';
import AgentCard from '../components/AgentCard';
import AgentFormModal from '../components/AgentFormModal';
import { agentApi, Agent as ApiAgent } from '../services/api';
import { authStore } from '../stores/auth';
import { useContentTokens } from '../contexts/AppThemeProvider';

const groupConfig = [
  { key: 'all', label: '全部', icon: 'AppstoreOutlined' },
  { key: 'productivity', label: '生產力', icon: 'ThunderboltOutlined' },
  { key: 'document', label: '文檔處理', icon: 'FileTextOutlined' },
  { key: 'data', label: '數據處理', icon: 'DatabaseOutlined' },
  { key: 'language', label: '語言翻譯', icon: 'TranslationOutlined' },
  { key: 'entertainment', label: '創意娛樂', icon: 'SmileOutlined' },
];

export default function BrowseTools() {
  const { message } = App.useApp();
  const contentTokens = useContentTokens();
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<ApiAgent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ApiAgent | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await agentApi.list('tool');
      const data = res.data.data || [];
      setAgents(data);
      const favs = new Set<string>();
      data.forEach((a: ApiAgent) => {
        if (a.is_favorite && a._key) favs.add(a._key);
      });
      setFavorites(favs);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const mapApiToCard = (agent: ApiAgent) => ({
    id: agent._key || '',
    name: agent.name,
    description: agent.description || '',
    icon: agent.icon || 'RobotOutlined',
    status: (agent.status as any) || 'online',
    usageCount: agent.usage_count || 0,
    groupKey: agent.group_key || 'productivity',
  });

  const filteredAgents = agents.map(mapApiToCard).filter((agent: any) => {
    if (activeTab !== 'all' && agent.groupKey !== activeTab) {
      return false;
    }
    if (showFavoritesOnly && !favorites.has(agent.id)) {
      return false;
    }
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        agent.name.toLowerCase().includes(search) ||
        agent.description.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleFavorite = async (agentId: string, isFavorite: boolean) => {
    try {
      await agentApi.toggleFavorite(agentId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.add(agentId);
        } else {
          next.delete(agentId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleChat = (agentId: string) => {
    const agent = agents.find((a) => a._key === agentId);
    message.info(`啟動與 ${agent?.name} 的對話...`);
  };

  const handleEdit = (agentId: string) => {
    const agent = agents.find((a) => a._key === agentId);
    setEditingAgent(agent || null);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleDelete = async (agentId: string) => {
    try {
      await agentApi.delete(agentId);
      message.success('刪除成功');
      fetchAgents();
    } catch (err) {
      console.error('Failed to delete agent:', err);
      message.error('刪除失敗');
    }
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    try {
      const currentUser = authStore.getState().user;
      const apiData: Record<string, unknown> = {
        name: values.name,
        description: values.description || '',
        icon: values.icon || '',
        status: values.status || 'online',
        group_key: values.groupKey || activeTab,
        source: values.source === true ? 'third_party' : (values.source || 'local'),
        endpoint_url: values.endpointUrl || '',
        api_key: values.apiKey || '',
        auth_type: values.authType || 'none',
        llm_model: values.llmModel || '',
        temperature: values.temperature ?? 0.7,
        max_tokens: values.maxTokens ?? 2000,
        system_prompt: values.systemPrompt || '',
        knowledge_bases: values.knowledgeBases || [],
        data_sources: values.dataSources || [],
        tools: values.tools || [],
        opening_lines: values.openingLines || [],
        capabilities: values.capabilities || [],
        visibility: values.visibility || 'private',
        visibility_roles: values.visibility_roles || [],
      };

      if (modalMode === 'create') {
        apiData.agent_type = values.agentType || 'tool';
        apiData.created_by = currentUser?.username || 'unknown';
      }

      if (modalMode === 'create') {
        await agentApi.create(apiData);
        message.success(`新增 Agent: ${values.name}`);
      } else if (editingAgent?._key) {
        await agentApi.update(editingAgent._key, apiData);
        message.success(`更新 Agent: ${values.name}`);
      }
      setModalOpen(false);
      fetchAgents();
    } catch (err) {
      message.error('操作失敗');
    }
  };

  const handleRefresh = () => {
    fetchAgents();
  };

  const tabItems = groupConfig.map((group) => ({
    key: group.key,
    label: group.label,
    children: (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="搜索 Agent 名稱或描述..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 300 }}
            allowClear
          />
          {activeTab !== 'all' && (
            <Button icon={<PlusOutlined />} onClick={handleCreate}>新增 Agent</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <HeartOutlined style={{ color: contentTokens.colorError }} />
            <span>我的收藏</span>
            <Switch 
              checked={showFavoritesOnly} 
              onChange={setShowFavoritesOnly} 
              size="small"
            />
          </div>
        </div>

        {filteredAgents.length > 0 ? (
          <Row gutter={[16, 16]} style={{ margin: 0 }}>
            {filteredAgents.map((agent) => (
              <Col 
                key={agent.id} 
                xs={24} 
                sm={12} 
                md={12} 
                lg={8} 
                xl={6}
                style={{ marginBottom: 16 }}
              >
                <AgentCard
                    agent={agent}
                    isFavorite={favorites.has(agent.id)}
                    onFavorite={handleFavorite}
                    onChat={handleChat}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            description="沒有找到匹配的 Agent"
            style={{ marginTop: 48 }}
          />
        )}
      </div>
    ),
  }));

  return (
    <div style={{ padding: '24px' }}>
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginTop: -8 }}
        />
      </Spin>
      <AgentFormModal
        open={modalOpen}
        agent={editingAgent ? {
          id: editingAgent._key || '',
          name: editingAgent.name,
          description: editingAgent.description || '',
          icon: editingAgent.icon || 'RobotOutlined',
          status: (editingAgent.status as any) || 'online',
          usageCount: editingAgent.usage_count || 0,
          groupKey: editingAgent.group_key || 'productivity',
          agentType: editingAgent.agent_type,
          source: editingAgent.source,
          endpointUrl: editingAgent.endpoint_url,
          apiKey: editingAgent.api_key,
          authType: editingAgent.auth_type,
          llmModel: editingAgent.llm_model,
          temperature: editingAgent.temperature,
          maxTokens: editingAgent.max_tokens,
          systemPrompt: editingAgent.system_prompt,
          knowledgeBases: editingAgent.knowledge_bases,
          dataSources: editingAgent.data_sources,
          tools: editingAgent.tools,
          openingLines: editingAgent.opening_lines,
          capabilities: editingAgent.capabilities,
          visibility: editingAgent.visibility || 'private',
          visibility_roles: editingAgent.visibility_roles || [],
        } : undefined}
        mode={modalMode}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        onDelete={handleDelete}
        groupKey={activeTab !== 'all' ? activeTab : undefined}
        defaultAgentType="tool"
      />
    </div>
  );
}

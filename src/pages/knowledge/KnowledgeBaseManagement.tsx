/**
 * @file        知識庫管理頁面
 * @description 知識管理 - 知識庫的建立、設定與管理
 * @lastUpdate  2026-03-24 23:01:20
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Input, Radio, Space, App } from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useContentTokens } from '../../contexts/AppThemeProvider';
import { KnowledgeRoot } from '../../services/api';
import KBCardGrid from './components/KBCardGrid';
import KBTableList from './components/KBTableList';
import KBCreateModal from './components/KBCreateModal';

const { Title } = Typography;

const MOCK_KNOWLEDGE_ROOTS: KnowledgeRoot[] = [
  { _key: 'kb1', name: 'MM-Agent 知識庫', description: '物料管理規範與流程文件集', ontology_domain: 'Material_Management', ontology_majors: ['Inventory_Control', 'Quality_Management'], source_count: 12, vector_status: 'completed', graph_status: 'completed', is_favorite: true, created_at: '2026-03-01T10:00:00Z' },
  { _key: 'kb2', name: 'KA-Agent 知識庫', description: '核心知識對齊與語義標準化', ontology_domain: 'Knowledge_Alignment', ontology_majors: ['Semantic_Mapping'], source_count: 45, vector_status: 'processing', graph_status: 'pending', is_favorite: false, created_at: '2026-03-10T14:30:00Z' },
  { _key: 'kb3', name: '財務規範 2026', description: '預算編列準則與財務流程', ontology_domain: 'Financial_Standards', ontology_majors: ['Budget_Control'], source_count: 8, vector_status: 'completed', graph_status: 'completed', is_favorite: false, created_at: '2026-02-15T09:00:00Z' },
  { _key: 'kb4', name: '醫療知識庫', description: '臨床數據與醫療照護知識', ontology_domain: 'Medical_Healthcare', ontology_majors: ['Clinical_Data_Management'], source_count: 23, vector_status: 'failed', graph_status: 'pending', is_favorite: true, created_at: '2026-03-20T16:45:00Z' },
];

const MOCK_DOMAINS = [
  { label: 'Material Management', value: 'Material_Management' },
  { label: 'Knowledge Alignment', value: 'Knowledge_Alignment' },
  { label: 'Financial Standards', value: 'Financial_Standards' },
  { label: 'Medical Healthcare', value: 'Medical_Healthcare' },
];

export default function KnowledgeBaseManagement() {
  const contentTokens = useContentTokens();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [data, setData] = useState<KnowledgeRoot[]>(MOCK_KNOWLEDGE_ROOTS);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const lowerSearch = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        (item.description && item.description.toLowerCase().includes(lowerSearch))
    );
  }, [data, searchText]);

  const handleCreate = () => {
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = (id: string, values: Partial<KnowledgeRoot>) => {
    const newKb: KnowledgeRoot = {
      _key: id,
      name: values.name || '未命名知識庫',
      description: values.description || '',
      ontology_domain: values.ontology_domain || 'Unknown',
      ontology_majors: values.ontology_majors || [],
      source_count: 0,
      vector_status: 'pending',
      graph_status: 'pending',
      is_favorite: false,
      created_at: new Date().toISOString(),
    };
    setData([newKb, ...data]);
    setCreateModalVisible(false);
  };

  const handleDelete = (id: string) => {
    setLoading(true);
    setTimeout(() => {
      setData((prev) => prev.filter((item) => item._key !== id));
      message.success('知識庫已刪除');
      setLoading(false);
    }, 500);
  };

  const handleFavoriteToggle = (id: string) => {
    setData((prev) =>
      prev.map((item) =>
        item._key === id ? { ...item, is_favorite: !item.is_favorite } : item
      )
    );
  };

  const handleCopy = (id: string) => {
    const source = data.find((item) => item._key === id);
    if (!source) return;
    
    const newKb: KnowledgeRoot = {
      ...source,
      _key: `kb_copy_${Date.now()}`,
      name: `${source.name} - 副本`,
      is_favorite: false,
      created_at: new Date().toISOString(),
      vector_status: 'pending',
      graph_status: 'pending',
    };
    setData([newKb, ...data]);
    message.success('知識庫複製成功');
  };

  const handleEdit = (id: string) => {
    navigate(`/app/knowledge/management/${id}`);
  };

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: contentTokens.colorPrimary }}>
          🗄️ 知識庫管理
        </Title>
        <Space size="middle">
          <Input
            placeholder="搜尋知識庫..."
            prefix={<SearchOutlined style={{ color: contentTokens.textSecondary }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="grid">
              <AppstoreOutlined />
            </Radio.Button>
            <Radio.Button value="table">
              <BarsOutlined />
            </Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            建立知識庫
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'grid' ? (
          <KBCardGrid
            data={filteredData}
            loading={loading}
            onEdit={handleEdit}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onFavoriteToggle={handleFavoriteToggle}
          />
        ) : (
          <KBTableList
            data={filteredData}
            loading={loading}
            onEdit={handleEdit}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onFavoriteToggle={handleFavoriteToggle}
          />
        )}
      </div>

      <KBCreateModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
        domains={MOCK_DOMAINS}
      />
    </div>
  );
}
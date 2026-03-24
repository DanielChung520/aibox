/**
 * @file        Data Agent Intents 目錄管理頁面
 * @description 查看、管理 DA 的意圖目錄與模板
 * @lastUpdate  2026-03-23 21:45:17
 * @author      Daniel Chung
 */

import { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Tag, Space, Typography, 
  Descriptions, Select, Input, Drawer, Tabs, App, Statistic, Row, Col, theme, Modal, Form
} from 'antd';
import { 
  EyeOutlined, DeleteOutlined, ReloadOutlined,
  EditOutlined, PlusOutlined, CloudSyncOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { dataAgentApi, IntentCatalogEntry } from '../../services/dataAgentApi';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

type IntentType = 'aggregate' | 'filter' | 'join' | 'time_series' | 'ranking' | 'comparison';
type GenerationStrategy = 'template' | 'small_llm' | 'large_llm';

export default function IntentsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [intents, setIntents] = useState<IntentCatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<IntentCatalogEntry | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<IntentType | 'ALL'>('ALL');
  const [filterGroup, setFilterGroup] = useState<string | 'ALL'>('ALL');
  const [filterStrategy, setFilterStrategy] = useState<GenerationStrategy | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // CRUD Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIntent, setEditingIntent] = useState<IntentCatalogEntry | null>(null);
  const [form] = Form.useForm();

  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('bge-m3:latest');
  const [syncing, setSyncing] = useState(false);

  const fetchModels = async () => {
    try {
      const res = await api.get<{ models: string[] }>('/api/v1/da/intents/models');
      setModels(res.data.models || []);
    } catch { /* empty */ }
  };

  const loadIntents = async (page = 1, pageSize = 20, search?: string) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (filterType !== 'ALL') params.intent_type = filterType;
      if (filterGroup !== 'ALL') params.group = filterGroup;
      if (filterStrategy !== 'ALL') params.generation_strategy = filterStrategy;
      if (search) params.search = search;
      
      const res = await dataAgentApi.listCatalog(params);
      setIntents(res.data.data?.records || []);
      setPagination({
        current: page,
        pageSize,
        total: res.data.data?.total || 0
      });
    } catch (error) {
      message.error('載入意圖目錄失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntents();
    fetchModels();
  }, []);

  const handleDelete = async (intentId: string) => {
    try {
      await dataAgentApi.deleteIntent(intentId);
      message.success('刪除成功');
      loadIntents(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('刪除失敗');
    }
  };

  const handleSyncQdrant = async () => {
    setSyncing(true);
    try {
      const res = await dataAgentApi.syncToQdrant({ model: selectedModel });
      message.success(`同步成功，共同步 ${res.data.synced_count} 個意圖`);
    } catch (error) {
      message.error('同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  const openCreateModal = () => {
    setEditingIntent(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (intent: IntentCatalogEntry) => {
    setEditingIntent(intent);
    form.setFieldsValue({
      ...intent,
      nl_examples: intent.nl_examples ? intent.nl_examples.join('\n') : ''
    });
    setModalVisible(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const payload: IntentCatalogEntry = {
        ...values,
        nl_examples: values.nl_examples ? values.nl_examples.split('\n').filter((l: string) => l.trim()) : [],
        is_template: true
      };

      if (editingIntent && editingIntent.intent_id) {
        await dataAgentApi.updateIntent(editingIntent.intent_id, payload);
        message.success('更新意圖成功');
      } else {
        await dataAgentApi.createIntent(payload);
        message.success('新增意圖成功');
      }
      
      setModalVisible(false);
      loadIntents(pagination.current, pagination.pageSize);
    } catch (error) {
      if ((error as Record<string, unknown>).errorFields) return;
      message.error('儲存失敗');
    }
  };

  const columns = [
    { 
      title: 'Intent ID', 
      dataIndex: 'intent_id', 
      key: 'intent_id', 
      width: 120,
      render: (id: string) => <Text code>{id}</Text>
    },
    { 
      title: 'Domain Intent', 
      dataIndex: 'bpa_domain_intent', 
      key: 'bpa_domain_intent',
      width: 160,
    },
    { 
      title: 'Description', 
      dataIndex: 'description', 
      key: 'description',
      ellipsis: true
    },
    { 
      title: 'Type', 
      dataIndex: 'intent_type', 
      key: 'intent_type',
      width: 100,
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    { 
      title: 'Group', 
      dataIndex: 'group', 
      key: 'group',
      width: 80,
      render: (g: string) => <Tag color="geekblue">{g}</Tag>
    },
    { 
      title: 'Strategy', 
      dataIndex: 'generation_strategy', 
      key: 'generation_strategy',
      width: 110,
      render: (strategy: string) => {
        const color = strategy === 'template' ? 'green' : strategy === 'small_llm' ? 'blue' : 'purple';
        return <Tag color={color}>{strategy}</Tag>;
      }
    },
    {
      title: 'Tables',
      dataIndex: 'tables',
      key: 'tables',
      width: 140,
      render: (tables: string[]) => (tables || []).map(t => <Tag key={t}>{t}</Tag>)
    },
    {
      title: 'Examples',
      dataIndex: 'nl_examples',
      key: 'nl_examples',
      width: 90,
      render: (ex: string[]) => <Tag color="default">{ex?.length || 0} 個</Tag>
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: unknown, record: IntentCatalogEntry) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedIntent(record); setDrawerVisible(true); }} />
          <Button type="link" icon={<EditOutlined />} title="編輯" onClick={() => openEditModal(record)} />
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.intent_id)} />
        </Space>
      )
    }
  ];

  const intentTypeOptions = ['aggregate', 'filter', 'join', 'time_series', 'ranking', 'comparison'];
  const groupOptions = ['A', 'B', 'C', 'D', 'E', 'F'];
  const strategyOptions = ['template', 'small_llm', 'large_llm'];

  const filteredIntents = intents.filter(intent => {
    if (filterType !== 'ALL' && intent.intent_type !== filterType) return false;
    if (filterGroup !== 'ALL' && intent.group !== filterGroup) return false;
    if (filterStrategy !== 'ALL' && intent.generation_strategy !== filterStrategy) return false;
    if (searchText && !intent.description.toLowerCase().includes(searchText.toLowerCase()) && !intent.intent_id.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="總意圖數" value={pagination.total} prefix={<DatabaseOutlined />} />
        </Col>
        <Col span={6}>
          <Statistic title="模板策略" value={intents.filter(i => i.generation_strategy === 'template').length} styles={{ content: { color: token.colorSuccess } }} />
        </Col>
        <Col span={6}>
          <Statistic title="小型LLM策略" value={intents.filter(i => i.generation_strategy === 'small_llm').length} styles={{ content: { color: token.colorInfo } }} />
        </Col>
        <Col span={6}>
          <Statistic title="大型LLM策略" value={intents.filter(i => i.generation_strategy === 'large_llm').length} styles={{ content: { color: token.colorPrimary } }} />
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜尋描述或ID"
          allowClear
          style={{ width: 200 }}
          onSearch={(value) => { setSearchText(value); loadIntents(1, pagination.pageSize, value); }}
        />
        <Select value={filterType} onChange={(v) => { setFilterType(v); loadIntents(1, pagination.pageSize); }} style={{ width: 130 }}>
          <Option value="ALL">全部類型</Option>
          {intentTypeOptions.map(t => <Option key={t} value={t}>{t}</Option>)}
        </Select>
        <Select value={filterGroup} onChange={(v) => { setFilterGroup(v); loadIntents(1, pagination.pageSize); }} style={{ width: 100 }}>
          <Option value="ALL">全部分組</Option>
          {groupOptions.map(g => <Option key={g} value={g}>{g}</Option>)}
        </Select>
        <Select value={filterStrategy} onChange={(v) => { setFilterStrategy(v); loadIntents(1, pagination.pageSize); }} style={{ width: 130 }}>
          <Option value="ALL">全部策略</Option>
          {strategyOptions.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>

        <Select value={selectedModel} onChange={setSelectedModel} style={{ width: 160 }} placeholder="選擇 Embedding 模型">
          {models.length > 0 ? models.map(m => <Option key={m} value={m}>{m}</Option>) : <Option value="bge-m3:latest">bge-m3:latest</Option>}
        </Select>

        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新增意圖</Button>
        <Button icon={<CloudSyncOutlined />} onClick={handleSyncQdrant} loading={syncing}>同步到 Qdrant</Button>
        <Button icon={<ReloadOutlined />} onClick={() => loadIntents()}>重新整理</Button>
      </Space>

      <Table 
        columns={columns} dataSource={filteredIntents} rowKey="intent_id"
        loading={loading} size="small"
        pagination={{ ...pagination, onChange: (page, pageSize) => loadIntents(page, pageSize) }}
      />

      <Drawer
        title="意圖詳細資訊" placement="right" size="large"
        open={drawerVisible} onClose={() => { setDrawerVisible(false); setSelectedIntent(null); }}
      >
        {selectedIntent && (
          <Tabs items={[
            {
              key: 'basic', label: '基本資訊',
              children: (
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Intent ID"><Text code>{selectedIntent.intent_id}</Text></Descriptions.Item>
                  <Descriptions.Item label="Domain Intent">{selectedIntent.bpa_domain_intent}</Descriptions.Item>
                  <Descriptions.Item label="Description">{selectedIntent.description}</Descriptions.Item>
                  <Descriptions.Item label="Intent Type"><Tag color="blue">{selectedIntent.intent_type}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Group"><Tag color="geekblue">{selectedIntent.group}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Strategy"><Tag color="green">{selectedIntent.generation_strategy}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Is Template">{selectedIntent.is_template ? '是' : '否'}</Descriptions.Item>
                  <Descriptions.Item label="Tables">{(selectedIntent.tables || []).map(t => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
                  <Descriptions.Item label="Core Fields">{(selectedIntent.core_fields || []).map(f => <Tag key={f}>{f}</Tag>)}</Descriptions.Item>
                </Descriptions>
              )
            },
            {
              key: 'examples', label: 'NL Examples',
              children: (
                <Card size="small">
                  <ol>
                    {(selectedIntent.nl_examples || []).map((ex, i) => <li key={i} style={{ marginBottom: 8 }}>{ex}</li>)}
                  </ol>
                </Card>
              )
            },
            {
              key: 'sql', label: 'SQL Template',
              children: (
                <Card size="small">
                  <pre style={{ background: token.colorInfoBg, padding: 12, borderRadius: 4, overflow: 'auto', fontSize: 12 }}>
                    {selectedIntent.sql_template}
                  </pre>
                  {selectedIntent.sql_template && (
                    <Button type="link" style={{ marginTop: 8, padding: 0 }} onClick={() => {
                      navigator.clipboard.writeText(selectedIntent.sql_template);
                      message.success('已複製到剪貼簿');
                    }}>複製 SQL</Button>
                  )}
                </Card>
              )
            }
          ]} />
        )}
      </Drawer>

      <Modal
        title={editingIntent ? '編輯意圖' : '新增意圖'}
        open={modalVisible} onOk={handleModalSubmit} onCancel={() => setModalVisible(false)}
        width={800} okText="儲存" cancelText="取消" destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="intent_id" label="Intent ID" rules={[{ required: true, message: '請輸入 Intent ID' }]}>
                <Input disabled={!!editingIntent} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bpa_domain_intent" label="Domain Intent" rules={[{ required: true, message: '請輸入 Domain Intent' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="group" label="Group" rules={[{ required: true, message: '請選擇 Group' }]}>
                <Select>{groupOptions.map(g => <Option key={g} value={g}>{g}</Option>)}</Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="intent_type" label="Intent Type" rules={[{ required: true, message: '請選擇 Intent Type' }]}>
                <Select>{intentTypeOptions.map(t => <Option key={t} value={t}>{t}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="generation_strategy" label="Generation Strategy" rules={[{ required: true, message: '請選擇生成策略' }]}>
                <Select>{strategyOptions.map(s => <Option key={s} value={s}>{s}</Option>)}</Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: '請輸入 Description' }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tables" label="Tables"><Select mode="tags" placeholder="請輸入 Table 並按 Enter" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="core_fields" label="Core Fields"><Select mode="tags" placeholder="請輸入 Field 並按 Enter" /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="nl_examples" label="NL Examples (每行一個)" rules={[{ required: true, message: '請輸入至少一個 NL Example' }]}>
            <TextArea rows={4} placeholder="請輸入自然語言範例，每行一個" />
          </Form.Item>
          <Form.Item name="sql_template" label="SQL Template" rules={[{ required: true, message: '請輸入 SQL Template' }]}>
            <TextArea rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

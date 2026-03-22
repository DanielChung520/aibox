/**
 * @file        Data Agent Intents 管理頁面
 * @description 查看、管理 DA 的意圖歷史記錄與模板
 * @lastUpdate  2026-03-22 19:56:42
 * @author      Daniel Chung
 */

import { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Tag, Space, Typography, 
  Descriptions, Badge, Select, Input, Drawer, Tabs, App, Statistic, Row, Col, theme, Modal, Form
} from 'antd';
import { 
  EyeOutlined, DeleteOutlined, ReloadOutlined, 
  CheckCircleOutlined, CloseCircleOutlined,
  DatabaseOutlined, ThunderboltOutlined,
  EditOutlined, PlusOutlined, CloudSyncOutlined
} from '@ant-design/icons';
import { dataAgentApi, IntentRecord, IntentCatalogEntry, OllamaModel } from '../../services/dataAgentApi';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

type IntentType = 'aggregate' | 'filter' | 'join' | 'time_series' | 'ranking' | 'comparison';

export default function IntentsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [intents, setIntents] = useState<IntentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<IntentRecord | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterType, setFilterType] = useState<IntentType | 'ALL'>('ALL');
  const [filterCacheHit, setFilterCacheHit] = useState<boolean | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // CRUD Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIntent, setEditingIntent] = useState<IntentCatalogEntry | null>(null);
  const [form] = Form.useForm();

  // Qdrant Sync & LLM Selector State
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('bge-m3:latest');
  const [syncing, setSyncing] = useState(false);

  const fetchModels = async () => {
    try {
      const res = await fetch('http://localhost:8006/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      // silently fail, models optional
    }
  };

  const loadIntents = async (page = 1, pageSize = 20, search?: string) => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (filterType !== 'ALL') params.intent_type = filterType;
      if (filterCacheHit !== 'ALL') params.cache_hit = filterCacheHit;
      if (search) params.search = search;
      
      const res = await dataAgentApi.listIntents(params);
      setIntents(res.data.data?.records || []);
      setPagination({
        current: page,
        pageSize,
        total: res.data.data?.total || 0
      });
    } catch (error) {
      message.error('載入意圖記錄失敗');
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

  const handleReVectorize = async (intentId: string) => {
    try {
      await dataAgentApi.reVectorize(intentId);
      message.success('重新向量化成功');
      loadIntents(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('操作失敗');
    }
  };

  const handleMarkAsTemplate = async (intentId: string) => {
    try {
      await dataAgentApi.markAsTemplate(intentId);
      message.success('標記為模板成功');
      loadIntents(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('操作失敗');
    }
  };

  const handleSyncQdrant = async () => {
    setSyncing(true);
    try {
      const res = await dataAgentApi.syncToQdrant({ model: selectedModel });
      message.success(`同步成功，共同步 ${res.data.data.synced} 個意圖`);
      loadIntents(pagination.current, pagination.pageSize);
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

  const openEditModal = async (intentId: string) => {
    try {
      const res = await dataAgentApi.getIntent(intentId);
      const intentData = res.data.data.intent_json as any;
      setEditingIntent(intentData);
      
      form.setFieldsValue({
        ...intentData,
        nl_examples: intentData.nl_examples ? intentData.nl_examples.join('\n') : ''
      });
      setModalVisible(true);
    } catch (error) {
      message.error('獲取意圖詳細資料失敗');
    }
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
      // Form validation errors or API errors
      if ((error as any).errorFields) return;
      message.error('儲存失敗');
    }
  };

  const columns = [
    { 
      title: 'Intent ID', 
      dataIndex: 'intent_id', 
      key: 'intent_id', 
      width: 150,
      render: (id: string) => <Text code>{id.substring(0, 12)}...</Text>
    },
    { 
      title: 'Query', 
      dataIndex: 'original_query', 
      key: 'original_query',
      ellipsis: true,
      render: (query: string) => (
        <Text ellipsis style={{ maxWidth: 250 }}>{query}</Text>
      )
    },
    { 
      title: 'Type', 
      dataIndex: 'intent_type', 
      key: 'intent_type',
      width: 100,
      render: (type: IntentType) => {
        const colors: Record<IntentType, string> = {
          'aggregate': 'blue',
          'filter': 'green',
          'join': 'purple',
          'time_series': 'orange',
          'ranking': 'cyan',
          'comparison': 'magenta'
        };
        return <Tag color={colors[type]}>{type}</Tag>;
      }
    },
    { 
      title: 'Confidence', 
      dataIndex: 'confidence', 
      key: 'confidence',
      width: 100,
      render: (conf: number) => (
        <Badge 
          status={conf >= 0.7 ? 'success' : 'warning'} 
          text={`${(conf * 100).toFixed(0)}%`} 
        />
      )
    },
     { 
       title: 'Cache', 
       dataIndex: 'cache_hit', 
       key: 'cache_hit',
       width: 80,
       render: (hit: boolean) => hit ? 
         <CheckCircleOutlined style={{ color: token.colorSuccess }} /> : 
         <CloseCircleOutlined style={{ color: token.colorError }} />
     },
    { 
      title: 'Duration', 
      dataIndex: 'duration_ms', 
      key: 'duration_ms',
      width: 80,
      render: (ms: number) => `${ms}ms`
    },
    { 
      title: 'Rows', 
      dataIndex: ['result_summary', 'row_count'], 
      key: 'row_count',
      width: 80,
      render: (count: number) => count || '-'
    },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: (ts: string) => new Date(ts).toLocaleString('zh-TW')
    },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_: any, record: IntentRecord) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => {
              setSelectedIntent(record);
              setDrawerVisible(true);
            }}
          />
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            title="編輯意圖"
            onClick={() => openEditModal(record.intent_id)}
          />
          <Button 
            type="link" 
            icon={<ThunderboltOutlined />} 
            title="重新向量化"
            onClick={() => handleReVectorize(record.intent_id)}
          />
          <Button 
            type="link" 
            icon={<DatabaseOutlined />} 
            title="標記為模板"
            onClick={() => handleMarkAsTemplate(record.intent_id)}
          />
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.intent_id)}
          />
        </Space>
      )
    }
  ];

  const intentTypeOptions: IntentType[] = ['aggregate', 'filter', 'join', 'time_series', 'ranking', 'comparison'];

  const filteredIntents = intents.filter(intent => {
    if (filterType !== 'ALL' && intent.intent_type !== filterType) return false;
    if (filterCacheHit !== 'ALL' && intent.cache_hit !== filterCacheHit) return false;
    if (searchText && !intent.original_query.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Statistic 
            title="總記錄數" 
            value={pagination.total} 
            prefix={<DatabaseOutlined />} 
          />
        </Col>
         <Col span={4}>
           <Statistic 
             title="快取命中" 
             value={intents.filter(i => i.cache_hit).length} 
             styles={{ content: { color: token.colorSuccess } }}
             suffix={`/ ${intents.length}`}
           />
         </Col>
         <Col span={4}>
           <Statistic 
             title="平均 Confidence" 
             value={(intents.reduce((acc, i) => acc + i.confidence, 0) / (intents.length || 1) * 100).toFixed(1)} 
             suffix="%"
             styles={{ content: { color: token.colorInfo } }}
           />
         </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜尋查詢內容"
          allowClear
          style={{ width: 250 }}
          onSearch={(value) => {
            setSearchText(value);
            loadIntents(1, pagination.pageSize, value);
          }}
        />
        <Select
          value={filterType}
          onChange={(value) => {
            setFilterType(value);
            loadIntents(1, pagination.pageSize);
          }}
          style={{ width: 150 }}
        >
          <Option value="ALL">全部類型</Option>
          {intentTypeOptions.map(type => (
            <Option key={type} value={type}>{type}</Option>
          ))}
        </Select>
        <Select
          value={filterCacheHit}
          onChange={(value) => {
            setFilterCacheHit(value);
            loadIntents(1, pagination.pageSize);
          }}
          style={{ width: 120 }}
        >
          <Option value="ALL">全部</Option>
          <Option value={true}>命中</Option>
          <Option value={false}>未命中</Option>
        </Select>

        <Select
          value={selectedModel}
          onChange={setSelectedModel}
          style={{ width: 200 }}
          placeholder="選擇 LLM 模型"
        >
          {models.length > 0 ? (
            models.map(model => (
              <Option key={model.name} value={model.name}>{model.name}</Option>
            ))
          ) : (
            <Option value="bge-m3:latest">bge-m3:latest</Option>
          )}
        </Select>

        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={openCreateModal}
        >
          新增意圖
        </Button>

        <Button 
          icon={<CloudSyncOutlined />} 
          onClick={handleSyncQdrant}
          loading={syncing}
        >
          同步到 Qdrant
        </Button>

        <Button icon={<ReloadOutlined />} onClick={() => loadIntents()}>重新整理</Button>
      </Space>

      <Table 
        columns={columns} 
        dataSource={filteredIntents} 
        rowKey="intent_id"
        loading={loading}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => loadIntents(page, pageSize)
        }}
        size="small"
      />

      <Drawer
        title="Intent 詳細資訊"
        placement="right"
        size="large"
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedIntent(null);
        }}
      >
        {selectedIntent && (
          <Tabs 
            items={[
              {
                key: 'basic',
                label: '基本資訊',
                children: (
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Intent ID">
                      <Text code>{selectedIntent.intent_id}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Original Query">
                      {selectedIntent.original_query}
                    </Descriptions.Item>
                    <Descriptions.Item label="Intent Type">
                      <Tag color="blue">{selectedIntent.intent_type}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Confidence">
                      {(selectedIntent.confidence * 100).toFixed(1)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Cache Hit">
                      {selectedIntent.cache_hit ? '是' : '否'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Duration">
                      {selectedIntent.duration_ms}ms
                    </Descriptions.Item>
                    <Descriptions.Item label="Row Count">
                      {selectedIntent.result_summary?.row_count || 0}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                      {new Date(selectedIntent.created_at).toLocaleString('zh-TW')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Session ID">
                      <Text code>{selectedIntent.session_id}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="User ID">
                      {selectedIntent.user_id}
                    </Descriptions.Item>
                  </Descriptions>
                )
              },
               {
                 key: 'intent',
                 label: 'Intent JSON',
                 children: (
                   <Card size="small">
                     <pre style={{ 
                       background: token.colorFillTertiary, 
                       padding: 12, 
                       borderRadius: 4,
                       overflow: 'auto',
                       maxHeight: 400,
                       fontSize: 12
                     }}>
                       {JSON.stringify(selectedIntent.intent_json, null, 2)}
                     </pre>
                   </Card>
                 )
               },
               {
                 key: 'sql',
                 label: 'Generated SQL',
                 children: (
                   <Card size="small">
                     <pre style={{ 
                       background: token.colorInfoBg, 
                       padding: 12, 
                       borderRadius: 4,
                       overflow: 'auto',
                       fontSize: 12
                     }}>
                       {selectedIntent.sql_generated}
                     </pre>
                    {selectedIntent.sql_generated && (
                      <Button 
                        type="link" 
                        style={{ marginTop: 8, padding: 0 }}
                        onClick={() => {
                          navigator.clipboard.writeText(selectedIntent.sql_generated);
                          message.success('已複製到剪貼簿');
                        }}
                      >
                        複製 SQL
                      </Button>
                    )}
                  </Card>
                )
              },
              {
                key: 'result',
                label: '結果預覽',
                children: (
                  <Card size="small">
                    {selectedIntent.result_summary?.sample?.length ? (
                      <Table 
                        dataSource={selectedIntent.result_summary.sample}
                        columns={Object.keys(selectedIntent.result_summary.sample[0] || {}).map(key => ({
                          title: key,
                          dataIndex: key,
                          key,
                          width: 120
                        }))}
                        pagination={false}
                        size="small"
                      />
                    ) : (
                      <Text type="secondary">無結果樣本</Text>
                    )}
                  </Card>
                )
              }
            ]}
          />
        )}
      </Drawer>

       <Modal
         title={editingIntent ? '編輯意圖' : '新增意圖'}
         open={modalVisible}
         onOk={handleModalSubmit}
         onCancel={() => setModalVisible(false)}
         width={800}
         okText="儲存"
         cancelText="取消"
         forceRender
       >
         <Form
           form={form}
           layout="vertical"
         >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="intent_id"
                label="Intent ID"
                rules={[{ required: true, message: '請輸入 Intent ID' }]}
              >
                <Input disabled={!!editingIntent} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bpa_domain_intent"
                label="BPA Domain Intent"
                rules={[{ required: true, message: '請輸入 BPA Domain Intent' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="intent_type"
                label="DA Intent Type"
                rules={[{ required: true, message: '請選擇 Intent Type' }]}
              >
                <Select>
                  {intentTypeOptions.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="group"
                label="Group"
                rules={[{ required: true, message: '請選擇 Group' }]}
              >
                <Select>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(g => (
                    <Option key={g} value={g}>{g}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: '請輸入 Description' }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tables"
                label="Tables"
              >
                <Select mode="tags" placeholder="請輸入 Table 名稱並按 Enter" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="core_fields"
                label="Core Fields"
              >
                <Select mode="tags" placeholder="請輸入 Field 名稱並按 Enter" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="nl_examples"
            label="NL Examples (每行一個)"
            rules={[{ required: true, message: '請輸入至少一個 NL Example' }]}
          >
            <TextArea rows={4} placeholder="請輸入自然語言範例，每行一個" />
          </Form.Item>

          <Form.Item
            name="sql_template"
            label="SQL Template"
            rules={[{ required: true, message: '請輸入 SQL Template' }]}
          >
            <TextArea rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

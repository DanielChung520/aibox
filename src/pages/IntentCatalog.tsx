/**
 * @file        統一意圖目錄管理頁面
 * @description 支援 orchestrator / data_agent 範圍切換的意圖 CRUD 管理
 * @lastUpdate  2026-03-28 12:09:54
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState, useEffect, useMemo } from 'react';
import { App, Row, Col, Statistic, Space, Input, Select, Button, Table, Tag, Drawer, Modal, Form, InputNumber, Typography, Tabs } from 'antd';
import type { TableColumnsType } from 'antd';
import { SyncOutlined, ReloadOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { intentCatalogApi, IntentCatalogEntry, AgentScope } from '../services/intentCatalogApi';
import { paramsApi } from '../services/api';

const { TextArea } = Input;
const { Text } = Typography;

interface IntentCatalogProps {
  scope: AgentScope;
}

export default function IntentCatalog({ scope }: IntentCatalogProps) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  
  const activeScope = scope;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IntentCatalogEntry[]>([]);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [orchIntentType, setOrchIntentType] = useState<string>('');
  const [daGroup, setDaGroup] = useState<string>('');
  const [daGenStrategy, setDaGenStrategy] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<IntentCatalogEntry | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await intentCatalogApi.list({
        agent_scope: activeScope,
        page: 1,
        page_size: 1000,
        search: search || undefined,
        status: status || undefined,
        intent_type: activeScope === 'orchestrator' ? orchIntentType || undefined : undefined,
        group: activeScope === 'data_agent' ? daGroup || undefined : undefined,
        generation_strategy: activeScope === 'data_agent' ? daGenStrategy || undefined : undefined,
      });
      if (res.data.code === 0) {
        setData(res.data.data.records);
        setTotal(res.data.data.total);
      }
    } catch (e: unknown) {
      message.error('載入意圖失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope, status, orchIntentType, daGroup, daGenStrategy]);

  const loadSettings = async () => {
    try {
      const res = await paramsApi.list();
      if (res.data.code === 0) {
        const p = res.data.data.reduce((acc, curr) => ({ ...acc, [curr.param_key]: curr.param_value }), {} as Record<string, string>);
        if (activeScope === 'orchestrator') {
          settingsForm.setFieldsValue({
            embeddingModel: p['orch.embedding_model'],
            embeddingDimension: Number(p['orch.embedding_dimension']),
            matchThreshold: Number(p['orch.match_threshold']),
          });
        } else {
          settingsForm.setFieldsValue({
            embeddingModel: p['da.embedding_model'],
            embeddingDimension: Number(p['da.embedding_dimension']),
            smallLlmModel: p['da.small_llm_model'],
            largeLlmModel: p['da.large_llm_model'],
          });
        }
      }
    } catch (e: unknown) {
      message.error('載入設定失敗');
    }
  };

  useEffect(() => {
    if (isSettingsOpen) loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen, activeScope]);

  const handleSettingsSave = async () => {
    try {
      const vals = await settingsForm.validateFields();
      const updates = activeScope === 'orchestrator' 
        ? [
            paramsApi.update('orch.embedding_model', vals.embeddingModel),
            paramsApi.update('orch.embedding_dimension', String(vals.embeddingDimension)),
            paramsApi.update('orch.match_threshold', String(vals.matchThreshold)),
          ]
        : [
            paramsApi.update('da.embedding_model', vals.embeddingModel),
            paramsApi.update('da.embedding_dimension', String(vals.embeddingDimension)),
            paramsApi.update('da.small_llm_model', vals.smallLlmModel),
            paramsApi.update('da.large_llm_model', vals.largeLlmModel),
          ];
      await Promise.all(updates);
      message.success('設定已儲存');
      setIsSettingsOpen(false);
    } catch (e: unknown) {
      message.error('儲存設定失敗');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const vals = settingsForm.getFieldsValue();
      const res = await intentCatalogApi.syncToQdrant({ agent_scope: activeScope, model: vals.embeddingModel });
      if (res.data.code === 0) {
        message.success(`同步成功，共 ${res.data.data.synced_count} 筆`);
      }
    } catch (e: unknown) {
      message.error('同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (id: string) => {
    modal.confirm({
      title: '確認刪除',
      content: `確定要刪除意圖 ${id} 嗎？`,
      onOk: async () => {
        try {
          await intentCatalogApi.delete(id);
          message.success('刪除成功');
          loadData();
        } catch (e: unknown) {
          message.error('刪除失敗');
        }
      }
    });
  };

  const openNew = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'enabled', priority: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (record: IntentCatalogEntry) => {
    setEditingId(record.intent_id);
    form.resetFields();
    form.setFieldsValue({
      ...record,
      nl_examples: record.nl_examples?.join('\n') || '',
      ...record.config,
      example_sqls: (record.config?.example_sqls as string[])?.join('\n---\n') || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      const { intent_id, name, description, priority, status, nl_examples, ...config } = vals;
      
      const payload: Partial<IntentCatalogEntry> = {
        intent_id, name, description, priority, status,
        agent_scope: activeScope,
        nl_examples: nl_examples ? nl_examples.split('\n').map((s: string) => s.trim()).filter(Boolean) : [],
        config: { ...config }
      };

      if (activeScope === 'data_agent' && config.example_sqls) {
        payload.config!.example_sqls = config.example_sqls.split('\n---\n').map((s: string) => s.trim()).filter(Boolean);
      }

      if (editingId) {
        await intentCatalogApi.update(editingId, payload);
        message.success('更新成功');
      } else {
        await intentCatalogApi.create(payload);
        message.success('新增成功');
      }
      setIsModalOpen(false);
      loadData();
    } catch (e: unknown) {
      message.error('儲存失敗');
    }
  };

  const stats = useMemo(() => {
    if (activeScope === 'orchestrator') {
      const tool = data.filter(d => d.config?.intent_type === 'tool').length;
      const wf = data.filter(d => d.config?.intent_type === 'workflow').length;
      const fb = data.filter(d => d.config?.intent_type === 'fallback').length;
      return [
        { title: '總意圖數', value: total },
        { title: '工具型', value: tool, color: '#52c41a' },
        { title: '工作流型', value: wf, color: '#1677ff' },
        { title: '備援型', value: fb, color: '#fa8c16' },
      ];
    } else {
      const tpl = data.filter(d => d.config?.generation_strategy === 'template').length;
      const sLLM = data.filter(d => d.config?.generation_strategy === 'small_llm').length;
      const lLLM = data.filter(d => d.config?.generation_strategy === 'large_llm').length;
      return [
        { title: '總意圖數', value: total },
        { title: '模板策略', value: tpl, color: '#52c41a' },
        { title: '小型LLM策略', value: sLLM, color: '#1677ff' },
        { title: '大型LLM策略', value: lLLM, color: '#722ed1' },
      ];
    }
  }, [data, total, activeScope]);

  const columns = useMemo(() => {
    const base: TableColumnsType<IntentCatalogEntry> = [
      { title: '意圖 ID', dataIndex: 'intent_id', render: (t: string) => <Text code>{t}</Text> },
      { title: '名稱', dataIndex: 'name' },
      { title: '描述', dataIndex: 'description', ellipsis: true },
    ];
    
    if (activeScope === 'orchestrator') {
      base.push(
        { title: '類型', dataIndex: ['config', 'intent_type'], render: (t: string) => {
          const c = t === 'tool' ? 'green' : t === 'workflow' ? 'blue' : 'orange';
          return <Tag color={c}>{t}</Tag>;
        }},
        { title: '工具', dataIndex: ['config', 'tool_name'], render: (t: string) => t ? <Tag color="geekblue">{t}</Tag> : '-' },
        { title: '信心閾值', dataIndex: ['config', 'confidence_threshold'], render: (t: number) => t ? `${(t*100).toFixed(0)}%` : '-' }
      );
    } else {
      base.push(
        { title: '類型', dataIndex: ['config', 'intent_type'], render: (t: string) => <Tag color="blue">{t}</Tag> },
        { title: '群組', dataIndex: ['config', 'group'], render: (t: string) => t ? <Tag color="geekblue">{t}</Tag> : '-' },
        { title: '策略', dataIndex: ['config', 'generation_strategy'], render: (t: string) => {
          const c = t === 'template' ? 'green' : t === 'small_llm' ? 'blue' : 'purple';
          return <Tag color={c}>{t}</Tag>;
        }},
        { title: '表', dataIndex: ['config', 'tables'], render: (t: string[]) => t?.map(x => <Tag key={x}>{x}</Tag>) || '-' }
      );
    }

    base.push(
      { title: '狀態', dataIndex: 'status', render: (t: string) => <Tag color={t === 'enabled' ? 'green' : 'default'}>{t === 'enabled' ? '啟用' : '停用'}</Tag> },
      { title: '優先級', dataIndex: 'priority' },
      { title: 'NL', dataIndex: 'nl_examples', render: (t: string[]) => t?.length || 0 },
      { title: '操作', dataIndex: 'action', render: (_: unknown, r: IntentCatalogEntry) => (
        <Space>
          <a onClick={() => setViewItem(r)}>查看</a>
          <a onClick={() => openEdit(r)}>編輯</a>
          <a onClick={() => handleDelete(r.intent_id)} style={{ color: 'red' }}>刪除</a>
        </Space>
      )}
    );
    return base;
  }, [activeScope]);

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {stats.map(s => (
          <Col span={6} key={s.title}>
            <Statistic title={s.title} value={s.value} styles={{ content: { color: s.color } }} />
          </Col>
        ))}
      </Row>

      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search placeholder="搜尋意圖 ID / 名稱" value={search} onChange={e => setSearch(e.target.value)} onSearch={loadData} style={{ width: 200 }} />
          <Select value={status} onChange={setStatus} style={{ width: 120 }} options={[{label:'全部狀態',value:''},{label:'啟用',value:'enabled'},{label:'停用',value:'disabled'}]} />
          {activeScope === 'orchestrator' ? (
            <Select value={orchIntentType} onChange={setOrchIntentType} style={{ width: 120 }} options={[{label:'全部類型',value:''},{label:'Tool',value:'tool'},{label:'Workflow',value:'workflow'},{label:'Fallback',value:'fallback'}]} />
          ) : (
            <>
              <Select value={daGroup} onChange={setDaGroup} style={{ width: 100 }} options={[{label:'全群組',value:''}, ...Array.from('ABCDEF').map(x=>({label:x,value:x}))]} />
              <Select value={daGenStrategy} onChange={setDaGenStrategy} style={{ width: 140 }} options={[{label:'全策略',value:''},{label:'Template',value:'template'},{label:'Small LLM',value:'small_llm'},{label:'Large LLM',value:'large_llm'}]} />
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadData}>重整</Button>
        </Space>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setIsSettingsOpen(true)}>設定</Button>
          <Button icon={<SyncOutlined />} onClick={handleSync} loading={syncing}>同步 Qdrant</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新增</Button>
        </Space>
      </Space>

      <Table columns={columns} dataSource={data} rowKey="intent_id" loading={loading} pagination={{ pageSize: 20 }} />

      <Drawer title="意圖詳情" open={!!viewItem} onClose={() => setViewItem(null)} width={600} destroyOnHidden>
        {viewItem && (
          <Tabs items={[
            { key: 'basic', label: '基本資訊', children: <pre>{JSON.stringify(viewItem, null, 2)}</pre> },
            { key: 'nl', label: 'NL Examples', children: <ul>{viewItem.nl_examples?.map((e, i) => <li key={i}>{e}</li>)}</ul> },
            ...(activeScope === 'data_agent' ? [{ key: 'sql', label: 'SQL Template', children: <pre>{String(viewItem.config?.sql_template || '無')}</pre> }] : [])
          ]} />
        )}
      </Drawer>

      <Modal title={editingId ? '編輯意圖' : '新增意圖'} open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSave} width={700} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="intent_id" label="意圖 ID" rules={[{ required: true }]}><Input disabled={!!editingId} /></Form.Item></Col>
            <Col span={12}><Form.Item name="name" label="名稱" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
          
          {activeScope === 'orchestrator' ? (
            <Row gutter={16}>
              <Col span={8}><Form.Item name="intent_type" label="類型" rules={[{ required: true }]}><Select options={[{label:'tool',value:'tool'},{label:'workflow',value:'workflow'},{label:'fallback',value:'fallback'}]} /></Form.Item></Col>
              <Col span={8}><Form.Item name="tool_name" label="工具名稱"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="confidence_threshold" label="信心閾值"><InputNumber min={0} max={1} step={0.05} style={{width:'100%'}} /></Form.Item></Col>
            </Row>
          ) : (
            <>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="bpa_domain_intent" label="BPA 領域意圖"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="intent_type" label="查詢類型" rules={[{ required: true }]}><Select options={['aggregate','filter','join','time_series','ranking','comparison'].map(x=>({label:x,value:x}))} /></Form.Item></Col>
                <Col span={8}><Form.Item name="group" label="群組" rules={[{ required: true }]}><Select options={Array.from('ABCDEF').map(x=>({label:x,value:x}))} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="generation_strategy" label="生成策略" rules={[{ required: true }]}><Select options={[{label:'template',value:'template'},{label:'small_llm',value:'small_llm'},{label:'large_llm',value:'large_llm'}]} /></Form.Item></Col>
                <Col span={16}><Form.Item name="tables" label="關聯表"><Select mode="tags" /></Form.Item></Col>
              </Row>
              <Form.Item name="core_fields" label="核心欄位"><Select mode="tags" /></Form.Item>
              <Form.Item name="sql_template" label="SQL Template"><TextArea rows={3} style={{fontFamily:'monospace'}} /></Form.Item>
              <Form.Item name="example_sqls" label="Example SQLs (用 \n---\n 分隔)"><TextArea rows={3} style={{fontFamily:'monospace'}} /></Form.Item>
            </>
          )}

          <Form.Item name="nl_examples" label="NL Examples (每行一個)"><TextArea rows={4} /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="priority" label="優先級"><InputNumber min={0} style={{width:'100%'}} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="狀態"><Select options={[{label:'啟用',value:'enabled'},{label:'停用',value:'disabled'}]} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Drawer title={`${activeScope === 'orchestrator' ? 'Orchestrator' : 'Data Agent'} 設定`} open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} destroyOnHidden width={400}>
        <Form form={settingsForm} layout="vertical">
          <Form.Item name="embeddingModel" label="Embedding Model"><Input /></Form.Item>
          <Form.Item name="embeddingDimension" label="Embedding Dimension"><InputNumber style={{width:'100%'}} /></Form.Item>
          {activeScope === 'orchestrator' ? (
            <Form.Item name="matchThreshold" label="Match Threshold"><InputNumber min={0} max={1} step={0.05} style={{width:'100%'}} /></Form.Item>
          ) : (
            <>
              <Form.Item name="smallLlmModel" label="Small LLM Model"><Input /></Form.Item>
              <Form.Item name="largeLlmModel" label="Large LLM Model"><Input /></Form.Item>
            </>
          )}
          <Button type="primary" onClick={handleSettingsSave} block>儲存設定</Button>
        </Form>
      </Drawer>
    </div>
  );
}

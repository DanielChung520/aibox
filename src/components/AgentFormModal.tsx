/**
 * @file        Agent 表單組件
 * @description Agent 創建/編輯 Modal，包含基本資訊、權限配置、模型配置
 * @lastUpdate  2026-03-18 08:00:00
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Tabs, Button, Space, App, Radio } from 'antd';
import { iconMap } from '../utils/icons';
import IconPicker from './IconPicker';
import { roleApi } from '../services/api';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'registering' | 'online' | 'maintenance' | 'deprecated';
  usageCount: number;
  groupKey?: string;
  agentType?: string;
  source?: 'local' | 'third_party';
  endpointUrl?: string;
  apiKey?: string;
  authType?: 'none' | 'bearer' | 'basic' | 'oauth2';
  llmModel?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  knowledgeBases?: string[];
  dataSources?: string[];
  tools?: string[];
  openingLines?: string[];
  capabilities?: string[];
  visibility?: 'public' | 'private' | 'role';
  visibility_roles?: string[];
  group_key?: string;
  agent_type?: string;
  endpoint_url?: string;
  api_key?: string;
  auth_type?: string;
  llm_model?: string;
  max_tokens?: number;
  system_prompt?: string;
  knowledge_bases?: string[];
  data_sources?: string[];
  opening_lines?: string[];
}

const { TextArea } = Input;

const statusOptions = [
  { value: 'online', label: '在線' },
  { value: 'maintenance', label: '維修中' },
  { value: 'deprecated', label: '已作廢' },
];

const agentTypeOptions = [
  { value: 'knowledge', label: '知識代理' },
  { value: 'data', label: '資料代理' },
  { value: 'bpa', label: 'BPA代理' },
  { value: 'tool', label: '工具代理' },
];

const authTypeOptions = [
  { value: 'none', label: '無' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'oauth2', label: 'OAuth 2.0' },
];

const llmModelOptions = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'llama3', label: 'Llama 3' },
  { value: 'llama2', label: 'Llama 2' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'claude-3', label: 'Claude 3' },
];

interface AgentFormModalProps {
  open: boolean;
  agent?: Agent | null;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: Partial<Agent>) => void;
  onDelete?: (agentId: string) => void;
  groupKey?: string;
  defaultAgentType?: string;
}

export default function AgentFormModal({ 
  open, 
  agent, 
  mode, 
  onCancel,
  onSubmit,
  onDelete,
  groupKey,
  defaultAgentType = 'tool',
}: AgentFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'role'>('private');
  useEffect(() => {
    roleApi.list().then((res: any) => {
      const opts = (res.data.data || []).map((r: any) => ({ value: r._key, label: r.name }));
      setRoles(opts);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && agent && mode === 'edit') {
      form.setFieldsValue({
        ...agent,
        agentType: agent.agentType || agent.agent_type || defaultAgentType,
        groupKey: agent.groupKey || agent.group_key || 'productivity',
        endpointUrl: agent.endpointUrl || agent.endpoint_url || '',
        apiKey: agent.apiKey || agent.api_key || '',
        llmModel: agent.llmModel || agent.llm_model || '',
        maxTokens: agent.maxTokens ?? agent.max_tokens ?? 2000,
        systemPrompt: agent.systemPrompt || agent.system_prompt || '',
        knowledgeBases: agent.knowledgeBases || agent.knowledge_bases || [],
        dataSources: agent.dataSources || agent.data_sources || [],
        source: agent.source || 'local',
        authType: agent.authType || agent.auth_type || 'none',
        openingLines: agent.openingLines || agent.opening_lines || [],
        visibility: agent.visibility || 'private',
        visibility_roles: agent.visibility_roles || [],
      });
      setVisibility(agent.visibility || 'private');
      setIsThirdParty(agent.source === 'third_party');
    } else if (open && mode === 'create') {
      form.setFieldsValue({
        status: 'online',
        source: 'local',
        authType: 'none',
        groupKey: groupKey || 'productivity',
        knowledgeBases: [],
        dataSources: [],
        tools: [],
        openingLines: [],
        capabilities: [],
        temperature: 0.7,
        maxTokens: 2000,
        visibility: 'private',
        visibility_roles: [],
      });
      setVisibility('private');
      setIsThirdParty(false);
    }
  }, [open, agent, mode, form, groupKey]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (err) {
      message.error('請填寫必填欄位');
    }
  };

  const handleDelete = () => {
    if (agent?.id && onDelete) {
      Modal.confirm({
        title: '確認刪除',
        content: `確定要刪除 Agent「${agent.name}」嗎？此操作無法復原。`,
        okText: '刪除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => onDelete(agent.id),
      });
    }
  };

  const IconPreview = () => {
    const iconValue = form.getFieldValue('icon');
    const IconComp = iconValue ? iconMap[iconValue] : null;
    return IconComp ? <IconComp style={{ fontSize: 20 }} /> : null;
  };

  const infoTabItems = [
    {
      key: 'basic',
      label: '基本資訊',
      children: (
        <>
          <Form.Item label="圖標">
            <Space>
              <Button onClick={() => setIconPickerVisible(true)}>
                <Space>
                  <IconPreview />
                  選擇圖標
                </Space>
              </Button>
              <span>{form.getFieldValue('icon') || '未設置'}</span>
            </Space>
          </Form.Item>
          <Form.Item name="name" label="名稱" rules={[{ required: true, message: '請輸入名稱' }]}>
            <Input placeholder="例如：文檔處理助手" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="描述這個 Agent 的用途..." />
          </Form.Item>
          <Form.Item name="status" label="狀態" initialValue="online">
            <Select options={statusOptions} />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'category',
      label: '分類',
      children: (
        <>
          <Form.Item name="agentType" label="類型" initialValue={defaultAgentType}>
            <Select options={agentTypeOptions} placeholder="選擇 Agent 類型" />
          </Form.Item>
          <Form.Item name="groupKey" label="分組 Key">
            <Input placeholder="例如：productivity, finance, inventory" />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'source',
      label: '來源',
      children: (
        <>
          <Form.Item name="source" label="來源" valuePropName="checked">
            <Switch 
              checkedChildren="第三方" 
              unCheckedChildren="本機" 
              defaultChecked={false}
              onChange={(checked) => setIsThirdParty(checked)}
            />
          </Form.Item>
          <Form.Item 
            name="endpointUrl" 
            label="Endpoint URL" 
            rules={[{ required: true, message: '請輸入 Endpoint URL' }]}
          >
            <Input placeholder={isThirdParty ? 'https://api.example.com/agent' : 'http://localhost:8000'} />
          </Form.Item>
          {isThirdParty && (
            <>
              <Form.Item name="apiKey" label="API Key">
                <Input.Password placeholder="第三方 API Key" />
              </Form.Item>
              <Form.Item name="authType" label="認證方式" initialValue="none">
                <Select options={authTypeOptions} />
              </Form.Item>
            </>
          )}
        </>
      ),
    },
  ];

  const permissionTab = (
    <>
      <Form.Item label="可見性" name="visibility" initialValue="private">
        <Radio.Group value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <Radio.Button value="public">公開</Radio.Button>
          <Radio.Button value="private">私人</Radio.Button>
          <Radio.Button value="role">按角色</Radio.Button>
        </Radio.Group>
      </Form.Item>
      {visibility === 'role' && (
        <Form.Item label="可見角色" name="visibility_roles">
          <Select mode="multiple" placeholder="選擇可見的角色" options={roles} />
        </Form.Item>
      )}
      <Form.Item name="knowledgeBases" label="知識庫權限">
        <Select 
          mode="multiple" 
          placeholder="選擇可存取的知識庫"
          options={[
            { value: 'kb-001', label: '產品文檔' },
            { value: 'kb-002', label: '公司政策' },
            { value: 'kb-003', label: '技術手冊' },
            { value: 'kb-004', label: 'FAQ' },
          ]}
        />
      </Form.Item>
      <Form.Item name="dataSources" label="資料權限">
        <Select 
          mode="multiple" 
          placeholder="選擇可存取的資料來源"
          options={[
            { value: 'db-sales', label: '銷售資料庫' },
            { value: 'db-finance', label: '財務資料庫' },
            { value: 'db-hr', label: '人資資料庫' },
            { value: 'db-inventory', label: '庫存資料庫' },
          ]}
        />
      </Form.Item>
      <Form.Item name="tools" label="工具權限">
        <Select 
          mode="multiple" 
          placeholder="選擇可使用的工具"
          options={[
            { value: 'tool-web-search', label: '網路搜尋' },
            { value: 'tool-file-read', label: '檔案讀取' },
            { value: 'tool-calendar', label: '行事曆' },
            { value: 'tool-email', label: '郵件發送' },
          ]}
        />
      </Form.Item>
    </>
  );

  const modelTab = (
    <>
      <Form.Item name="llmModel" label="LLM 模型">
        <Select options={llmModelOptions} placeholder="選擇模型" />
      </Form.Item>
      <Form.Item name="temperature" label="Temperature" initialValue={0.7}>
        <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="maxTokens" label="最大 Tokens" initialValue={2000}>
        <InputNumber min={100} max={32000} step={100} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="systemPrompt" label="System Prompt">
        <TextArea rows={4} placeholder="輸入系統提示詞..." />
      </Form.Item>
    </>
  );

  const chatTab = (
    <>
      <Form.Item name="openingLines" label="開場白">
        <Select 
          mode="tags" 
          placeholder="輸入開場白，按 Enter 確認"
        />
      </Form.Item>
      <Form.Item name="capabilities" label="能力描述">
        <Select 
          mode="tags" 
          placeholder="輸入能力描述，按 Enter 確認"
        />
      </Form.Item>
    </>
  );

  return (
    <>
       <Modal
         title={mode === 'create' ? '新增 Agent' : '編輯 Agent'}
         open={open}
         onCancel={onCancel}
         width={720}
         forceRender
         footer={
           <Space>
             {mode === 'edit' && onDelete && (
               <Button danger onClick={handleDelete}>
                 刪除
               </Button>
             )}
             <Button onClick={onCancel}>取消</Button>
             <Button type="primary" onClick={handleSubmit}>
               {mode === 'create' ? '建立' : '儲存'}
             </Button>
           </Space>
         }
       >
         <Form form={form} layout="vertical">
          <Tabs 
            defaultActiveKey="basic" 
            items={[
              ...infoTabItems,
              {
                key: 'permission',
                label: '權限配置',
                children: permissionTab,
              },
              {
                key: 'model',
                label: '模型配置',
                children: modelTab,
              },
              {
                key: 'chat',
                label: '對話配置',
                children: chatTab,
              },
            ]}
          />
        </Form>
      </Modal>
      <IconPicker
        open={iconPickerVisible}
        onCancel={() => setIconPickerVisible(false)}
        onSelect={(icon) => form.setFieldValue('icon', icon)}
      />
    </>
  );
}

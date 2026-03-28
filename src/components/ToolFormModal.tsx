/**
 * @file        工具表單組件
 * @description 工具創建/編輯 Modal，包含基本資訊、執行配置、模型配置、授權配置
 * @lastUpdate  2026-03-28 10:22:08
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Tabs, Button, Space, App, Radio } from 'antd';
import { iconMap } from '../utils/icons';
import IconPicker from './IconPicker';
import { Tool, roleApi } from '../services/api';

const { TextArea } = Input;

const toolTypeOptions = [
  { value: 'mcp', label: 'MCP 工具' },
  { value: 'builtin', label: '內建工具' },
  { value: 'custom', label: '自訂工具' },
];

const statusOptions = [
  { value: 'online', label: '在線' },
  { value: 'maintenance', label: '維修中' },
  { value: 'deprecated', label: '已作廢' },
  { value: 'registering', label: '審查中' },
];

interface ToolFormModalProps {
  open: boolean;
  tool?: Tool | null;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: Partial<Tool>) => void;
  onDelete?: (toolKey: string) => void;
}

export default function ToolFormModal({
  open,
  tool,
  mode,
  onCancel,
  onSubmit,
  onDelete,
}: ToolFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'role' | 'account'>('public');

  useEffect(() => {
    roleApi.list().then((res: { data?: { data?: { _key: string; name: string }[] } }) => {
      const opts = (res?.data?.data || []).map((r) => ({ value: r._key, label: r.name }));
      setRoles(opts);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && tool && mode === 'edit') {
      const inputSchemaStr = tool.input_schema ? JSON.stringify(tool.input_schema, null, 2) : '';
      const outputSchemaStr = tool.output_schema ? JSON.stringify(tool.output_schema, null, 2) : '';

      form.setFieldsValue({
        ...tool,
        tool_type: tool.tool_type || 'custom',
        status: tool.status || 'online',
        group_key: tool.group_key || '',
        intent_tags: tool.intent_tags || [],
        endpoint_url: tool.endpoint_url || '',
        timeout_ms: tool.timeout_ms ?? 30000,
        input_schema_str: inputSchemaStr,
        output_schema_str: outputSchemaStr,
        llm_model: tool.llm_model || '',
        temperature: tool.temperature ?? 0.7,
        max_tokens: tool.max_tokens ?? 2000,
        visibility: tool.visibility || 'public',
        visibility_roles: tool.visibility_roles || [],
        visibility_accounts: tool.visibility_accounts || [],
      });
      setVisibility(tool.visibility || 'public');
    } else if (open && mode === 'create') {
      form.resetFields();
      form.setFieldsValue({
        status: 'online',
        tool_type: 'custom',
        visibility: 'public',
        temperature: 0.7,
        max_tokens: 2000,
        timeout_ms: 30000,
        intent_tags: [],
        visibility_roles: [],
        visibility_accounts: [],
      });
      setVisibility('public');
    }
  }, [open, tool, mode, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      let parsedInputSchema = undefined;
      if (values.input_schema_str && values.input_schema_str.trim() !== '') {
        try {
          parsedInputSchema = JSON.parse(values.input_schema_str);
        } catch (e) {
          message.warning('輸入 Schema 格式不正確，將以字串儲存');
          parsedInputSchema = values.input_schema_str;
        }
      }

      let parsedOutputSchema = undefined;
      if (values.output_schema_str && values.output_schema_str.trim() !== '') {
        try {
          parsedOutputSchema = JSON.parse(values.output_schema_str);
        } catch (e) {
          message.warning('輸出 Schema 格式不正確，將以字串儲存');
          parsedOutputSchema = values.output_schema_str;
        }
      }

      const submitData: Partial<Tool> = {
        ...values,
        input_schema: parsedInputSchema,
        output_schema: parsedOutputSchema,
      };

      delete (submitData as Record<string, unknown>).input_schema_str;
      delete (submitData as Record<string, unknown>).output_schema_str;

      onSubmit(submitData);
    } catch (err) {
      message.error('請填寫必填欄位');
    }
  };

  const handleDelete = () => {
    if (tool?._key && onDelete) {
      Modal.confirm({
        title: '確認刪除',
        content: `確定要刪除工具「${tool.name}」嗎？此操作無法復原。`,
        okText: '刪除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => onDelete(tool._key as string),
      });
    }
  };

  const IconPreview = () => {
    const iconValue = form.getFieldValue('icon');
    const IconComp = iconValue ? iconMap[iconValue] : null;
    return IconComp ? <IconComp style={{ fontSize: 20 }} /> : null;
  };

  const basicTab = (
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
      <Form.Item name="icon" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="名稱" rules={[{ required: true, message: '請輸入名稱' }]}>
        <Input placeholder="例如：網路搜尋工具" />
      </Form.Item>
      <Form.Item name="code" label="代碼 (Code)" rules={[{ required: true, message: '請輸入代碼' }]}>
        <Input placeholder="例如：web_search" />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <TextArea rows={3} placeholder="描述這個工具的用途..." />
      </Form.Item>
      <Form.Item name="tool_type" label="工具類型">
        <Select options={toolTypeOptions} />
      </Form.Item>
      <Form.Item name="status" label="狀態">
        <Select options={statusOptions} />
      </Form.Item>
      <Form.Item name="group_key" label="分組 Key">
        <Input placeholder="例如：search, data, utility" />
      </Form.Item>
      <Form.Item name="intent_tags" label="意圖標籤">
        <Select mode="tags" placeholder="輸入意圖標籤，按 Enter 確認" />
      </Form.Item>
    </>
  );

  const executionTab = (
    <>
      <Form.Item name="endpoint_url" label="Endpoint URL">
        <Input placeholder="http://localhost:8004/execute" />
      </Form.Item>
      <Form.Item name="timeout_ms" label="超時設定 (ms)">
        <InputNumber min={1000} max={300000} step={1000} addonAfter="ms" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="input_schema_str" label="輸入 Schema (JSON)">
        <TextArea rows={4} placeholder={'{"type":"object","properties":{...}}'} />
      </Form.Item>
      <Form.Item name="output_schema_str" label="輸出 Schema (JSON)">
        <TextArea rows={4} placeholder={'{"type":"object","properties":{...}}'} />
      </Form.Item>
    </>
  );

  const modelTab = (
    <>
      <Form.Item name="llm_model" label="LLM 模型">
        <Input placeholder="例如：llama3, gpt-4" />
      </Form.Item>
      <Form.Item name="temperature" label="Temperature">
        <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="max_tokens" label="最大 Tokens">
        <InputNumber min={100} max={32000} step={100} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );

  const permissionTab = (
    <>
      <Form.Item label="可見性" name="visibility">
        <Radio.Group value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <Radio.Button value="public">公開</Radio.Button>
          <Radio.Button value="role">按角色</Radio.Button>
          <Radio.Button value="account">按帳號</Radio.Button>
        </Radio.Group>
      </Form.Item>
      {visibility === 'role' && (
        <Form.Item label="可見角色" name="visibility_roles">
          <Select mode="multiple" placeholder="選擇可見的角色" options={roles} />
        </Form.Item>
      )}
      {visibility === 'account' && (
        <Form.Item label="可見帳號" name="visibility_accounts">
          <Select mode="tags" placeholder="輸入用戶帳號，按 Enter 確認" />
        </Form.Item>
      )}
    </>
  );

  return (
    <>
      <Modal
        title={mode === 'create' ? '新增工具' : '編輯工具'}
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
              {
                key: 'basic',
                label: '基本資訊',
                children: basicTab,
              },
              {
                key: 'execution',
                label: '執行配置',
                children: executionTab,
              },
              {
                key: 'model',
                label: '模型配置',
                children: modelTab,
              },
              {
                key: 'permission',
                label: '授權配置',
                children: permissionTab,
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

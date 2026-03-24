/**
 * @file        樣板維護頁面
 * @description 主題樣板 CRUD 管理，支持外殼(shell)與內容(content)兩類樣板
 * @lastUpdate  2026-03-23 15:30:00
 * @author      Daniel Chung
 * @version     1.1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { App, Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, Popconfirm, InputNumber, Slider, Typography, ColorPicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { themeTemplateApi, ThemeTemplate, ShellTokens, ContentTokens } from '../services/api';
import { useReloadTemplates } from '../contexts/AppThemeProvider';

const { Text } = Typography;

type ShellColorKey = Extract<keyof ShellTokens, string>;
type ContentColorKey = Extract<keyof ContentTokens, string>;

const SHELL_COLOR_FIELDS: { key: ShellColorKey; label: string }[] = [
  { key: 'siderBg', label: '側邊欄背景' },
  { key: 'headerBg', label: '頂部列背景' },
  { key: 'menuItemColor', label: '選單項目文字' },
  { key: 'menuItemHoverBg', label: '選單項目懸停背景' },
  { key: 'menuItemSelectedBg', label: '選單項目選中背景' },
  { key: 'menuItemSelectedColor', label: '選單項目選中文字' },
  { key: 'logoColor', label: 'Logo 顏色' },
  { key: 'siderBorder', label: '側邊欄邊框' },
];

const SHELL_SHADOW_FIELDS: { key: ShellColorKey; label: string }[] = [
  { key: 'headerShadow', label: '頂部列陰影' },
  { key: 'siderShadow', label: '側邊欄陰影' },
];

const CONTENT_COLOR_FIELDS: { key: ContentColorKey; label: string; group: string }[] = [
  { key: 'colorPrimary', label: '主題色', group: '品牌顏色' },
  { key: 'colorSuccess', label: '成功色', group: '品牌顏色' },
  { key: 'colorWarning', label: '警告色', group: '品牌顏色' },
  { key: 'colorError', label: '錯誤色', group: '品牌顏色' },
  { key: 'colorInfo', label: '資訊色', group: '品牌顏色' },
  { key: 'colorBgBase', label: '內容背景', group: '背景顏色' },
  { key: 'colorTextBase', label: '主文字', group: '背景顏色' },
  { key: 'textSecondary', label: '次要文字', group: '背景顏色' },
  { key: 'pageBg', label: '頁面底層背景 (Layout)', group: '背景顏色' },
  { key: 'contentBg', label: '內容頁容器背景 (Content)', group: '背景顏色' },
  { key: 'containerBg', label: '元件容器背景 (Table/Card/Tabs)', group: '背景顏色' },
  { key: 'tableExpandedRowBg', label: '表格展開列背景', group: '表格' },
  { key: 'tableHeaderBg', label: '表格標題背景', group: '表格' },
  { key: 'tableRowHoverBg', label: '表格列懸停背景', group: '表格' },
  { key: 'chatInputBg', label: '聊天輸入框背景', group: '聊天' },
  { key: 'chatUserBubble', label: '聊天使用者氣泡', group: '聊天' },
  { key: 'chatAssistantBubble', label: '聊天助理氣泡', group: '聊天' },
  { key: 'iconDefault', label: '圖示預設顏色', group: '圖示' },
  { key: 'iconHover', label: '圖示懸停顏色', group: '圖示' },
  { key: 'btnClear', label: '清除按鈕', group: '按鈕' },
  { key: 'btnClearHover', label: '清除按鈕懸停', group: '按鈕' },
  { key: 'btnSend', label: '發送按鈕', group: '按鈕' },
  { key: 'btnSendHover', label: '發送按鈕懸停', group: '按鈕' },
  { key: 'btnText', label: '按鈕文字', group: '按鈕' },
];

const CONTENT_SHADOW_FIELDS: { key: ContentColorKey; label: string }[] = [
  { key: 'boxShadow', label: '全域陰影' },
  { key: 'boxShadowSecondary', label: '全域陰影 (次要)' },
  { key: 'cardShadow', label: '卡片陰影' },
  { key: 'cardShadowHover', label: '卡片懸停陰影' },
  { key: 'tableShadow', label: '表格陰影' },
];

function groupContentFields(fields: typeof CONTENT_COLOR_FIELDS): Record<string, typeof CONTENT_COLOR_FIELDS> {
  const grouped: Record<string, typeof CONTENT_COLOR_FIELDS> = {};
  for (const f of fields) {
    if (!grouped[f.group]) grouped[f.group] = [];
    grouped[f.group].push(f);
  }
  return grouped;
}

interface ColorFieldProps {
  label: string;
  fieldKey: string;
}

function ColorField({ label, fieldKey }: ColorFieldProps) {
  return (
    <Form.Item
      name={['tokens', fieldKey]}
      label={label}
      style={{ marginBottom: 8 }}
      getValueFromEvent={(color) => color?.toHexString?.() ?? color}
    >
      <ColorPicker
        showText
        format="hex"
        size="small"
      />
    </Form.Item>
  );
}

interface TextFieldProps {
  label: string;
  fieldKey: string;
  rows?: number;
}

function TextField({ label, fieldKey, rows = 1 }: TextFieldProps) {
  return (
    <Form.Item
      name={['tokens', fieldKey]}
      label={label}
      style={{ marginBottom: 8 }}
    >
      {rows === 1 ? (
        <Input />
      ) : (
        <Input.TextArea rows={rows} />
      )}
    </Form.Item>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text strong style={{ display: 'block', marginBottom: 12, marginTop: 8, color: '#1e40af' }}>{children}</Text>;
}

// Shell tokens form — fields rendered directly (no Collapse) for proper form integration
function ShellTokensForm() {
  return (
    <>
      <SectionTitle>顏色設置</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {SHELL_COLOR_FIELDS.map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>
      <SectionTitle>陰影設置</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {SHELL_SHADOW_FIELDS.map(f => (
          <TextField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
            rows={1}
          />
        ))}
      </div>
    </>
  );
}

// Content tokens form — fields rendered directly (no Collapse) for proper form integration
function ContentTokensForm() {
  const grouped = groupContentFields(CONTENT_COLOR_FIELDS);

  return (
    <>
      <SectionTitle>品牌顏色</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {(grouped['品牌顏色'] || []).map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>

      <SectionTitle>背景與文字</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {(grouped['背景顏色'] || []).map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>

      <SectionTitle>表格</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {(grouped['表格'] || []).map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>

      <SectionTitle>聊天</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {(grouped['聊天'] || []).map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>

      <SectionTitle>圖示</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {(grouped['圖示'] || []).map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>

      <SectionTitle>按鈕</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {(grouped['按鈕'] || []).map(f => (
          <ColorField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
          />
        ))}
      </div>

      <SectionTitle>陰影與圓角</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        {CONTENT_SHADOW_FIELDS.map(f => (
          <TextField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
            rows={1}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Form.Item name={['tokens', 'borderRadius']} label="圓角" style={{ marginBottom: 8 }}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name={['tokens', 'bgOpacity']} label="內容背景透明度 (%)" style={{ marginBottom: 8 }}>
          <Slider min={0} max={100} tooltip={{ formatter: (v) => `${v}%` }} />
        </Form.Item>
      </div>
      <Form.Item name={['tokens', 'fontFamily']} label="字體" style={{ marginBottom: 8 }}>
        <Input />
      </Form.Item>
    </>
  );
}

export default function ThemeTemplateManagement() {
  const { message } = App.useApp();
  const reloadTemplates = useReloadTemplates();
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ThemeTemplate | null>(null);
  const [form] = Form.useForm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await themeTemplateApi.list();
      setTemplates(response.data.data || []);
    } catch {
      message.error('操作失敗');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ThemeTemplate) => {
    setEditingTemplate(record);
    // 將 tokens JSON 解析為表單欄位值
    const tokens = record.tokens as unknown as Record<string, unknown>;
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      template_type: record.template_type,
      tokens, // 扁平化物件，name 使用 ['tokens', 'fieldName'] 語法
      is_default: record.is_default,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (key: string) => {
    try {
      await themeTemplateApi.delete(key);
      message.success('刪除成功');
      fetchTemplates();
    } catch {
      message.error('操作失敗');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 從表單取值，tokens 已經是物件格式
      const { tokens, ...rest } = values;

      // 確保 tokens 是有效物件
      const finalTokens = (tokens && typeof tokens === 'object') ? tokens : {};

      const payload = {
        ...rest,
        tokens: finalTokens,
      };

      if (editingTemplate) {
        await themeTemplateApi.update(editingTemplate._key, payload);
        message.success('更新成功');
      } else {
        await themeTemplateApi.create(payload);
        message.success('建立成功');
      }
      setModalVisible(false);
      fetchTemplates();
      reloadTemplates();
    } catch (e: unknown) {
      // Ant Design Form validation error — don't show generic error
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error('操作失敗');
    }
  };

  const columns = [
    {
      title: '名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '類型',
      dataIndex: 'template_type',
      key: 'template_type',
      render: (type: string) => (
        <Tag color={type === 'shell' ? 'blue' : 'green'}>
          {type === 'shell' ? '外殼 (shell)' : '內容 (content)'}
        </Tag>
      ),
    },
    {
      title: '預設',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (isDefault: boolean) => (
        <Tag color={isDefault ? 'green' : 'default'}>
          {isDefault ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'enabled' ? 'green' : 'red'}>
          {status === 'enabled' ? '啟用 (enabled)' : '停用 (disabled)'}
        </Tag>
      ),
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ThemeTemplate) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定刪除此樣板？"
            onConfirm={() => handleDelete(record._key)}
            okText="確定"
            cancelText="取消"
            disabled={record.is_default}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_default}
            >
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const templateType = Form.useWatch('template_type', form) || editingTemplate?.template_type || 'shell';

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增樣板
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="_key"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingTemplate ? '編輯樣板' : '新增樣板'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={900}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'enabled', is_default: false, template_type: 'shell' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="name"
              label="名稱"
              rules={[{ required: true, message: '請輸入名稱' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="template_type"
              label="類型"
              rules={[{ required: true, message: '請選擇類型' }]}
            >
              <Select
                disabled={!!editingTemplate}
                options={[
                  { value: 'shell', label: '外殼 (shell)' },
                  { value: 'content', label: '內容 (content)' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="說明"
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* 動態渲染 Shell 或 Content 的 tokens 表單 */}
          {templateType === 'shell' ? (
            <ShellTokensForm />
          ) : (
            <ContentTokensForm />
          )}

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #f0f0f0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="is_default"
              label="預設"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item name="status" label="狀態" rules={[{ required: true, message: '請選擇狀態' }]}>
              <Select
                options={[
                  { value: 'enabled', label: '啟用 (enabled)' },
                  { value: 'disabled', label: '停用 (disabled)' },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

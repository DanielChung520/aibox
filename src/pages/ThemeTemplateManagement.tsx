/**
 * @file        樣板維護頁面
 * @description 主題樣板 CRUD 管理，支持外殼(shell)與內容(content)兩類樣板
 * @lastUpdate  2026-03-22 19:17:34
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { App, Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { themeTemplateApi, ThemeTemplate } from '../services/api';

export default function ThemeTemplateManagement() {
  const { message } = App.useApp();
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
    } catch (error: any) {
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
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      template_type: record.template_type,
      tokens: JSON.stringify(record.tokens, null, 2),
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
    } catch (error: any) {
      message.error('操作失敗');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      let parsedTokens;
      try {
        parsedTokens = JSON.parse(values.tokens);
      } catch (e) {
        message.error('令牌配置格式錯誤，請確保為有效的 JSON 格式');
        return;
      }

      const payload = {
        name: values.name,
        description: values.description,
        template_type: values.template_type,
        tokens: parsedTokens,
        is_default: values.is_default,
        status: values.status,
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
    } catch (error: any) {
      if (error.name === 'ValidationError' || error.errorFields) return;
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
      render: (_: any, record: ThemeTemplate) => (
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
         width={700}
         destroyOnHidden
         forceRender
       >
         <Form form={form} layout="vertical" initialValues={{ status: 'enabled', is_default: false, template_type: 'shell' }}>
          <Form.Item
            name="name"
            label="名稱"
            rules={[{ required: true, message: '請輸入名稱' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="說明"
          >
            <Input.TextArea rows={2} />
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
                { value: 'content', label: '內容 (content)' }
              ]} 
            />
          </Form.Item>

          <Form.Item
            name="tokens"
            label="令牌配置"
            rules={[{ required: true, message: '請輸入令牌配置' }]}
          >
            <Input.TextArea 
              rows={12} 
              style={{ fontFamily: 'Monaco, Menlo, Consolas, monospace', fontSize: 12 }} 
              placeholder={`{\n  "key": "value"\n}`}
            />
          </Form.Item>

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
                { value: 'disabled', label: '停用 (disabled)' }
              ]} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/**
 * @file        角色管理頁面
 * @description 角色 CRUD 操作，包含角色列表、新增、編輯、刪除、權限分配
 * @lastUpdate  2026-03-17 23:27:55
 * @author      Daniel Chung
 * @version     1.0.0
 * @history
 * - 2026-03-17 23:27:55 | Daniel Chung | 1.0.0 | 初始版本
 */

import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { roleApi, Role } from '../services/api';

export default function RoleManagement() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleApi.list();
      setRoles(response.data.data || []);
    } catch (error) {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Role) => {
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (key: string) => {
    if (key === 'admin') {
      message.error('系统管理员角色不可删除');
      return;
    }
    try {
      await roleApi.delete(key);
      message.success('删除成功');
      fetchRoles();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        await roleApi.update(editingRole._key, values);
        message.success('更新成功');
      } else {
        await roleApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchRoles();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Role) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record._key !== 'admin' && (
            <Popconfirm
              title="确定删除此角色吗？"
              onConfirm={() => handleDelete(record._key)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增角色
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="_key"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

       <Modal
         title={editingRole ? '编辑角色' : '新增角色'}
         open={modalVisible}
         onOk={handleSubmit}
         onCancel={() => setModalVisible(false)}
         width={500}
         destroyOnHidden
         forceRender
       >
         <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="角色描述"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

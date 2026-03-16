import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { userApi, roleApi, User, Role } from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.list();
      setUsers(response.data.data || []);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await roleApi.list();
      setRoles(response.data.data || []);
    } catch (error) {
      message.error('获取角色列表失败');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      name: record.name,
      role_key: record.role_key,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (key: string) => {
    try {
      await userApi.delete(key);
      message.success('删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await userApi.update(editingUser._key, values);
        message.success('更新成功');
      } else {
        await userApi.create({
          ...values,
          password_hash: values.password,
          status: values.status || 'enabled',
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleResetPassword = (record: User) => {
    setEditingUser(record);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      await userApi.resetPassword(editingUser!._key, values.password);
      message.success('密码重置成功');
      setPasswordModalVisible(false);
    } catch (error) {
      message.error('密码重置失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role_key',
      key: 'role_key',
      render: (roleKey: string) => {
        const role = roles.find(r => r._key === roleKey);
        return role?.name || roleKey;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'enabled' ? 'green' : 'red'}>
          {status === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
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
      render: (_: any, record: User) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            重置密码
          </Button>
          {record.username !== 'admin' && (
            <Popconfirm
              title="确定删除此用户吗？"
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
          新增用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="_key"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password />
            </Form.Item>
          )}
          
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="role_key"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              {roles.map(role => (
                <Select.Option key={role._key} value={role._key}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="status" label="状态" initialValue="enabled">
            <Select>
              <Select.Option value="enabled">启用</Select.Option>
              <Select.Option value="disabled">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => setPasswordModalVisible(false)}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

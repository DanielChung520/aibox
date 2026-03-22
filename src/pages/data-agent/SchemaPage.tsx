/**
 * @file        Data Agent Schema 管理頁面
 * @description 管理 DA 的資料表結構、欄位定義與表關聯
 * @lastUpdate  2026-03-22 17:20:31
 * @author      Daniel Chung
 */

import { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, Tabs, 
  Tag, Space, App, Popconfirm, Typography, Row, Col, Statistic 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  DatabaseOutlined, TableOutlined, LinkOutlined, 
  ReloadOutlined
} from '@ant-design/icons';
import { dataAgentApi, TableInfo, FieldInfo, TableRelation } from '../../services/dataAgentApi';

const { Title, Text } = Typography;
const { Option } = Select;

type ModuleType = 'MM' | 'SD' | 'FI' | 'PP' | 'QM' | 'OTHER';

export default function SchemaPage() {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('tables');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [relations, setRelations] = useState<TableRelation[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableModalVisible, setTableModalVisible] = useState(false);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [relationModalVisible, setRelationModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [editingTable, setEditingTable] = useState<Partial<TableInfo> | null>(null);
  const [editingField, setEditingField] = useState<Partial<FieldInfo> | null>(null);
  const [editingRelation, setEditingRelation] = useState<Partial<TableRelation> | null>(null);
  const [moduleFilter, setModuleFilter] = useState<ModuleType | 'ALL'>('ALL');
  const [form] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const [relationForm] = Form.useForm();

  // 載入資料表
  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await dataAgentApi.listTables();
      setTables(res.data.data || []);
    } catch (error) {
      message.error('載入資料表失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入欄位
  const loadFields = async (tableId: string) => {
    if (!tableId) return;
    setLoading(true);
    try {
      const res = await dataAgentApi.listFields(tableId);
      setFields(res.data.data || []);
    } catch (error) {
      message.error('載入欄位失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入關聯
  const loadRelations = async () => {
    setLoading(true);
    try {
      const res = await dataAgentApi.listRelations();
      setRelations(res.data.data || []);
    } catch (error) {
      message.error('載入關聯失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
    loadRelations();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadFields(selectedTable);
    }
  }, [selectedTable]);

  // 資料表欄位
  const tableColumns = [
    { title: 'Table ID', dataIndex: 'table_id', key: 'table_id', width: 120 },
    { title: 'Table Name', dataIndex: 'table_name', key: 'table_name', width: 120 },
    { 
      title: 'Module', 
      dataIndex: 'module', 
      key: 'module',
      width: 80,
      render: (module: ModuleType) => {
        const colors: Record<ModuleType, string> = {
          'MM': 'blue', 'SD': 'green', 'FI': 'orange', 
          'PP': 'purple', 'QM': 'red', 'OTHER': 'default'
        };
        return <Tag color={colors[module]}>{module}</Tag>;
      }
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'S3 Path', dataIndex: 's3_path', key: 's3_path', width: 200, ellipsis: true },
    { title: 'Primary Keys', dataIndex: 'primary_keys', key: 'primary_keys', 
      render: (keys: string[]) => keys?.join(', ') || '-' 
    },
    { 
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (status: string) => (
        <Tag color={status === 'enabled' ? 'success' : 'default'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: any, record: TableInfo) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingTable(record);
              form.setFieldsValue(record);
              setTableModalVisible(true);
            }}
          />
          <Popconfirm
            title="確定要刪除此資料表嗎？"
            onConfirm={() => handleDeleteTable(record.table_id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 欄位列
  const fieldColumns = [
    { title: 'Field ID', dataIndex: 'field_id', key: 'field_id', width: 120 },
    { title: 'Field Name', dataIndex: 'field_name', key: 'field_name', width: 150 },
    { title: 'Type', dataIndex: 'field_type', key: 'field_type', width: 100 },
    { title: 'Length', dataIndex: 'length', key: 'length', width: 80 },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { 
      title: 'PK', dataIndex: 'is_pk', key: 'is_pk', width: 60,
      render: (pk: boolean) => pk ? <Tag color="gold">PK</Tag> : null
    },
    { 
      title: 'FK', dataIndex: 'is_fk', key: 'is_fk', width: 60,
      render: (fk: boolean) => fk ? <Tag color="blue">FK</Tag> : null
    },
    { 
      title: 'Nullable', dataIndex: 'nullable', key: 'nullable', width: 90,
      render: (nullable: boolean) => nullable ? 'Yes' : 'No'
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: FieldInfo) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingField(record);
              fieldForm.setFieldsValue(record);
              setFieldModalVisible(true);
            }}
          />
          <Popconfirm
            title="確定要刪除此欄位嗎？"
            onConfirm={() => handleDeleteField(record.table_id, record.field_id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 關聯欄位
  const relationColumns = [
    { title: 'Relation ID', dataIndex: 'relation_id', key: 'relation_id', width: 150 },
    { title: 'Left Table', dataIndex: 'left_table', key: 'left_table', width: 120 },
    { title: 'Left Field', dataIndex: 'left_field', key: 'left_field', width: 100 },
    { title: 'Right Table', dataIndex: 'right_table', key: 'right_table', width: 120 },
    { title: 'Right Field', dataIndex: 'right_field', key: 'right_field', width: 100 },
    { 
      title: 'Join Type', dataIndex: 'join_type', key: 'join_type', width: 80,
      render: (type: string) => <Tag>{type}</Tag>
    },
    { 
      title: 'Cardinality', dataIndex: 'cardinality', key: 'cardinality', width: 80,
      render: (card: string) => <Tag color="cyan">{card}</Tag>
    },
    { 
      title: 'Confidence', dataIndex: 'confidence', key: 'confidence', width: 100,
      render: (conf: number) => `${(conf * 100).toFixed(0)}%`
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: TableRelation) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingRelation(record);
              relationForm.setFieldsValue(record);
              setRelationModalVisible(true);
            }}
          />
          <Popconfirm
            title="確定要刪除此關聯嗎？"
            onConfirm={() => handleDeleteRelation(record.relation_id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const handleDeleteTable = async (tableId: string) => {
    try {
      await dataAgentApi.deleteTable(tableId);
      message.success('刪除成功');
      loadTables();
    } catch (error) {
      message.error('刪除失敗');
    }
  };

  const handleDeleteField = async (tableId: string, fieldId: string) => {
    try {
      await dataAgentApi.deleteField(tableId, fieldId);
      message.success('刪除成功');
      loadFields(selectedTable);
    } catch (error) {
      message.error('刪除失敗');
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await dataAgentApi.deleteRelation(relationId);
      message.success('刪除成功');
      loadRelations();
    } catch (error) {
      message.error('刪除失敗');
    }
  };

  const handleSaveTable = async () => {
    try {
      const values = await form.validateFields();
      if (editingTable?.table_id) {
        await dataAgentApi.updateTable(editingTable.table_id, values);
        message.success('更新成功');
      } else {
        await dataAgentApi.createTable(values);
        message.success('建立成功');
      }
      setTableModalVisible(false);
      form.resetFields();
      setEditingTable(null);
      loadTables();
    } catch (error) {
      message.error('操作失敗');
    }
  };

  const handleSaveField = async () => {
    try {
      const values = await fieldForm.validateFields();
      values.table_id = selectedTable;
      if (editingField?.field_id) {
        await dataAgentApi.updateField(selectedTable, editingField.field_id, values);
        message.success('更新成功');
      } else {
        await dataAgentApi.createField(values);
        message.success('建立成功');
      }
      setFieldModalVisible(false);
      fieldForm.resetFields();
      setEditingField(null);
      loadFields(selectedTable);
    } catch (error) {
      message.error('操作失敗');
    }
  };

  const handleSaveRelation = async () => {
    try {
      const values = await relationForm.validateFields();
      if (editingRelation?.relation_id) {
        await dataAgentApi.updateRelation(editingRelation.relation_id, values);
        message.success('更新成功');
      } else {
        await dataAgentApi.createRelation(values);
        message.success('建立成功');
      }
      setRelationModalVisible(false);
      relationForm.resetFields();
      setEditingRelation(null);
      loadRelations();
    } catch (error) {
      message.error('操作失敗');
    }
  };

  const filteredTables = moduleFilter === 'ALL' 
    ? tables 
    : tables.filter(t => t.module === moduleFilter);

  const tableItems = [
    {
      key: 'tables',
      label: (
        <span><DatabaseOutlined /> 資料表 ({filteredTables.length})</span>
      ),
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Statistic 
                title="總資料表" 
                value={tables.length} 
                prefix={<DatabaseOutlined />} 
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="MM 模組" 
                value={tables.filter(t => t.module === 'MM').length} 
                styles={{ content: { color: '#1890ff' } }}
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="SD 模組" 
                value={tables.filter(t => t.module === 'SD').length} 
                styles={{ content: { color: '#52c41a' } }}
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="FI 模組" 
                value={tables.filter(t => t.module === 'FI').length} 
                styles={{ content: { color: '#faad14' } }}
              />
            </Col>
          </Row>
          
          <Space style={{ marginBottom: 16 }}>
            <Select 
              value={moduleFilter} 
              onChange={setModuleFilter}
              style={{ width: 150 }}
            >
              <Option value="ALL">全部模組</Option>
              <Option value="MM">MM</Option>
              <Option value="SD">SD</Option>
              <Option value="FI">FI</Option>
              <Option value="PP">PP</Option>
              <Option value="QM">QM</Option>
            </Select>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => {
                setEditingTable(null);
                form.resetFields();
                setTableModalVisible(true);
              }}
            >
              新增資料表
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadTables}>重新整理</Button>
          </Space>

          <Table 
            columns={tableColumns} 
            dataSource={filteredTables} 
            rowKey="table_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </div>
      )
    },
    {
      key: 'fields',
      label: (
        <span><TableOutlined /> 欄位資訊</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="選擇資料表"
              value={selectedTable || undefined}
              onChange={(value) => setSelectedTable(value)}
              style={{ width: 200 }}
              showSearch
              allowClear
            >
              {tables.map(t => (
                <Option key={t.table_id} value={t.table_id}>
                  {t.table_name} ({t.table_id})
                </Option>
              ))}
            </Select>
            {selectedTable && (
              <>
                <Button 
                  icon={<PlusOutlined />} 
                  onClick={() => {
                    setEditingField(null);
                    fieldForm.resetFields();
                    setFieldModalVisible(true);
                  }}
                >
                  新增欄位
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => loadFields(selectedTable)}>
                  重新整理
                </Button>
              </>
            )}
          </Space>

          {selectedTable ? (
            <Table 
              columns={fieldColumns} 
              dataSource={fields} 
              rowKey="field_id"
              loading={loading}
              pagination={{ pageSize: 15 }}
              size="small"
            />
          ) : (
            <Card>
              <Text type="secondary">請先選擇一個資料表</Text>
            </Card>
          )}
        </div>
      )
    },
    {
      key: 'relations',
      label: (
        <span><LinkOutlined /> 表關聯 ({relations.length})</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => {
                setEditingRelation(null);
                relationForm.resetFields();
                setRelationModalVisible(true);
              }}
            >
              新增關聯
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadRelations}>重新整理</Button>
          </Space>

          <Table 
            columns={relationColumns} 
            dataSource={relations} 
            rowKey="relation_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </div>
      )
    }
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <DatabaseOutlined /> Data Agent Schema 管理
      </Title>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tableItems}
      />

      {/* 資料表 Modal */}
      <Modal
        title={editingTable?.table_id ? '編輯資料表' : '新增資料表'}
        open={tableModalVisible}
        onOk={handleSaveTable}
        onCancel={() => {
          setTableModalVisible(false);
          form.resetFields();
          setEditingTable(null);
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="table_id" label="Table ID" rules={[{ required: true }]}>
            <Input disabled={!!editingTable?.table_id} placeholder="如: MM_EKKO" />
          </Form.Item>
          <Form.Item name="table_name" label="Table Name" rules={[{ required: true }]}>
            <Input placeholder="如: EKKO" />
          </Form.Item>
          <Form.Item name="module" label="Module" rules={[{ required: true }]}>
            <Select placeholder="選擇模組">
              <Option value="MM">MM - 物料管理</Option>
              <Option value="SD">SD - 銷售配送</Option>
              <Option value="FI">FI - 財務会计</Option>
              <Option value="PP">PP - 生产计划</Option>
              <Option value="QM">QM - 质量管理</Option>
              <Option value="OTHER">OTHER - 其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="s3_path" label="S3 Path" rules={[{ required: true }]}>
            <Input placeholder="s3://sap/mm/ekko/" />
          </Form.Item>
          <Form.Item name="primary_keys" label="Primary Keys">
            <Select mode="tags" placeholder="輸入主鍵欄位" />
          </Form.Item>
          <Form.Item name="partition_keys" label="Partition Keys">
            <Select mode="tags" placeholder="輸入分區欄位" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="enabled">
            <Select>
              <Option value="enabled">Enabled</Option>
              <Option value="disabled">Disabled</Option>
              <Option value="deprecated">Deprecated</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 欄位 Modal */}
      <Modal
        title={editingField?.field_id ? '編輯欄位' : '新增欄位'}
        open={fieldModalVisible}
        onOk={handleSaveField}
        onCancel={() => {
          setFieldModalVisible(false);
          fieldForm.resetFields();
          setEditingField(null);
        }}
        width={600}
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item name="field_id" label="Field ID" rules={[{ required: true }]}>
            <Input disabled={!!editingField?.field_id} placeholder="如: EBELN" />
          </Form.Item>
          <Form.Item name="field_name" label="Field Name" rules={[{ required: true }]}>
            <Input placeholder="如: 採購單號" />
          </Form.Item>
          <Form.Item name="field_type" label="Field Type" rules={[{ required: true }]}>
            <Select placeholder="選擇類型">
              <Option value="CHAR">CHAR</Option>
              <Option value="VARCHAR">VARCHAR</Option>
              <Option value="INT">INT</Option>
              <Option value="BIGINT">BIGINT</Option>
              <Option value="DECIMAL">DECIMAL</Option>
              <Option value="DATE">DATE</Option>
              <Option value="TIMESTAMP">TIMESTAMP</Option>
              <Option value="BOOLEAN">BOOLEAN</Option>
            </Select>
          </Form.Item>
          <Form.Item name="length" label="Length">
            <Input type="number" placeholder="如: 10" />
          </Form.Item>
          <Form.Item name="scale" label="Scale">
            <Input type="number" placeholder="如: 2" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="business_aliases" label="Business Aliases">
            <Select mode="tags" placeholder="輸入商業別名" />
          </Form.Item>
          <Form.Item name="is_pk" label="Primary Key" valuePropName="checked">
            <Input type="checkbox" />
          </Form.Item>
          <Form.Item name="is_fk" label="Foreign Key" valuePropName="checked">
            <Input type="checkbox" />
          </Form.Item>
          <Form.Item name="nullable" label="Nullable" valuePropName="checked" initialValue>
            <Input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 關聯 Modal */}
      <Modal
        title={editingRelation?.relation_id ? '編輯關聯' : '新增關聯'}
        open={relationModalVisible}
        onOk={handleSaveRelation}
        onCancel={() => {
          setRelationModalVisible(false);
          relationForm.resetFields();
          setEditingRelation(null);
        }}
        width={600}
      >
        <Form form={relationForm} layout="vertical">
          <Form.Item name="relation_id" label="Relation ID" rules={[{ required: true }]}>
            <Input disabled={!!editingRelation?.relation_id} placeholder="如: REL_MM_EKKO_EKPO" />
          </Form.Item>
          <Form.Item name="left_table" label="Left Table" rules={[{ required: true }]}>
            <Select showSearch placeholder="選擇左表">
              {tables.map(t => (
                <Option key={t.table_id} value={t.table_id}>
                  {t.table_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="left_field" label="Left Field" rules={[{ required: true }]}>
            <Input placeholder="如: EBELN" />
          </Form.Item>
          <Form.Item name="right_table" label="Right Table" rules={[{ required: true }]}>
            <Select showSearch placeholder="選擇右表">
              {tables.map(t => (
                <Option key={t.table_id} value={t.table_id}>
                  {t.table_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="right_field" label="Right Field" rules={[{ required: true }]}>
            <Input placeholder="如: EBELN" />
          </Form.Item>
          <Form.Item name="join_type" label="Join Type" initialValue="INNER">
            <Select>
              <Option value="INNER">INNER</Option>
              <Option value="LEFT">LEFT</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cardinality" label="Cardinality" initialValue="1:N">
            <Select>
              <Option value="1:1">1:1</Option>
              <Option value="1:N">1:N</Option>
              <Option value="N:1">N:1</Option>
              <Option value="N:N">N:N</Option>
            </Select>
          </Form.Item>
          <Form.Item name="confidence" label="Confidence" initialValue={1.0}>
            <Input type="number" step={0.1} min={0} max={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

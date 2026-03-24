/**
 * @file        新增知識庫 Modal
 * @description 建立新知識庫的表單 Modal，含領域選擇與專業主題多選
 * @lastUpdate  2026-03-24 23:06:11
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Modal, Form, Input, Select, App } from 'antd';
import { KnowledgeRoot } from '../../../services/api';

const { Option } = Select;
const { TextArea } = Input;

export interface KBCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (id: string, values: Partial<KnowledgeRoot>) => void;
  domains: { label: string; value: string }[];
}

export default function KBCreateModal({
  open,
  onCancel,
  onSuccess,
  domains,
}: KBCreateModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const handleOk = () => {
    form.validateFields().then((values) => {
      message.success('知識庫建立成功');
      const mockKey = `kb_${Date.now()}`;
      onSuccess(mockKey, values);
      form.resetFields();
    }).catch(() => { /* validation error handled by Form */ });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const mockMajors = [
    { label: 'Inventory Control', value: 'Inventory_Control' },
    { label: 'Quality Management', value: 'Quality_Management' },
    { label: 'Semantic Mapping', value: 'Semantic_Mapping' },
    { label: 'Budget Control', value: 'Budget_Control' },
    { label: 'Clinical Data Management', value: 'Clinical_Data_Management' },
  ];

  return (
    <Modal
      title="建立新知識庫"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="建立"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        name="kb_create_form"
        initialValues={{ ontology_domain: domains[0]?.value }}
      >
        <Form.Item
          name="name"
          label="知識庫名稱"
          rules={[{ required: true, message: '請輸入知識庫名稱!' }]}
        >
          <Input placeholder="例如: 產品文件庫" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
        >
          <TextArea rows={3} placeholder="簡單描述此知識庫的用途..." />
        </Form.Item>

        <Form.Item
          name="ontology_domain"
          label="知識領域 (Domain)"
          rules={[{ required: true, message: '請選擇一個知識領域!' }]}
        >
          <Select placeholder="選擇領域">
            {domains.map(d => (
              <Option key={d.value} value={d.value}>{d.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="ontology_majors"
          label="專業主題 (Majors)"
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="選擇相關專業主題"
            options={mockMajors}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, InputNumber, message, Tabs, Space } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { paramsApi, SystemParam } from '../services/api';

interface ParamFormValues {
  [key: string]: any;
}

export default function SystemParams() {
  const [params, setParams] = useState<SystemParam[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchParams = async () => {
    try {
      const response = await paramsApi.list();
      setParams(response.data.data || []);
      
      // Set form values
      const values: ParamFormValues = {};
      response.data.data?.forEach((param: SystemParam) => {
        let value: any = param.param_value;
        if (param.param_type === 'number') {
          value = parseInt(param.param_value, 10);
        } else if (param.param_type === 'boolean') {
          value = param.param_value === 'true';
        }
        values[param.param_key] = value;
      });
      form.setFieldsValue(values);
    } catch (error) {
      message.error('获取参数失败');
    }
  };

  useEffect(() => {
    fetchParams();
  }, []);

  const handleSave = async (category?: string) => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      const paramsToSave = category 
        ? params.filter(p => p.category === category)
        : params;
      
      for (const param of paramsToSave) {
        let paramValue = values[param.param_key];
        
        // Convert to string based on type
        if (param.param_type === 'boolean') {
          paramValue = paramValue ? 'true' : 'false';
        } else if (param.param_type === 'number') {
          paramValue = String(paramValue);
        }
        
        await paramsApi.update(param.param_key, paramValue);
      }
      
      message.success('保存成功');
      fetchParams();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const groupedParams = params.reduce((acc, param) => {
    if (!acc[param.category]) {
      acc[param.category] = [];
    }
    acc[param.category].push(param);
    return acc;
  }, {} as Record<string, SystemParam[]>);

  const categoryLabels: Record<string, string> = {
    basic: '基本信息',
    theme: '主题设置',
    window: '窗口设置',
    behavior: '行为设置',
    update: '更新设置',
    backup: '备份设置',
  };

  const renderParamInput = (param: SystemParam) => {
    const commonProps = {
      disabled: param.param_key === 'app.version',
    };

    switch (param.param_type) {
      case 'boolean':
        return <Switch {...commonProps} />;
      case 'number':
        return <InputNumber {...commonProps} style={{ width: '100%' }} />;
      default:
        return <Input {...commonProps} />;
    }
  };

  const tabItems = Object.entries(groupedParams).map(([category, categoryParams]) => ({
    key: category,
    label: categoryLabels[category] || category,
    children: (
      <Card>
        <Form
          form={form}
          layout="vertical"
          style={{ maxWidth: 600 }}
        >
          {categoryParams.map(param => (
            <Form.Item
              key={param.param_key}
              name={param.param_key}
              label={param.param_key.split('.')[1] || param.param_key}
              tooltip={param.require_restart ? '需要重启生效' : undefined}
            >
              {renderParamInput(param)}
            </Form.Item>
          ))}
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={() => handleSave(category)}
                loading={saving}
              >
                保存
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => form.resetFields()}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    ),
  }));

  return (
    <div>
      <Tabs items={tabItems} />
    </div>
  );
}

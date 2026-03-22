/**
 * @file        Data Agent Query Playground
 * @description 用於測試和執行自然語言查詢的互動式介面
 * @lastUpdate  2026-03-22 19:56:42
 * @author      Daniel Chung
 */

import { useState, useEffect } from 'react';
import { 
  Card, Input, Button, Select, Table, Tag, Space, 
  Typography, Spin, Alert, Divider, Row, Col, 
  Badge, Collapse, Empty, Statistic, App, Tabs, Descriptions, theme
} from 'antd';
import { 
  PlayCircleOutlined, CopyOutlined, ClearOutlined, 
  DatabaseOutlined, ThunderboltOutlined, ClockCircleOutlined,
  TableOutlined, BranchesOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { dataAgentApi, TableInfo, QueryResponse } from '../../services/dataAgentApi';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
}

export default function QueryPlayground() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [moduleScope, setModuleScope] = useState<string[]>([]);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('result');

  // 載入資料表列表
  const loadTables = async () => {
    try {
      const res = await dataAgentApi.listTables();
      setTables(res.data.data || []);
    } catch (error) {
      console.error('載入資料表失敗', error);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  // 執行查詢
  const handleExecute = async () => {
    if (!query.trim()) {
      message.warning('請輸入查詢內容');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setQueryResponse(null);
    setExecutionTime(null);

    const startTime = Date.now();

    try {
      const params: any = {
        query: query,
        options: {
          timezone: 'Asia/Taipei',
          limit: 100,
          return_debug: true
        }
      };

      if (moduleScope.length > 0) {
        params.options.module_scope = moduleScope;
      }

      const res = await dataAgentApi.query(params);
      const data = res.data;

      if (data.code === 0) {
        // Transform response to match QueryResponse interface
        const responseData: QueryResponse = {
          code: data.code,
          data: data.data,
          intent: data.intent || { intent_type: 'filter', confidence: 0 },
          cache_hit: data.cache_hit || false
        };
        setResult({
          columns: data.data?.columns || [],
          rows: data.data?.results || []
        });
        setQueryResponse(responseData);
        
        if (data.intent?.intent_type) {
          setActiveTab('intent');
        }
      } else {
        setError(data.message || '查詢執行失敗');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '查詢執行失敗');
    } finally {
      setExecutionTime(Date.now() - startTime);
      setLoading(false);
    }
  };

  // 清除結果
  const handleClear = () => {
    setQuery('');
    setResult(null);
    setQueryResponse(null);
    setError(null);
    setExecutionTime(null);
    setSqlCopied(false);
  };

  // 複製 SQL
  const handleCopySql = () => {
    if (queryResponse?.data?.sql) {
      navigator.clipboard.writeText(queryResponse.data.sql);
      setSqlCopied(true);
      message.success('SQL 已複製到剪貼簿');
      setTimeout(() => setSqlCopied(false), 2000);
    }
  };

  // 模組變化
  const handleModuleChange = (module: string) => {
    setSelectedModule(module);
    if (module === 'ALL') {
      setModuleScope([]);
    } else {
      setModuleScope([module]);
    }
  };

  // 取得可用模組
  const availableModules = [...new Set(tables.map(t => t.module))];

  // 快速範本按鈕
  const quickTemplates = [
    { label: '採購訂單查詢', query: '查詢上個月的採購訂單', module: 'MM' },
    { label: '供應商列表', query: '列出所有供應商', module: 'MM' },
    { label: '物料查詢', query: '查詢物料 M-001 的資訊', module: 'MM' },
    { label: '銷售訂單', query: '查詢本月銷售訂單', module: 'SD' },
    { label: '庫存異動', query: '查詢庫存異動記錄', module: 'MM' },
    { label: '供應商比較', query: '比較供應商 A 和 B 的採購金額', module: 'MM' },
  ];

  const resultColumns = result?.columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    render: (val: any) => {
      if (val === null || val === undefined) return <Text type="secondary">-</Text>;
      if (typeof val === 'number') return val.toLocaleString();
      return String(val);
    }
  })) || [];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <DatabaseOutlined /> Data Agent Query Playground
      </Title>

      <Row gutter={16}>
        {/* 左側：查詢輸入 */}
        <Col span={14}>
          <Card 
            title="查詢輸入" 
            extra={
              <Space>
                <Select
                  value={selectedModule}
                  onChange={handleModuleChange}
                  style={{ width: 120 }}
                >
                  <Option value="ALL">全部模組</Option>
                  {availableModules.map(m => (
                    <Option key={m} value={m}>{m}</Option>
                  ))}
                </Select>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <TextArea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入自然語言查詢，如：查詢上個月採購金額超過 100 萬的供應商"
                rows={4}
                style={{ fontSize: 14 }}
              />
              
              <div>
                <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                  快速範本：
                </Text>
                <Space wrap>
                  {quickTemplates.map((t, idx) => (
                    <Button 
                      key={idx} 
                      size="small"
                      onClick={() => {
                        setQuery(t.query);
                        setSelectedModule(t.module);
                        setModuleScope([t.module]);
                      }}
                    >
                      {t.label}
                    </Button>
                  ))}
                </Space>
              </div>

              <Space>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />} 
                  onClick={handleExecute}
                  loading={loading}
                  size="large"
                >
                  執行查詢
                </Button>
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={handleClear}
                  size="large"
                >
                  清除
                </Button>
              </Space>
            </Space>
          </Card>

          {/* 結果區域 */}
          <Card 
            title={
              <Space>
                <span>查詢結果</span>
                {result && (
                  <Tag icon={<TableOutlined />} color="blue">
                    {result.rows.length} 列
                  </Tag>
                )}
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            {loading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">正在執行查詢...</Text>
                </div>
              </div>
            )}

            {error && (
              <Alert
                type="error"
                title="查詢錯誤"
                description={error}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {result && !loading && (
              <Tabs 
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'result',
                    label: (
                      <span>
                        <TableOutlined /> 結果
                      </span>
                    ),
                    children: (
                      result.rows.length > 0 ? (
                        <Table 
                          columns={resultColumns} 
                          dataSource={result.rows} 
                          rowKey={(_, index) => String(index)}
                          pagination={{ pageSize: 10 }}
                          size="small"
                          scroll={{ x: 'max-content' }}
                        />
                      ) : (
                        <Empty description="無查詢結果" />
                      )
                    )
                  },
                  {
                    key: 'sql',
                    label: (
                      <span>
                        <BranchesOutlined /> SQL
                      </span>
                    ),
                    children: (
                       <div>
                         <Button 
                           type="link" 
                           icon={<CopyOutlined />} 
                           onClick={handleCopySql}
                           style={{ marginBottom: 8, padding: 0 }}
                         >
                           {sqlCopied ? '已複製!' : '複製 SQL'}
                         </Button>
                         <pre style={{ 
                           background: token.colorFillTertiary, 
                           padding: 16, 
                           borderRadius: 6,
                           overflow: 'auto',
                           maxHeight: 300,
                           fontSize: 12
                         }}>
                           {queryResponse?.data?.sql || '-'}
                         </pre>
                       </div>
                    )
                  },
                  {
                    key: 'intent',
                    label: (
                      <span>
                        <ThunderboltOutlined /> Intent
                      </span>
                    ),
                    children: (
                       <pre style={{ 
                         background: token.colorFillTertiary, 
                         padding: 16, 
                         borderRadius: 6,
                         overflow: 'auto',
                         maxHeight: 300,
                         fontSize: 12
                       }}>
                         {JSON.stringify(queryResponse?.intent, null, 2)}
                       </pre>
                     )
                  },
                  {
                    key: 'debug',
                    label: (
                      <span>
                        <InfoCircleOutlined /> Debug
                      </span>
                    ),
                    children: (
                      <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Cache Hit">
                          {queryResponse?.cache_hit ? 
                            <Badge status="success" text="是" /> : 
                            <Badge status="default" text="否" />
                          }
                        </Descriptions.Item>
                        <Descriptions.Item label="Execution Time">
                          {queryResponse?.data?.metadata?.duration_ms}ms
                        </Descriptions.Item>
                        <Descriptions.Item label="Truncated">
                          {queryResponse?.data?.metadata?.truncated ? 
                            <Badge status="warning" text="是" /> : 
                            <Badge status="success" text="否" />
                          }
                        </Descriptions.Item>
                        <Descriptions.Item label="Trace ID">
                          <Text code>{queryResponse?.data?.metadata?.trace_id}</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    )
                  }
                ]}
              />
            )}

            {!result && !loading && !error && (
              <Empty description="輸入查詢並點擊執行" />
            )}
          </Card>
        </Col>

        {/* 右側：統計與資訊 */}
        <Col span={10}>
          <Card title="查詢統計" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="執行時間" 
                  value={executionTime ?? 0} 
                  suffix="ms"
                  prefix={<ClockCircleOutlined />}
                  styles={{ content: { fontSize: 24 } }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="結果列數" 
                  value={result?.rows.length ?? 0} 
                  prefix={<TableOutlined />}
                  styles={{ content: { fontSize: 24 } }}
                />
              </Col>
            </Row>
          </Card>

          <Card title="可用資料表" style={{ marginBottom: 16 }}>
            <Collapse 
              ghost
              items={availableModules.map(module => ({
                key: module,
                label: <Tag color="blue">{module}</Tag>,
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {tables.filter(t => t.module === module).map(t => (
                      <div key={t.table_id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>{t.table_name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t.primary_keys?.join(', ') || '-'}
                        </Text>
                      </div>
                    ))}
                  </Space>
                )
              }))}
            />
          </Card>

          <Card title="使用說明">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                1. 選擇要查詢的模組（MM/SD/FI）
              </Text>
              <Text type="secondary">
                2. 輸入自然語言查詢或使用快速範本
              </Text>
              <Text type="secondary">
                3. 點擊「執行查詢」獲得結果
              </Text>
              <Text type="secondary">
                4. 可查看 SQL、Intent 和 Debug 資訊
              </Text>
              <Divider />
              <Alert
                type="info"
                title="提示"
                description="複雜查詢可能需要較長時間處理，建議縮小查詢範圍以獲得更快回應。"
                showIcon
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

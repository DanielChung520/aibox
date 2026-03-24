/**
 * @file        知識庫詳情頁面
 * @description 顯示知識庫檔案列表與詳情 (源文件/向量/圖譜)
 * @lastUpdate  2026-03-24 23:08:24
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Space, Typography, Empty, App, theme } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { KnowledgeFile } from '../../services/api';
import KBFileList from './components/KBFileList';
import KBSourcePreview from './components/KBSourcePreview';
import KBVectorPanel from './components/KBVectorPanel';
import KBGraphPanel from './components/KBGraphPanel';
import KBFileUpload from './components/KBFileUpload';

const { Title, Text } = Typography;

const MOCK_FILES: KnowledgeFile[] = [
  { _key: 'f1', filename: '庫存規範.pdf', file_size: 1258000, file_type: 'application/pdf', upload_time: '2026-03-01T10:00:00Z', vector_status: 'completed', graph_status: 'completed', knowledge_root_id: 'kb1' },
  { _key: 'f2', filename: '採購流程.md', file_size: 45600, file_type: 'text/markdown', upload_time: '2026-03-05T14:30:00Z', vector_status: 'completed', graph_status: 'processing', knowledge_root_id: 'kb1' },
  { _key: 'f3', filename: '物料標準.txt', file_size: 12300, file_type: 'text/plain', upload_time: '2026-03-10T09:00:00Z', vector_status: 'processing', graph_status: 'pending', knowledge_root_id: 'kb1' },
  { _key: 'f4', filename: '供應商評估報告.pdf', file_size: 3456000, file_type: 'application/pdf', upload_time: '2026-03-15T16:00:00Z', vector_status: 'pending', graph_status: 'pending', knowledge_root_id: 'kb1' },
  { _key: 'f5', filename: '品質管控手冊.md', file_size: 89000, file_type: 'text/markdown', upload_time: '2026-03-20T11:30:00Z', vector_status: 'completed', graph_status: 'completed', knowledge_root_id: 'kb1' },
];

export default function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [files, setFiles] = useState<KnowledgeFile[]>(MOCK_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('source');
  const [uploadMode, setUploadMode] = useState<boolean>(false);

  const selectedFile = files.find(f => f._key === selectedFileId);

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setUploadMode(false);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles(files.filter(f => f._key !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(undefined);
    }
    message.success('文件已刪除 (Mock)');
  };

  const handleUploadComplete = () => {
    message.success('文件上傳成功 (Mock)');
    setUploadMode(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Bar */}
      <div style={{
        padding: token.padding,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        alignItems: 'center',
        gap: token.margin,
        backgroundColor: token.colorBgContainer
      }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/app/knowledge/management')}
        />
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0, color: token.colorText }}>MM-Agent 知識庫</Title>
          <Text style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
            ID: {id || 'kb1'}
          </Text>
        </Space>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel */}
        <div style={{
          width: 280,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: token.colorBgContainer,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <KBFileList
            rootId={id || 'kb1'}
            files={files}
            selectedFileId={selectedFileId}
            onSelectFile={handleSelectFile}
            onUpload={() => setUploadMode(true)}
            onDeleteFile={handleDeleteFile}
            loading={false}
          />
        </div>

        {/* Right Panel */}
        <div style={{
          flex: 1,
          backgroundColor: token.colorBgLayout,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {uploadMode ? (
            <div style={{ padding: token.paddingXL, maxWidth: 600, margin: '0 auto', width: '100%' }}>
              <KBFileUpload rootId={id || 'kb1'} onUploadComplete={handleUploadComplete} />
            </div>
          ) : !selectedFile ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description={<Text style={{ color: token.colorTextSecondary }}>請在左側選擇文件以查看詳情</Text>} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: `0 ${token.padding}px`, backgroundColor: token.colorBgContainer }}>
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    { key: 'source', label: '源文件' },
                    { key: 'vector', label: '向量' },
                    { key: 'graph', label: '圖譜' }
                  ]}
                />
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: token.padding }}>
                {activeTab === 'source' && (
                  <KBSourcePreview fileId={selectedFile._key} fileName={selectedFile.filename} fileType={selectedFile.file_type} />
                )}
                {activeTab === 'vector' && (
                  <KBVectorPanel fileId={selectedFile._key} />
                )}
                {activeTab === 'graph' && (
                  <KBGraphPanel fileId={selectedFile._key} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

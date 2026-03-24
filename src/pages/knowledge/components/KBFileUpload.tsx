/**
 * @file        知識庫文件上傳元件
 * @description 支援拖曳上傳文件至知識庫
 * @lastUpdate  2026-03-24 23:08:24
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Upload, App, theme } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

interface KBFileUploadProps {
  rootId: string;
  onUploadComplete: () => void;
}

export default function KBFileUpload({ onUploadComplete }: KBFileUploadProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const customRequest = (options: { onSuccess?: (res: string) => void }) => {
    setTimeout(() => {
      options.onSuccess?.('ok');
      message.success('文件上傳成功 (Mock)');
      onUploadComplete();
    }, 1000);
  };

  return (
    <div style={{ backgroundColor: token.colorBgContainer, padding: token.paddingXL, borderRadius: token.borderRadiusLG }}>
      <Dragger 
        customRequest={customRequest}
        showUploadList={false}
        multiple={true}
        style={{ padding: '40px 0' }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ color: token.colorPrimary, fontSize: 48 }} />
        </p>
        <p className="ant-upload-text" style={{ color: token.colorText, fontSize: 16, marginTop: 16, fontWeight: 500 }}>
          點擊或拖曳文件至此區域進行上傳
        </p>
        <p className="ant-upload-hint" style={{ color: token.colorTextSecondary, marginTop: 8 }}>
          支援 .txt, .md, .pdf 等格式文件 (Mock 模式)
        </p>
      </Dragger>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Badge, Button, Dropdown, Modal, Segmented, Tooltip, message } from 'antd';
import { CloudOutlined, DeleteOutlined, StopOutlined, WarningOutlined } from '@ant-design/icons';
import { jobsApi, KbJobFile } from '../services/api';
import { useContentTokens, useShellTokens } from '../contexts/AppThemeProvider';

type JobStatus = 'active' | 'failed' | 'completed';

interface JobMonitorProps {
  isDark: boolean;
  primaryColor: string;
  textColor: string;
}

export default function JobMonitor({ textColor }: JobMonitorProps) {
  const [jobs, setJobs] = useState<KbJobFile[]>([]);
  const [tab, setTab] = useState<JobStatus>('active');
  const [clearing, setClearing] = useState(false);
  const [abortingKey, setAbortingKey] = useState<string | null>(null);
  const tokens = useContentTokens();
  const shellTokens = useShellTokens();

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.list(tab);
      setJobs(response.data.data || []);
    } catch (error: unknown) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  useEffect(() => { fetchJobs(); }, [tab]);

  useEffect(() => {
    const timer = setInterval(fetchJobs, 5000);
    return () => clearInterval(timer);
  }, [tab]);

  const handleClear = () => {
    if (jobs.length === 0) return;
    const label = tab === 'failed' ? '失敗' : '已完成';
    Modal.confirm({
      title: `清除${label}任務`,
      content: `確定要清除 ${jobs.length} 筆${label}任務嗎？此操作無法復原。`,
      okText: '確定清除',
      cancelText: '取消',
      okButtonProps: { danger: true, loading: clearing },
      onOk: async () => {
        setClearing(true);
        try {
          const response = await jobsApi.clear(tab === 'active' ? 'failed' : tab);
          message.success(response.data.message || '已清除');
          fetchJobs();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          message.error(err.response?.data?.message || '清除失敗');
        } finally {
          setClearing(false);
        }
      },
    });
  };

  const handleAbort = (job: KbJobFile) => {
    Modal.confirm({
      title: '中止任務',
      content: `確定要中止「${job.filename}」嗎？`,
      okText: '確定中止',
      cancelText: '取消',
      okButtonProps: { danger: true, loading: abortingKey === job._key },
      onOk: async () => {
        if (!job._key) return;
        setAbortingKey(job._key);
        try {
          await jobsApi.abort(job._key);
          message.success('任務已中止');
          fetchJobs();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          message.error(err.response?.data?.message || '中止失敗');
        } finally {
          setAbortingKey(null);
        }
      },
    });
  };

  const getOverallStatus = (job: KbJobFile) => {
    if (job.vector_status === 'failed' || job.graph_status === 'failed') return 'failed';
    if (job.vector_status === 'processing' || job.graph_status === 'processing') return 'processing';
    if (job.vector_status === 'completed' && job.graph_status === 'completed') return 'completed';
    return 'pending';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { color: tokens.colorWarning, text: '等待中' };
      case 'processing': return { color: tokens.colorPrimary, text: '處理中' };
      case 'failed': return { color: tokens.colorError, text: '失敗' };
      case 'completed': return { color: tokens.colorSuccess, text: '完成' };
      default: return { color: tokens.colorInfo, text: '未知' };
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'md') return '📝';
    if (t === 'pdf') return '📕';
    if (t === 'docx' || t === 'doc') return '📘';
    if (t === 'xlsx' || t === 'xls') return '📊';
    if (t === 'pptx' || t === 'ppt') return '📙';
    if (t === 'csv') return '📑';
    if (t === 'txt') return '📄';
    return '📎';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const activeJobs = jobs.filter((j) => {
    const s = getOverallStatus(j);
    return s === 'pending' || s === 'processing';
  });
  const badgeCount = activeJobs.length;

  const tabLabels: Record<JobStatus, string> = {
    active: '處理中',
    failed: '失敗',
    completed: '已完成',
  };

  const tabBadges: Record<JobStatus, number> = {
    active: badgeCount,
    failed: jobs.filter((j) => getOverallStatus(j) === 'failed').length,
    completed: jobs.filter((j) => getOverallStatus(j) === 'completed').length,
  };

  const showClear = tab !== 'active';

  return (
    <Dropdown
      placement="bottomRight"
      trigger={['click']}
      dropdownRender={() => (
        <div
          style={{
            width: 340,
            background: tokens.colorBgBase,
            borderRadius: tokens.borderRadius,
            boxShadow: tokens.boxShadow,
            border: `1px solid ${shellTokens.siderBorder}`,
            padding: 0,
          }}
        >
          <div
            style={{
              padding: '10px 12px 10px 16px',
              borderBottom: `1px solid ${shellTokens.siderBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Segmented
              value={tab}
              onChange={(v) => setTab(v as JobStatus)}
              options={[
                { label: `${tabLabels.active}${tabBadges.active > 0 ? ` (${tabBadges.active})` : ''}`, value: 'active' },
                { label: `${tabLabels.failed}${tabBadges.failed > 0 ? ` (${tabBadges.failed})` : ''}`, value: 'failed' },
                { label: tabLabels.completed, value: 'completed' },
              ]}
              style={{ flex: 1 }}
            />
            {showClear && jobs.length > 0 && (
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={clearing}
                onClick={handleClear}
                style={{ color: tokens.colorError, flexShrink: 0 }}
                title="清除"
              />
            )}
          </div>

          {jobs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: tokens.textSecondary, fontSize: 13 }}>
              {tab === 'active' ? '目前沒有處理中的任務' : tab === 'failed' ? '沒有失敗的任務' : '沒有已完成任務'}
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {jobs.map((job, index) => {
                const overall = getOverallStatus(job);
                const vecLabel = getStatusLabel(job.vector_status);
                const graLabel = getStatusLabel(job.graph_status);
                const isLast = index === jobs.length - 1;
                return (
                  <div
                    key={job._key}
                    style={{
                      padding: '8px 16px',
                      display: 'flex',
                      gap: 12,
                      borderBottom: isLast ? 'none' : `1px solid ${shellTokens.siderBorder}`,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{getFileIcon(job.file_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tooltip title={job.filename} placement="topLeft">
                          <div
                            style={{
                              color: tokens.colorTextBase,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontSize: 13,
                              fontWeight: 500,
                              flex: 1,
                            }}
                          >
                            {job.filename}
                          </div>
                        </Tooltip>
                        {overall === 'processing' && (
                          <Tooltip title="中止任務">
                            <Button
                              type="text"
                              size="small"
                              icon={<StopOutlined />}
                              loading={abortingKey === job._key}
                              onClick={() => handleAbort(job)}
                              style={{
                                color: tokens.colorError,
                                padding: '0 2px',
                                height: 20,
                                minWidth: 0,
                              }}
                            />
                          </Tooltip>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 12, color: tokens.textSecondary }}>
                        <span style={{ color: vecLabel.color }}>向量化: {vecLabel.text}</span>
                        <span style={{ color: graLabel.color }}>圖譜: {graLabel.text}</span>
                      </div>
                      <div style={{ fontSize: 11, color: tokens.textSecondary, marginTop: 2 }}>
                        {job.knowledge_root_id} | {formatSize(job.file_size)}
                      </div>
                      {overall === 'failed' && job.failed_reason && (
                        <div
                          style={{
                            fontSize: 11,
                            color: tokens.colorError,
                            marginTop: 3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 280,
                          }}
                          title={job.failed_reason}
                        >
                          <WarningOutlined style={{ marginRight: 3 }} />
                          {job.failed_reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    >
      <Badge count={badgeCount} size="small" style={{ pointerEvents: 'none' }}>
        <Button type="text" icon={<CloudOutlined />} style={{ color: textColor }} />
      </Badge>
    </Dropdown>
  );
}

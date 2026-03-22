import { useState, useRef, useEffect } from 'react';
import { Input, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  ScissorOutlined,
  SmileOutlined,
  AudioOutlined,
  SendOutlined,
  StopOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useColors } from '../contexts/AppThemeProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function TaskChat() {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyMode, setReplyMode] = useState('1. 自動');
  const [queue, setQueue] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const replyModeItems: MenuProps['items'] = [
    { key: 'auto', label: '1. 自動' },
    { key: 'fast', label: '2. 快速' },
    { key: 'detail', label: '3. 詳細' },
  ];

  const inputBarIcons = [
    { icon: <EditOutlined />, key: 'mention' },
    { icon: <PlusOutlined />, key: 'add' },
    { icon: <ScissorOutlined />, key: 'cut' },
    { icon: <SmileOutlined />, key: 'emoji' },
    { icon: <AudioOutlined />, key: 'voice-input' },
  ];

  const processNext = () => {
    setLoading(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '這是 AI 的回覆內容，實際功能開發中...',
        timestamp: new Date().toLocaleTimeString('zh-TW'),
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);

      if (queue.length > 0) {
        const [, ...rest] = queue;
        setQueue(rest);
        processNext();
      }
    }, 1200);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();

    if (loading) {
      setQueue(prev => [...prev, text]);
      setInputValue('');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('zh-TW'),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    processNext();
  };

  const handleStop = () => {
    setLoading(false);
    setQueue([]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getLabel = (items: MenuProps['items'], key: string) => {
    const item = items?.find(i => i && 'key' in i && i.key === key);
    return item && 'label' in item ? String(item.label) : '';
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgBase,
      color: colors.textBase,
      fontFamily: 'Inter, "PingFang SC", -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      {/* 中間對話區 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 16px',
        scrollbarWidth: 'thin',
        scrollbarColor: `${colors.textSecondary} transparent`,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{ height: '100%' }} />
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 24,
            }}
          >
            <div style={{
              maxWidth: '70%',
              background: msg.role === 'user' ? colors.chatInputBg : 'transparent',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 14,
              lineHeight: 22,
              color: colors.textBase,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 4, padding: '10px 12px' }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: colors.textSecondary,
                    animation: 'dotBounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 底部輸入區 */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.chatInputBg}`,
        flexShrink: 0,
      }}>
        {queue.length > 0 && (
          <div style={{
            marginBottom: 8,
            padding: '8px 12px',
            background: colors.chatInputBg,
            borderRadius: 8,
            border: `1px solid ${colors.chatInputBg}`,
          }}>
            <div style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 6,
              fontWeight: 500,
            }}>
              排程中 ({queue.length})
            </div>
            {queue.map((text, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  borderBottom: index < queue.length - 1 ? `1px solid ${colors.chatInputBg}` : 'none',
                }}
              >
                <span style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  flexShrink: 0,
                }}>
                  {index + 1}.
                </span>
                <span style={{
                  fontSize: 13,
                  color: colors.textBase,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {text}
                </span>
                <span
                  onClick={() => handleRemoveFromQueue(index)}
                  style={{
                    fontSize: 12,
                    color: colors.iconDefault,
                    cursor: 'pointer',
                    padding: '2px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = colors.iconHover)}
                  onMouseLeave={e => (e.currentTarget.style.color = colors.iconDefault)}
                >
                  <CloseOutlined />
                </span>
              </div>
            ))}
          </div>
        )}
        {/* 輔助選項列 */}
        <div style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dropdown menu={{ items: replyModeItems, onClick: ({ key }) => setReplyMode(getLabel(replyModeItems, key) || '1. 自動') }} trigger={['click']}>
              <span style={{ fontSize: 13, color: colors.textSecondary, cursor: 'pointer', padding: '2px 6px', borderRadius: 4, background: colors.chatInputBg }}>
                {replyMode} ▾
              </span>
            </Dropdown>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {inputBarIcons.map(item => (
              <span
                key={item.key}
                style={{ fontSize: 14, color: colors.iconDefault, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.iconHover)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.iconDefault)}
              >
                {item.icon}
              </span>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <Input.TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入您的問題..."
            autoSize={{ minRows: 3, maxRows: 3 }}
            style={{
              width: '100%',
              background: colors.chatInputBg,
              border: `1px solid ${colors.chatInputBg}`,
              borderRadius: 8,
              color: colors.textBase,
              fontSize: 14,
              padding: '8px 120px 8px 12px',
              resize: 'none',
            }}
          />
          <div style={{
            position: 'absolute',
            top: 6,
            right: 8,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}>
            {inputBarIcons.map(item => (
              <span
                key={item.key}
                style={{ fontSize: 14, color: colors.iconDefault, cursor: 'pointer', transition: 'color 0.2s', padding: '2px 4px' }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.iconHover)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.iconDefault)}
              >
                {item.icon}
              </span>
            ))}
            <span
              onClick={loading ? handleStop : handleSend}
              style={{
                fontSize: 16,
                color: loading ? colors.btnClear : (inputValue.trim() ? colors.btnSend : colors.iconDefault),
                cursor: loading || inputValue.trim() ? 'pointer' : 'not-allowed',
                transition: 'color 0.2s',
                padding: '2px 4px',
              }}
              onMouseEnter={e => {
                if (loading) {
                  e.currentTarget.style.color = colors.btnClearHover;
                } else if (inputValue.trim()) {
                  e.currentTarget.style.color = colors.btnSendHover;
                }
              }}
              onMouseLeave={e => {
                if (loading) {
                  e.currentTarget.style.color = colors.btnClear;
                } else if (inputValue.trim()) {
                  e.currentTarget.style.color = colors.btnSend;
                }
              }}
            >
              {loading ? <StopOutlined /> : <SendOutlined />}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.textSecondary}; border-radius: 2px; }
      `}</style>
    </div>
  );
}

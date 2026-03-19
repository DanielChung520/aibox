/**
 * @file        Agent 卡片組件
 * @description 顯示 Agent 信息卡片，支持收藏、編輯、刪除和對話操作
 * @lastUpdate  2026-03-18 05:30:00
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState } from 'react';
import { Card, Button, Dropdown, Tag, Tooltip, theme } from 'antd';
import { 
  MoreOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HeartOutlined, 
  HeartFilled,
  MessageOutlined 
} from '@ant-design/icons';
import { iconMap } from '../utils/icons';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'registering' | 'online' | 'maintenance' | 'deprecated';
  usageCount: number;
  groupKey: string;
}

interface AgentCardProps {
  agent: Agent;
  onEdit?: (agentId: string) => void;
  onDelete?: (agentId: string) => void;
  onChat?: (agentId: string) => void;
  onFavorite?: (agentId: string, isFavorite: boolean) => void;
  isFavorite?: boolean;
}

const statusColors: Record<string, { color: string; text: string }> = {
  registering: { color: 'orange', text: '審查中' },
  online: { color: 'green', text: '在線' },
  maintenance: { color: 'gold', text: '維修中' },
  deprecated: { color: 'red', text: '已作廢' },
};

export default function AgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onChat,
  onFavorite, 
  isFavorite: initialIsFavorite = false 
}: AgentCardProps) {
  const { token } = theme.useToken();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);

  const isDarkMode = token.colorBgContainer && token.colorBgContainer !== '#ffffff';
  const hoverShadow = isDarkMode 
    ? '0 8px 24px rgba(167, 139, 250, 0.5)' 
    : token.boxShadowSecondary;
  const normalShadow = isDarkMode 
    ? '0 2px 8px rgba(167, 139, 250, 0.2)' 
    : token.boxShadow;
  const iconBgColor = isDarkMode ? 'rgba(167, 139, 250, 0.2)' : '#e6f7ff';
  const iconColor = isDarkMode ? '#a78bfa' : '#1890ff';
  const descColor = isDarkMode ? '#d4d4d4' : '#666';
  const metaColor = isDarkMode ? '#a3a3a3' : '#999';

  const statusInfo = statusColors[agent.status] || { color: 'default', text: '未知' };
  const IconComponent = agent.icon ? iconMap[agent.icon] : null;

  const menuItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '編輯',
      onClick: () => onEdit?.(agent.id),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '刪除',
      danger: true,
      onClick: () => onDelete?.(agent.id),
    },
  ];

  const isDisabled = agent.status === 'registering' || agent.status === 'deprecated';

  return (
    <Card
      hoverable
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered && !isDisabled ? 'translateY(-4px)' : 'none',
        boxShadow: isHovered && !isDisabled ? hoverShadow : normalShadow,
        border: isHovered && isDarkMode ? '1px solid rgba(167, 139, 250, 0.5)' : undefined,
        width: '100%',
      }}
      onClick={() => !isDisabled && onChat?.(agent.id)}
    >
      {/* 卡片頭部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 8, 
            background: iconBgColor,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 24,
          }}>
            {IconComponent ? <IconComponent style={{ color: iconColor }} /> : '🤖'}
          </div>
          <div>
            <div style={{ 
              fontWeight: 600, 
              fontSize: 16, 
              marginBottom: 4,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}>
              {agent.name}
            </div>
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title={isFavorite ? '取消收藏' : '加入收藏'}>
            <Button 
              type="text" 
              size="small"
              icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                const newState = !isFavorite;
                setIsFavorite(newState);
                onFavorite?.(agent.id, newState);
              }}
            />
          </Tooltip>
          
          <Dropdown 
            menu={{ items: menuItems }} 
            trigger={['click']}
            placement="bottomRight"
          >
            <Button 
              type="text" 
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>

      {/* 卡片內容 */}
      <div style={{ 
        marginBottom: 16, 
        color: descColor, 
        minHeight: 44,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        lineHeight: 1.5,
      }}>
        {agent.description || '暂无描述'}
      </div>

      {/* 卡片底部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: metaColor, fontSize: 12 }}>
          使用次數: {agent.usageCount}
        </div>
        <Button 
          type={isHovered ? 'primary' : 'default'}
          size="small"
          icon={<MessageOutlined />}
          disabled={isDisabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDisabled) onChat?.(agent.id);
          }}
        >
          對話
        </Button>
      </div>
    </Card>
  );
}

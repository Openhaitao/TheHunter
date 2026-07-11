import React, { useState } from 'react';
import { Button, Card, Space, Typography, Spin, message, Drawer, Descriptions, Tag } from 'antd';
import { SettingOutlined, UserOutlined, ShoppingOutlined, SendOutlined } from '@ant-design/icons';
import { getPageContent } from '../utils/extractor';
import { analyzeContent } from '../services/llm';
import { sendToFeishu } from '../services/feishu';
import './Popup.css';

const { Title } = Typography;

const Popup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [currentType, setCurrentType] = useState<'contact' | 'product' | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openOptions = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  };

  const handleExtract = async (type: 'contact' | 'product') => {
    setLoading(true);
    setCurrentType(type);
    setStatus('正在提取页面信息...');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      // Injection logic
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getPageContent,
      });

      const pageData = injectionResults[0].result;
      if (!pageData) throw new Error('Failed to extract page content');

      setStatus('正在使用 AI 分析数据...');
      const analyzedData = await analyzeContent(type, pageData);
      
      setPreviewData(analyzedData);
      setDrawerVisible(true);
      setStatus('');
    } catch (error: any) {
      console.error(error);
      message.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!previewData || !currentType) return;
    
    setLoading(true);
    setStatus('正在推送到飞书...');
    
    try {
      await sendToFeishu(currentType, previewData);
      message.success('推送成功！');
      setDrawerVisible(false);
      setPreviewData(null);
    } catch (error: any) {
      console.error(error);
      message.error(error.message || 'Push failed');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const renderPreview = () => {
    if (!previewData) return null;
    
    // Dynamic rendering based on keys
    return (
      <Descriptions column={1} size="small" bordered>
        {Object.entries(previewData).map(([key, value]) => (
          <Descriptions.Item label={key} key={key}>
            {Array.isArray(value) ? (
              value.map((v: string, i: number) => <Tag key={i}>{v}</Tag>)
            ) : (
              <span style={{ wordBreak: 'break-all' }}>{String(value || '-')}</span>
            )}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <div className="popup-container">
      <div className="header">
        <Title level={4} style={{ margin: 0, color: '#4F46E5' }}>TheHunter</Title>
        <Button type="text" icon={<SettingOutlined />} onClick={openOptions} />
      </div>

      <div className="main-actions">
        <Card 
          hoverable 
          className="action-card"
          onClick={() => handleExtract('contact')}
        >
          <Space direction="vertical" align="center">
            <UserOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            <span className="action-title">保存联系人</span>
            <span className="action-desc">LinkedIn / 即刻 / 小红书</span>
          </Space>
        </Card>

        <Card 
          hoverable 
          className="action-card"
          onClick={() => handleExtract('product')}
        >
          <Space direction="vertical" align="center">
            <ShoppingOutlined style={{ fontSize: 32, color: '#52c41a' }} />
            <span className="action-title">保存产品</span>
            <span className="action-desc">Product Hunt / 官网</span>
          </Space>
        </Card>
      </div>

      {loading && (
        <div className="loading-overlay">
          <Spin tip={status} size="large" />
        </div>
      )}

      <Drawer
        title="信息预览"
        placement="bottom"
        height="90%"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend}>
            推送飞书
          </Button>
        }
      >
        {renderPreview()}
      </Drawer>
    </div>
  );
};

export default Popup;


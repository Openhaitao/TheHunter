import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, Divider, Typography } from 'antd';

const { Title, Text } = Typography;

interface Config {
  siliconFlowBaseUrl: string;
  siliconFlowApiKey: string;
  siliconFlowModel: string;
  feishuContactWebhook: string;
  feishuProductWebhook: string;
}

const defaultValues: Config = {
  siliconFlowBaseUrl: 'https://api.siliconflow.cn/v1',
  siliconFlowApiKey: '',
  siliconFlowModel: 'deepseek-ai/DeepSeek-V2.5',
  feishuContactWebhook: '',
  feishuProductWebhook: '',
};

const Options: React.FC = () => {
  const [form] = Form.useForm<Config>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(defaultValues, (items) => {
      form.setFieldsValue(items as Config);
    });
  }, [form]);

  const onFinish = (values: Config) => {
    setLoading(true);
    chrome.storage.local.set(values, () => {
      setLoading(false);
      message.success('配置已保存！');
    });
  };

  const onReset = () => {
    form.setFieldsValue(defaultValues);
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>TheHunter 设置</Title>
      
      <Card title="API 配置" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={defaultValues}
        >
          <Divider orientation="left">硅基流动 (SiliconFlow) 设置</Divider>
          
          <Form.Item
            label="Base URL"
            name="siliconFlowBaseUrl"
            rules={[{ required: true, message: '请输入 Base URL' }]}
            tooltip="默认为 https://api.siliconflow.cn/v1"
          >
            <Input placeholder="https://api.siliconflow.cn/v1" />
          </Form.Item>

          <Form.Item
            label="API Key"
            name="siliconFlowApiKey"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>

          <Form.Item
            label="Model"
            name="siliconFlowModel"
            rules={[{ required: true, message: '请输入模型名称' }]}
            tooltip="例如: deepseek-ai/DeepSeek-V2.5"
          >
            <Input placeholder="deepseek-ai/DeepSeek-V2.5" />
          </Form.Item>

          <Divider orientation="left">飞书 (Feishu) Webhook 设置</Divider>

          <Form.Item
            label="联系人 Webhook URL"
            name="feishuContactWebhook"
            rules={[{ required: true, message: '请输入联系人 Webhook 地址' }]}
            tooltip="用于接收联系人信息的飞书多维表格 Webhook"
          >
            <Input placeholder="https://www.feishu.cn/flow/api/v1/..." />
          </Form.Item>

          <Form.Item
            label="产品信息 Webhook URL"
            name="feishuProductWebhook"
            rules={[{ required: true, message: '请输入产品信息 Webhook 地址' }]}
            tooltip="用于接收产品信息的飞书多维表格 Webhook"
          >
            <Input placeholder="https://www.feishu.cn/flow/api/v1/..." />
          </Form.Item>

          <Form.Item style={{ marginTop: 20, textAlign: 'right' }}>
            <Button style={{ marginRight: 10 }} onClick={onReset}>
              恢复默认
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <div style={{ marginTop: 20, textAlign: 'center', color: '#999' }}>
        <Text type="secondary">TheHunter v1.0.0</Text>
      </div>
    </div>
  );
};

export default Options;


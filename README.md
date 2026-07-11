# TheHunter Chrome Extension

这是一个用于投资人的 Chrome 浏览器插件，可以一键提取网页信息（联系人/产品），通过 LLM 智能分析后推送到飞书多维表格。

## 功能特点

- **联系人提取**: 支持 LinkedIn、即刻、小红书等个人主页，提取姓名、职位、公司、社交链接等。
- **产品提取**: 支持 Product Hunt、官网等，提取产品名称、一句话介绍、核心功能等。
- **智能分析**: 集成硅基流动 (SiliconFlow) API，支持 DeepSeek 等模型。
- **飞书同步**: 支持通过 Webhook 推送到飞书多维表格 (Base)。

## 开发环境准备

确保你已安装 Node.js (推荐 v18+)。

1. 安装依赖:
   ```bash
   npm install
   ```

2. 构建项目:
   ```bash
   npm run build
   ```

## 安装到 Chrome

1. 打开 Chrome 浏览器，进入扩展程序页面: `chrome://extensions/`
2. 打开右上角的 **"开发者模式" (Developer mode)** 开关。
3. 点击左上角的 **"加载已解压的扩展程序" (Load unpacked)**。
4. 选择本项目目录下的 `dist` 文件夹。

## 配置说明

插件安装后，点击插件图标，点击右上角的设置按钮进入配置页。

### 1. 硅基流动 (SiliconFlow) 设置
- **Base URL**: 默认为 `https://api.siliconflow.cn/v1`
- **API Key**: 在 [硅基流动控制台](https://cloud.siliconflow.cn/) 获取。
- **Model**: 推荐使用 `deepseek-ai/DeepSeek-V2.5`。

### 2. 飞书 (Feishu) 设置
你需要为“联系人”和“产品”分别或统一创建一个飞书多维表格的自动化流程。

**步骤:**
1. 打开飞书多维表格。
2. 点击右上角 "自动化" -> "新建自动化"。
3. 触发器选择: **"当收到 Webhook 时"**。
4. 复制生成的 Webhook URL，填入插件设置。
5. 在飞书自动化中配置后续动作 (如 "新增记录")，将 Webhook 接收到的 JSON 数据映射到表格字段。

**JSON 数据结构参考:**

*联系人 (Contact):*
```json
{
  "name": "姓名",
  "title": "职位",
  "company": "公司",
  "social_links": ["url1", "url2"],
  "email": "email",
  "summary": "简介",
  "tags": ["tag1", "tag2"],
  "source_url": "来源URL",
  "page_title": "页面标题"
}
```

*产品 (Product):*
```json
{
  "product_name": "产品名",
  "one_line_pitch": "一句话介绍",
  "description": "描述",
  "key_features": ["feature1"],
  "target_audience": "目标用户",
  "pricing_model": "定价模式",
  "source_url": "来源URL",
  "page_title": "页面标题"
}
```


import { Empty, Button, Typography, Space } from '@arco-design/web-react';
const { Title, Text } = Typography;

export default function EmptyEditor() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        background: '#f7f8fa', // 浅灰背景，比纯白更有层次感，保护视力
        color: '#4e5969'
      }}
    >
      <Empty
        // 可以使用内置图片，也可以自定义图片
        // image={<img src="/your-custom-image.svg" alt="empty" />} 
        style={{ marginBottom: 24 }}
      />
      
      <Space direction="vertical" align="center" size={12}>
        <Title heading={5} style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
          暂无打开的任务
        </Title>
        
        <Text type="secondary" style={{ fontSize: 13 }}>
          请在左侧任务列表中选择一个任务，或右键目录新建任务
        </Text>
      </Space>
    </div>
  );
}
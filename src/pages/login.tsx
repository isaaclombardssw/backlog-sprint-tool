import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { Card, Button, Typography, Space, Alert, Image } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Login() {
  const router = useRouter();
  const { error } = router.query;

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f0f2f5'
    }}>
      <Card 
        style={{ 
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Image
              src="/ssw.png"
              alt="SSW Logo"
              preview={false}
              style={{
                width: 120,
                opacity: 0.8,
                marginBottom: 16
              }}
            />
            <Title level={2}>Welcome Back</Title>
            <Text type="secondary">Sign in to your account to continue</Text>
          </div>

          {error && (
            <Alert
              message="Authentication Failed"
              description="Please try signing in again"
              type="error"
              showIcon
            />
          )}

          <Button
            type="primary"
            icon={<GithubOutlined />}
            size="large"
            block
            onClick={() => signIn("github", { callbackUrl: "/" })}
            style={{ height: 40 }}
          >
            Sign in with GitHub
          </Button>
        </Space>
      </Card>
    </div>
  );
} 
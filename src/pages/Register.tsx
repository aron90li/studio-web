import {
  Button,
  Form,
  Input,
  Card,
  Message,
  Typography
} from '@arco-design/web-react'
import {
  IconUser,
  IconLock,
  IconSafe
} from '@arco-design/web-react/icon'
import '@arco-design/web-react/dist/css/arco.css'
import { useEffect, useState } from 'react'
import { getCaptcha, register } from '../api/auth'
import { useNavigate } from 'react-router-dom'
import globalLoginRegisterStyles from '../styles/global-login-register.ts'

const { Title, Text } = Typography

export default function Register() {
  // 路由跳转，跳转到登录页（/ 对应你的登录页路由）
  const navigate = useNavigate()
  const [captcha, setCaptcha] = useState({ image: '', uuid: '' })

  const loadCaptcha = async () => {
    try {
      const res = await getCaptcha()
      setCaptcha(res.data.data)
    } catch (err) {
      Message.error('验证码加载失败，请稍后重试')
    }
  }

  // 页面初始化加载验证码
  useEffect(() => {
    loadCaptcha()
  }, [])

  // 表单提交逻辑，和登录页交互风格统一
  const onSubmit = async (values: any) => {
    try {
      // 拼接验证码uuid，和后端接口参数匹配（和登录页一致）
      const res = await register({ ...values, uuid: captcha.uuid })

      if (!res.data.success) {
        Message.error(res.data.msg || '注册失败')
        loadCaptcha()
        return
      }

      // 注册成功：提示+跳转到登录页
      Message.success('注册成功，请登录')
      navigate('/') // 跳转到你的登录页路由，和你原有代码一致
    } catch (err) {
      Message.error('请求失败，请稍后重试')
      loadCaptcha()
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.left}>
          <Title heading={3} style={{ color: '#fff' }}>
            Stream Studio
          </Title>
          <Text style={{ color: 'rgba(255,255,255,.8)' }}>流计算开发</Text>
        </div>

        {/* 右侧注册卡片：和登录页卡片样式、尺寸完全一致 */}
        <Card style={styles.card} bordered={false}>
          <Title heading={5} style={{ marginBottom: 24 }}>
            用户注册
          </Title>

          {/* 表单：和登录页同款配置，加语义化name，适配浏览器识别 */}
          <Form layout="vertical" onSubmit={onSubmit} name="registerForm">
            {/* 用户名输入框：和登录页一致的图标、尺寸、校验 */}
            <Form.Item
              field="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<IconUser />}
                size="large"
                placeholder="请设置用户名"
                autoComplete="username"
              />
            </Form.Item>

            {/* 密码输入框：和登录页一致的密码组件、图标、校验 */}
            <Form.Item
              field="password"
              rules={[{ required: true, message: '请设置密码' }]}
            >
              <Input.Password
                prefix={<IconLock />}
                size="large"
                placeholder="请设置密码"
                autoComplete="new-password" // 语义化：新密码，避免浏览器自动填充旧密码
              />
            </Form.Item>

            {/* 验证码输入框：和登录页完全一致的配置、交互 */}
            <Form.Item
              field="code"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Input
                prefix={<IconSafe />}
                size="large"
                placeholder="请输入验证码"
                autoComplete="one-time-code"
                maxLength={4}
                suffix={
                  <img
                    src={`data:image/jpg;base64,${captcha.image}`}
                    style={styles.captcha}
                    onClick={loadCaptcha}
                    alt="验证码"
                    title="点击刷新验证码"
                  />
                }
              />
            </Form.Item>

            {/* 注册按钮：和登录页同款主按钮、尺寸 */}
            <Button type="primary" size="large" htmlType="submit" style={{ width: '100%' }}>
              注册
            </Button>

            <div style={styles.loginLink}>
              <Text>已有账号？</Text>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                立即登录
              </a>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  )
}

const styles: any = {
  ...globalLoginRegisterStyles,

  loginLink: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    a: {
      color: '#165DFF',
      textDecoration: 'none',
      marginLeft: 4,
      '&:hover': {
        textDecoration: 'underline'
      }
    }
  }
}
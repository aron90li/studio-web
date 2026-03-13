import { Button, Form, Input, Card, Message, Typography } from '@arco-design/web-react'
import { IconUser, IconLock, IconSafe } from '@arco-design/web-react/icon'
import '@arco-design/web-react/dist/css/arco.css'
import { useEffect, useState } from 'react'
import { getCaptcha, login } from '../api/auth'
import { setToken } from '../utils/auth'
import { useNavigate } from 'react-router-dom'
import globalLoginRegisterStyles from '../styles/global-login-register.ts'
import { useContext } from 'react'
import { UserContext } from '../context/UserContext'
import { getCurrentUser } from '../api/user'

const { Title, Text } = Typography

export default function Login() {

  const { setUser } = useContext(UserContext)
  const navigate = useNavigate()
  const [captcha, setCaptcha] = useState({ image: '', uuid: '' })

  // 加载验证码
  const loadCaptcha = async () => {
    const res = await getCaptcha()
    setCaptcha(res.data.data)
  }

  // UserProvider 中的 useEffect先于此执行
  useEffect(() => {
    loadCaptcha()
  }, [])

  // 提交表单
  const onSubmit = async (values: any) => {
    try {
      const res = await login({ ...values, uuid: captcha.uuid })
      if (!res.data.success) {
        Message.error(res.data.msg || '登录失败')
        loadCaptcha() // 登录失败刷新验证码
        return
      }

      // 登录成功，获取用户信息并保存到全局状态
      setToken(res.data.data.token)

      const userRes = await getCurrentUser()
      if (userRes.data.success) {
        setUser(userRes.data.data)
      } else {
        Message.error('获取用户信息失败')
      }
      
      Message.success('登录成功')
      navigate('/stream/projects')
    } catch (err) {
      console.error('登录请求失败:', err)
      Message.error('请求失败，请稍后再试')
      loadCaptcha()
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* 左侧介绍 */}
        <div style={styles.left}>
          <Title heading={3} style={{ color: '#fff' }}>
            Stream Studio
          </Title>
          <Text style={{ color: 'rgba(255,255,255,.8)' }}>流计算开发</Text>
        </div>

        {/* 右侧登录卡片 */}
        <Card style={styles.card} bordered={false}>
          <Title heading={5} style={{ marginBottom: 24 }}>
            用户登录
          </Title>

          <Form layout="vertical" onSubmit={onSubmit} name='loginForm'>
            {/* 用户名 */}
            <Form.Item
              field="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<IconUser />} size="large" placeholder="用户名" autoComplete="username" />
            </Form.Item>

            {/* 密码 */}
            <Form.Item
              field="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<IconLock />} size="large" placeholder="密码" autoComplete="current-password" />
            </Form.Item>

            {/* 验证码 */}
            <Form.Item
              field="code"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Input
                prefix={<IconSafe />} size="large" placeholder="验证码" autoComplete="one-time-code" maxLength={4}
                suffix={
                  <img
                    src={`data:image/jpg;base64,${captcha.image}`}
                    style={styles.captcha}
                    onClick={loadCaptcha} alt="验证码" title="点击刷新验证码"
                  />
                }
              />
            </Form.Item>

            <Button type="primary" size="large" htmlType="submit" >
              登录
            </Button>

            <div style={styles.registerLink}>
              <Text>没有账号？</Text>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>
                去注册
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

  registerLink: {
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
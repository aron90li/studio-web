import { Layout, Avatar, Dropdown, Menu } from '@arco-design/web-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import GlobalTabs from '../components/GlobalTabs'
import ProjectSelector from '../components/ProjectSelector'
import { useUser } from '../context/useUser'

const { Header, Content } = Layout

// 负责项目相关页面的整体布局，包括顶部导航栏和内容区域
export default function GlobalLayout() {
    const { user, logout } = useUser()
    const location = useLocation()
    const navigate = useNavigate()

    // 是否在“任务页面”（决定是否显示项目下拉） /stream/projects
    const showProjectSelector =
        location.pathname.includes('/stream/studio') ||
        location.pathname.includes('/stream/ops')

    const menu = (
        <Menu
            onClickMenuItem={(key) => {
                if (key === 'logout') {
                    logout()
                    navigate('/')
                } else if (key === 'profile') {
                    navigate('/stream/user')
                }
            }}
        >
            <Menu.Item key="profile">用户中心</Menu.Item>
            <Menu.Item key="logout">退出登录</Menu.Item>
        </Menu>
    )

    return (
        <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex' }}>
            <Header style={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                background: '#fff',
                padding: '0 24px',
                borderBottom: '1px solid #eee'
            }}>
                {/* logo */}
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#165DFF' }}>StreamStudio</div>
                </div>

                {/* 项目 */}
                {showProjectSelector && (
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                        <ProjectSelector />
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }} >
                    <GlobalTabs />
                </div>

                {/* 用户 */}
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                    <Dropdown droplist={menu}
                        triggerProps={{ autoFitPosition: true }} position="br"
                    >
                        <div style={{ cursor: 'pointer' }}>
                            <Avatar size={28} style={{ marginRight: 8 }}>
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </Avatar>
                            <span>{user?.username || '未登录'}</span>
                        </div>
                    </Dropdown>
                </div>
            </Header>

            {/* Content 管 布局 + 滚动 + 背景,  div 管 页面内容的内边距 + 最小高度 + 统一内容容器感 
            flex: 1 剩下空间我全都要 */}
            <Content style={{ padding: 0, background: '#f5f6f7', flex: 1, overflow: 'auto', width: '100%' }}>
                <div style={{ height: '100%', padding: 4, boxSizing: 'border-box', width: '100%'  }}>
                    <Outlet />
                </div>
            </Content>
        </Layout>
    )
}

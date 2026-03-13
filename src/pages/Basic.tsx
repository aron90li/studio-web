import { Layout } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import { useEffect } from 'react';
import { useProjects } from '../context/useProjects';
const { Header, Sider, Content, Footer } = Layout;

export default function Basic() {
    const { projects, fetchProjects } = useProjects()
    // useEffect(() => {
    //     if (projects.length === 0) {
    //         fetchProjects()
    //     }
    // }, [])

    

    return (
        <Layout style={{ height: '100vh' }}>
            <Sider>侧边栏</Sider>
            <Layout>
                <Header style={{}}>
                    头部
                </Header>
                <Content style={{}}>主体内容</Content>
                <Footer style={{}}>底部</Footer>
            </Layout>
        </Layout>
    );
}



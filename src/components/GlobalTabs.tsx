import { Tabs } from '@arco-design/web-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProjects } from '../context/useProjects';
import { Message } from '@arco-design/web-react';
import { useParams } from 'react-router-dom';
import { useUser } from '../context/useUser';

const { TabPane } = Tabs

// Tab 驱动路由 =
//   Tab 的状态来源于 URL
//   Tab 的点击行为 = 改变 URL
// Tabs组件，tab 驱动路由
export default function GlobalTabs() {
    const location = useLocation()
    const navigate = useNavigate()

    const { projects } = useProjects()
    // 路由参数，直接使用
    const { projectId } = useParams<{ projectId: string }>()
    const defaultProjectId = projectId || projects?.[0]?.projectId;
    const { user } = useUser();
    const isAdmin = user?.role === 'ROLE_ADMIN' ? true : false;

    // 根据当前路径计算激活
    const getActiveTab = (pathname: string) => {
        if (pathname.includes('/stream/projects')) return 'projects';
        if (pathname.includes('/stream/studio')) return 'studio';
        if (pathname.includes('/stream/ops')) return 'ops';
        if (pathname.includes('/stream/datasource')) return 'datasource';
        if (pathname.includes('/stream/cluster')) return 'cluster';
        if (pathname.includes('/stream/system')) return 'system';
        if (pathname.includes('/stream/user')) return 'user';
        return 'projects'; // 默认 fallback
    };
    const activeTab = getActiveTab(location.pathname);    

    // tab 驱动路由
    return (
        <Tabs activeTab={activeTab} type="rounded"
            onChange={(key) => {
                if (key === 'projects') navigate('/stream/projects')
                if (key === 'studio') {
                    if (defaultProjectId) {
                        navigate(`/stream/studio/${defaultProjectId}`);
                    } else {
                        Message.info('请先创建一个项目');
                        navigate('/stream/projects');
                    }
                }
                if (key === 'ops') {
                    if (defaultProjectId) {
                        navigate(`/stream/ops/${defaultProjectId}`);
                    } else {
                        Message.info('请先创建一个项目');
                        navigate('/stream/projects');
                    }
                }
                if (key === 'datasource') navigate('/stream/datasource')
                if (key === 'cluster') navigate('/stream/cluster')
                if (key === 'system') navigate('/stream/system')
                if (key === 'user') navigate('/stream/user')
            }}
        >
            <TabPane key="projects" title="项目列表" />
            <TabPane key="studio" title="任务开发" />
            <TabPane key="ops" title="任务运维" />
            {isAdmin && <TabPane key="datasource" title="数据源" />}
            {isAdmin && <TabPane key="cluster" title="集群管理" />}
            {isAdmin && <TabPane key="system" title="系统管理" />}
            {/* {isAdmin && <TabPane key="user" title="用户管理" />} */}
        </Tabs>
    )
}

import { createBrowserRouter } from 'react-router-dom'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Studio from '../pages/Studio'
import Projects from '../pages/Projects'
import Ops from '../pages/Ops'
import Datasource from '../pages/Datasource'
import Cluster from '../pages/Cluster'
import System from '../pages/System'
import User from '../pages/User'
import Basic from '../pages/Basic'
import AIChat from '../pages/AIChat'
import RequireAuth from './RequireAuth'
import GlobalLayout from '../layouts/GlobalLayout'
import { Navigate } from 'react-router-dom'
import { UserProvider } from '../context/UserProvider'
import { ProjectProvider } from '../context/ProjectProvider'
import DbTool from '../pages/tools/DbTool'
import KafkaTool from '../pages/tools/KafkaTool'

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/basic', element: <Basic /> },
  {
    path: '/aichat', element: (
      <UserProvider>
        <ProjectProvider>
          <RequireAuth>
            <AIChat />
          </RequireAuth>
        </ProjectProvider>
      </UserProvider>
    )
  },
  // 其他路由都放在 GlobalLayout 内，负责整体布局
  {
    path: '/stream/*', element: (
      <UserProvider>
        <ProjectProvider>
          <RequireAuth>
            <GlobalLayout />
          </RequireAuth>
        </ProjectProvider>
      </UserProvider>
    ), children: [
      { path: 'projects', element: <Projects /> },
      { path: 'studio', element: <Navigate to="/stream/projects" replace /> },
      { path: 'studio/:projectId/:taskId?', element: <Studio /> },
      { path: 'ops', element: <Navigate to="/stream/projects" replace /> },
      { path: 'ops/:projectId', element: <Ops /> },
      { path: 'datasource', element: <Datasource /> },
      { path: 'cluster', element: <Cluster /> },
      { path: 'system', element: <System /> },
      { path: 'user', element: <User /> },

    ]
  },
  {
    path: '/tools/db', element: (
      <UserProvider>
        <ProjectProvider>
          <RequireAuth>
            <DbTool />
          </RequireAuth>
        </ProjectProvider>
      </UserProvider>
    )
  },
  {
    path: '/tools/kafka', element: (
      <UserProvider>
        <ProjectProvider>
          <RequireAuth>
            <KafkaTool />
          </RequireAuth>
        </ProjectProvider>
      </UserProvider>
    )
  }
])

export default router

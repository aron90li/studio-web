import { RouterProvider } from 'react-router-dom'
import router from './router'
import { UserProvider } from './context/UserProvider'
import { ProjectProvider } from './context/ProjectProvider'


// 操作	                          UserProvider 是否重新挂载	     路由组件（Login/Projects）是否重新挂载
// 应用启动 / 页面刷新	           是（仅一次）	                  是（当前访问的页面）
// 切换页面（/login → /projects）	 否（始终挂载）	                是（旧页面卸载，新页面挂载）


function App() {
  return (
    <UserProvider>
      <ProjectProvider>
        <RouterProvider router={router} />
      </ProjectProvider>
    </UserProvider>
  )
}

export default App

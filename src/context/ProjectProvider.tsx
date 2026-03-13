import { useEffect, useState, useCallback } from 'react'
import { ProjectContext } from './ProjectContext'
import { getProject } from '../api/project'
import { ProjectVO } from '../types/project'
import { Message } from '@arco-design/web-react'

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectVO[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProject()
      if (res.data.success) {
        setProjects(res.data.data || [])
      } else {
        Message.error(res.data.msg || '获取项目列表失败')
      }
    } catch (err) {
      console.error('获取项目列表失败：', err)
      Message.error('获取项目列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 关键点
   * 项目列表不是所有页面都必须有
   * 所以这里【不自动拉取】
   * 
   *  在 projects 页面 fetchProjects
   */
  useEffect(() => {
    // 可选：如果你希望一登录就加载项目，打开这行
    // fetchProjects()
  }, [fetchProjects]) // 

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        fetchProjects,
        setProjects
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

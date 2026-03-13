import { Select } from '@arco-design/web-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProjects } from '../context/useProjects';
import { useParams } from 'react-router-dom';

export default function ProjectSelector() {
  const { projects } = useProjects();

  const navigate = useNavigate()
  const location = useLocation()
  // 路由参数，直接使用
  const { projectId } = useParams<{ projectId: string }>()

  const value =
    projects.some(p => p.projectId === projectId)
      ? projectId
      : undefined

  return (
    <Select
      style={{ width: 200}} // , marginLeft: 16 
      value={value}
      onChange={(projectId) => {  // 路由驱动状态, 改url
        if (location.pathname.includes('/stream/studio')) {
          navigate(`/stream/studio/${projectId}`)
        } else if (location.pathname.includes('/stream/ops')) {
          navigate(`/stream/ops/${projectId}`)
        }
      }}
    >
      {projects.map(p => (
        <Select.Option key={p.projectId} value={p.projectId}>
          {p.projectName}
        </Select.Option>
      ))}
    </Select>
  )
}

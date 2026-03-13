import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useContext(UserContext)

  // loading=true是正在获取用户中，是首次挂载、刷新页面时候的中间状态，不会多久，
  // 它很快就会被设置成false，不管用户是否成功获取
  if (loading) return null

  if (!user) return <Navigate to="/" replace />

  return children
}

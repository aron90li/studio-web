import { useUser } from '../context/useUser'

interface HasRoleProps {
    roles: string[] // 支持多
    children: React.ReactNode
}
const { user } = useUser();

export const HasRole = ({ roles, children }: HasRoleProps) => {
    if (!user) return null
    return roles.includes(user.role) ? <>{children}</> : null
}

import { createContext } from 'react'
import { UserVO } from '../types/user'

export interface UserContextType {
    user: UserVO | null
    loading: boolean
    setUser: (user: UserVO | null) => void
    logout: () => void
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    setUser: () => { },
    logout: () => { }
})

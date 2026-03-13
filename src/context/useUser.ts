import { useContext } from 'react'
import { UserContext, UserContextType } from './UserContext'

export const useUser = (): UserContextType => {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within UserProvider')
  return context
}

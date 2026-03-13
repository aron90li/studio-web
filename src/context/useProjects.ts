import { useContext } from 'react'
import { ProjectContext, ProjectContextType } from './ProjectContext'

export const useProjects = (): ProjectContextType => {
    const context = useContext(ProjectContext)
    if (!context) {
        throw new Error('useProjects must be used within ProjectProvider')
    }
    return context
}

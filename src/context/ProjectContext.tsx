import { createContext } from 'react'
import { ProjectVO } from '../types/project'

export interface ProjectContextType {
    projects: ProjectVO[]
    loading: boolean
    fetchProjects: () => Promise<void>
    setProjects?: (projects: ProjectVO[]) => void
}

export const ProjectContext = createContext<ProjectContextType>({
    projects: [],
    loading: true,
    fetchProjects: async () => { },
    setProjects: () => { }
})





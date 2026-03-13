import request from '../utils/request'

export function createProject(data: {
  projectName: string
  projectIdentity: string
  description: string
}) {
  return request.post('/api/project/createProject', data)
}

export function updateProject(data: {
  projectName: string
  projectIdentity: string
  description: string
  projectId: string
}) {
  return request.post('/api/project/updateProject', data)
}

export function deleteProjects(data: {
  projectIds: string[]
}) {
  return request.post('/api/project/deleteProjects', data)
}

export function getProject() {
  return request.get('/api/project/getProject')
}

export function grantProjectToUser(data: {
  projectId: string
  userId: string
}) {
  return request.post('/api/project/grantProjectToUser', data)
}

export function deleteProjectUser(data: {
  projectId: string
  userId: string
}) {
  return request.post('/api/project/deleteProjectUser', data)
}

export function getProjectUsers(projectId: string) {
  return request.get('/api/project/getProjectUsers', { params: { projectId } })
}

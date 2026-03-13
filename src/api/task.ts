import request from '../utils/request'

export function createTreeNode(data: {
  projectId: string
  nodeName: string
  nodeType: string
  parentNodeId: string
}) {
  return request.post('/api/task/createTreeNode', data)
}


export function getTreeNode(projectId: string) {
  return request.get('/api/task/getTreeNode', { params: { projectId } })
}

export function deleteTreeNode(data: {
  projectId: string
  nodeId: string
}) {
  return request.post('/api/task/deleteTreeNode', data)
}

export function getTask(projectId: string, taskId: string) {
  return request.get('/api/task/getTask', { params: { projectId, taskId } })
}

export function updateTask(data: {
  projectId: string
  taskId: string
  taskVersion: number

  taskName?: string
  description?: string
  taskType?: string
  taskSql?: string
  taskParam?: string
  taskSource?: string
  taskSide?: string
  taskSink?: string
  deleted?: number
  publishStatus?: number
}) {
  return request.post('/api/task/updateTask', data)
}

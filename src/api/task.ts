import request from '../utils/request'

export function createTreeNode(data: {
  projectId: string
  nodeName: string
  nodeType: string
  parentNodeId: string
}) {
  return request.post('/api/task/createTreeNode', data)
}

// 前三个是条件
export function updateTreeNode(data: {
  nodeId: string
  projectId: string
  nodeType: string

  taskId?: string
  nodeName?: string     // 要更改的后的nodeName
  parentNodeId?: string  // 更改后的parentNodeId
}) {
  return request.post('/api/task/updateTreeNode', data)
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

export function cloneTask(data: {
  projectId: string
  taskId: string // 被克隆的任务id
  taskName: string // 克隆后的任务名字
  parentNodeId: string // 要存放的目录
}) {
  return request.post('/api/task/cloneTask', data)
}

import request from '../utils/request'

export function getCurrentUser() {
  return request.get('/api/user/getCurrentUser')
}

export function getAllUsers() {
  return request.get('/api/user/getAllUsers')
}

export function addUser(data: {
  username: string
  password: string
}) {
  return request.post('/api/user/addUser', data)
}

export function updateEnabled(data: {
  userId: string
  enabled: boolean
}) {
  return request.post('/api/user/updateEnabled', data)
}

export function updatePassword(data: {
  userId: string
  oldPassword: string
  newPassword: string
}) {
  return request.post('/api/user/updatePassword', data)
}

export function resetPassword(data: {
  userId: string
  newPassword: string
}) {
  return request.post('/api/user/resetPassword', data)
}

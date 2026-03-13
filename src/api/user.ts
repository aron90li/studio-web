import request from '../utils/request'

export function getCurrentUser() {
  return request.get('/api/user/getCurrentUser')
}

export function getAllUsers() {
  return request.get('/api/user/getAllUsers')
}



import request from '../utils/request'

export function getCaptcha() {
  return request.get('/api/auth/captcha')
}

export function login(data: {
  username: string
  password: string
  code: string
  uuid: string
}) {
  return request.post('/api/auth/login', data)
}

export function register(data: {
  username: string
  password: string
  code: string
  uuid: string
}) {
  return request.post('/api/auth/register', data)
}

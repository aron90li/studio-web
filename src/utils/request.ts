import axios from 'axios'
import { getToken, clearToken } from './auth'
import { Message } from '@arco-design/web-react'

const request = axios.create({
  baseURL: 'http://localhost:8001', // 改成你的后端地址 http://localhost:8001 nginx配置写成/api
  timeout: 15000
})

request.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 拦截接口401，认为未登录，直接跳转到登录页
request.interceptors.response.use(
  response => response,
  error => {
    // 单独处理 401 错误，认为是未登录或登录状态失效
    if (error.response && error.response.status === 401) {
      // 清除 token 和用户信息，直接跳转到登录页
      clearToken()
      Message.warning('登录已失效，请重新登录')
      // 避免死循环
      if (window.location.pathname !== '/') {
        window.location.replace('/')
      }
    } else if (error.response && error.response.status === 403) {
      Message.warning('您没有权限执行该操作')
    }

    // 其他错误正常返回，让调用方处理
    return Promise.reject(error)
  }
)

export default request


// 我的nginx配置
// server {
//     listen 9000 default_server;
//     listen [::]:9000 default_server;

//     # 前端静态资源
//     location / {
//         root /mnt/disk1/stream_studio/dist;  # 替换为你的 dist 实际路径
//         index index.html;
//         try_files $uri $uri/ /index.html;
//     }
//     # API 代理到后端（假设后端在 9001）
//     location /api/ {
//         proxy_pass http://localhost:9001/;  # 注意结尾的 /
//         proxy_set_header Host $host;
//         proxy_set_header X-Real-IP $remote_addr;
//         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
//         proxy_set_header X-Forwarded-Proto $scheme;
//     }
// }
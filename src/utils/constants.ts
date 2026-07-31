/** 后端 API 服务基础地址
 *  - 开发环境 (npm run dev) ：读取 .env.development → http://localhost:8001
 *  - 生产构建 (npm run build)：读取 .env.production（未定义，走 nginx 同域代理）
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE || ''

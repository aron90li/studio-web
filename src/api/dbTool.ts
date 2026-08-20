import request from '../utils/request'
import type { DbConnection, MysqlQueryResult } from '../types/dbTool'
import type { ApiResponse } from './response'
import type { AxiosResponse } from 'axios'

export function getDbConnections(): Promise<AxiosResponse<ApiResponse<DbConnection[]>>> {
  return request.get('/api/tools/db/connections')
}

export function executeSql(data: {
  connectionName: string
  sql: string
}): Promise<AxiosResponse<ApiResponse<MysqlQueryResult>>> {
  return request.post('/api/tools/db/execute', data)
}
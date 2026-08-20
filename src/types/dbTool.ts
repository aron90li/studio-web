export interface DbConnection {
  name: string
  driverClassName?: string
  url?: string
  username?: string
}

export interface MysqlQueryResult {
  count: number
  affectedRows: number
  data: Array<Record<string, unknown>>
  error?: string | null
}
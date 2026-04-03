import request from '../utils/request'
import {parseDatasource, parseDatasourceType } from '../types/datasource'

// 返回DatasourceTypeVO[]
export async function selectDatasourceType(typeCode?: string) {
  const res = await request
    .get('/api/datasource/selectDatasourceType', { params: { typeCode } });
  return res.data.data.map(parseDatasourceType);
}

// 返回值为 DatasourceVO[]
export async function selectDatasource() {
  const res = await request
    .get('/api/datasource/selectDatasource');
  return res.data.data.map(parseDatasource);
}

export function createDatasource<T = unknown>(data: {
  datasourceName: string
  description: string
  datasourceType: string
  datasourceVersion: string
  linkJson: T
}) {
  return request.post('/api/datasource/createDatasource', {
    ...data,
    linkJson: JSON.stringify(data.linkJson) // 关键
  })
}


export function deleteDatasource(data: {
  datasourceId: string
}) {
  return request.post('/api/datasource/deleteDatasource', data)
}


export function updateDatasource<T = unknown>(data: {
  datasourceId: string;
  datasourceName?: string;
  description?: string;
  datasourceType?: string;
  datasourceVersion?: string;
  linkJson?: T;
}) {
  return request.post('/api/datasource/updateDatasource', {
    ...data,
    linkJson: JSON.stringify(data.linkJson) // 关键
  })
}

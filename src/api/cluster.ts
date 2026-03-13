import request from '../utils/request'
import { ClusterVO } from '../types/cluster'
import { ApiResponse } from './response'
import { AxiosResponse } from 'axios'

export function createCluster(data: {
  clusterName: string
  description: string
  clusterType: string
  flinkVersion: string
  defaultConf: string
  podTemplate: string
  kubeconfig: string
}) {
  return request.post('/api/cluster/createCluster', data)
}


export function getCluster(): Promise<AxiosResponse<ApiResponse<ClusterVO[]>>> {
  return request.get('/api/cluster/getCluster')
}

export function deleteClusters(data: {
  clusterIds: []
}) {
  return request.post('/api/cluster/deleteClusters', data)
}


export function updateCluster(data: {
  clusterId: string;
  clusterName?: string;
  description?: string;
  clusterType?: string;
  flinkVersion?: string;
  defaultConf?: string;
  podTemplate?: string;
  kubeconfig?: string;
}) {
  return request.post('/api/cluster/updateCluster', data)
}

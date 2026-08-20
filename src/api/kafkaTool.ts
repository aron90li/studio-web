import request from '../utils/request'
import type { KafkaCluster, KafkaMessage, KafkaTopicInfo } from '../types/kafkaTool'
import type { ApiResponse } from './response'
import type { AxiosResponse } from 'axios'

export function getKafkaClusters(): Promise<AxiosResponse<ApiResponse<KafkaCluster[]>>> {
  return request.get('/api/tools/kafka/clusters')
}

export function getKafkaTopics(brokers: string): Promise<AxiosResponse<ApiResponse<KafkaTopicInfo[]>>> {
  return request.get('/api/tools/kafka/topics', { params: { brokers } })
}

export interface SearchMessageParams {
  brokers: string
  topic: string
  searchValue?: string
  beginTime?: string
  endTime?: string
  limitCount?: number
  timeout?: number
}

export function searchMessage(params: SearchMessageParams): Promise<AxiosResponse<ApiResponse<KafkaMessage[]>>> {
  return request.get('/api/tools/kafka/searchMessage', { params })
}
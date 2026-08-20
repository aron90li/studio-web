/** Kafka 集群 */
export interface KafkaCluster {
  name: string
  brokers: string
}

/** Kafka Topic 信息 */
export interface KafkaTopicInfo {
  name: string
  partitions: number
  replicationInfo: string
}

/** Kafka 消息搜索结果 */
export interface KafkaMessage {
  key: string
  value: string
  partition: number
  offset: number
  timestamp: number
}
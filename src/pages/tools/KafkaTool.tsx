import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Empty, Form, Input, InputNumber, Message, Select, Spin, Table } from '@arco-design/web-react'
import { IconDown, IconRefresh, IconSearch, IconUp } from '@arco-design/web-react/icon'
import { getKafkaClusters, getKafkaTopics, searchMessage } from '../../api/kafkaTool'
import type { KafkaCluster, KafkaMessage, KafkaTopicInfo } from '../../types/kafkaTool'

interface SearchForm {
  cluster?: string
  topic?: string
  searchValue?: string
  beginTime?: string
  endTime?: string
  limitCount?: number
  timeout?: number
}

export default function KafkaTool() {
  const [clusters, setClusters] = useState<KafkaCluster[]>([])
  const [topics, setTopics] = useState<KafkaTopicInfo[]>([])
  const [messages, setMessages] = useState<KafkaMessage[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<string>()
  const [showMore, setShowMore] = useState(false)

  const [form] = Form.useForm<SearchForm>()

  const clustersMap = useMemo(
    () => new Map(clusters.map((item) => [item.name, item])),
    [clusters]
  )

  const fetchClusters = useCallback(async () => {
    setLoadingClusters(true)
    try {
      const res = await getKafkaClusters()
      if (!res.data.success) {
        Message.error(res.data.msg || '获取 Kafka 集群失败')
        return
      }
      const list = res.data.data || []
      setClusters(list)
      if (list.length > 0) {
        setSelectedCluster(list[0].name)
        form.setFieldValue('cluster', list[0].name)
      }
    } catch (error) {
      console.error('获取 Kafka 集群失败:', error)
      Message.error('获取 Kafka 集群失败')
    } finally {
      setLoadingClusters(false)
    }
  }, [form])

  useEffect(() => {
    void fetchClusters()
  }, [fetchClusters])

  useEffect(() => {
    form.setFieldsValue({ limitCount: 1000, timeout: 5 })
  }, [form])

  const fetchTopics = useCallback(async (brokers: string) => {
    setLoadingTopics(true)
    try {
      const res = await getKafkaTopics(brokers)
      if (!res.data.success) {
        Message.error(res.data.msg || '获取 Topic 列表失败')
        return
      }
      setTopics(res.data.data || [])
    } catch (error) {
      console.error('获取 Topic 列表失败:', error)
      Message.error('获取 Topic 列表失败')
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  useEffect(() => {
    const cluster = selectedCluster ? clustersMap.get(selectedCluster) : undefined
    if (cluster?.brokers) {
      void fetchTopics(cluster.brokers)
    } else {
      setTopics([])
    }
  }, [selectedCluster, clustersMap, fetchTopics])

  const columns = useMemo(() => {
    const renderString = (value: unknown) => {
      if (value === null || value === undefined) return ''
      return String(value)
    }
    return [
      {
        title: '时间戳',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 180,
        render: (value: number) => {
          if (!value) return '-'
          return new Date(value).toLocaleString()
        }
      },
      {
        title: 'Key',
        dataIndex: 'key',
        key: 'key',
        render: renderString
      },
      {
        title: '分区',
        dataIndex: 'partition',
        key: 'partition',
        width: 100,
        render: renderString
      },
      {
        title: '偏移量',
        dataIndex: 'offset',
        key: 'offset',
        width: 140,
        render: renderString
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: string) => (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{renderString(value)}</div>
        )
      }
    ]
  }, [])

  const handleSearch = async () => {
    const values = await form.validate()
    const cluster = clustersMap.get(values.cluster || '')
    if (!cluster?.brokers) {
      Message.warning('请选择 Kafka 集群')
      return
    }
    const topic = values.topic?.trim()
    if (!topic) {
      Message.warning('请选择 Topic')
      return
    }

    setSearching(true)
    setSearched(true)
    try {
      const res = await searchMessage({
        brokers: cluster.brokers,
        topic,
        searchValue: values.searchValue?.trim() || undefined,
        beginTime: values.beginTime?.trim() || undefined,
        endTime: values.endTime?.trim() || undefined,
        limitCount: values.limitCount,
        timeout: values.timeout
      })
      if (!res.data.success) {
        Message.error(res.data.msg || '查询 Kafka 消息失败')
        setMessages([])
        return
      }
      setMessages(res.data.data || [])
    } catch (error) {
      console.error('查询 Kafka 消息失败:', error)
      Message.error('查询 Kafka 消息失败')
      setMessages([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 12, boxSizing: 'border-box' }}>
      <Card title="Kafka 消息查询" bordered bodyStyle={{ padding: 16 }}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <Form.Item label="集群" field="cluster" rules={[{ required: true, message: '请选择集群' }]}>
              <Select
                placeholder="请选择集群"
                loading={loadingClusters}
                allowClear
                options={clusters.map((item) => ({ label: item.name, value: item.name }))}
                onChange={(value) => {
                  setSelectedCluster(value as string | undefined)
                  form.setFieldValue('topic', undefined)
                  setTopics([])
                }}
              />
            </Form.Item>
            <Form.Item label="Topic" field="topic" rules={[{ required: true, message: '请选择 Topic' }]}>
              <Select
                placeholder={selectedCluster ? '请选择 Topic' : '请先选择集群'}
                loading={loadingTopics}
                allowClear
                showSearch
                filterOption={(inputValue, option) => {
                  if (!inputValue) return true
                  const label = option.props?.label ?? option.props?.children ?? ''
                  return String(label).toLowerCase().includes(inputValue.toLowerCase())
                }}
                options={topics.map((item) => ({ label: item.name, value: item.name }))}
              />
            </Form.Item>
            <Form.Item label="查询内容" field="searchValue">
              <Input placeholder="按消息内容过滤" />
            </Form.Item>
          </div>

          {showMore && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
              <Form.Item label="条数上限" field="limitCount">
                <InputNumber placeholder="查询条数" min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="超时时间(分钟)" field="timeout">
                <InputNumber placeholder="查询超时时间" min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="开始时间" field="beginTime">
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择开始时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="结束时间" field="endTime">
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择结束时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button
              icon={showMore ? <IconUp /> : <IconDown />}
              onClick={() => setShowMore((prev) => !prev)}
            >
              更多条件
            </Button>
            <Button icon={<IconRefresh />} onClick={() => void fetchClusters()}>刷新集群</Button>
            <Button type="primary" icon={<IconSearch />} loading={searching} onClick={() => void handleSearch()}>查询</Button>
          </div>
        </Form>
      </Card>

      <Card title="查询结果" bordered style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} bodyStyle={{ height: 'calc(100% - 48px)', padding: 0, overflow: 'auto' }}>
        {searching ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : !searched ? (
          <Empty description="请输入查询条件后查询" />
        ) : messages.length === 0 ? (
          <Empty description="暂无查询结果" />
        ) : (
          <Table
            rowKey={(record) => `${record.partition}-${record.offset}`}
            columns={columns}
            data={messages}
            pagination={false}
            borderCell
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>
    </div>
  )
}
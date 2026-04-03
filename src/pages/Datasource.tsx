
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Input, Message, Modal, Space, Table, Tag, Typography
} from '@arco-design/web-react'
import type { TableProps } from '@arco-design/web-react'
import { IconDelete, IconEdit, IconPlus, IconRefresh } from '@arco-design/web-react/icon'
import {
  createDatasource,
  deleteDatasource,
  selectDatasource,
  selectDatasourceType,
  updateDatasource
} from '../api/datasource'
import { DatasourceTypeVO, DatasourceVO } from '../types/datasource'
import DatasourceEditorDrawer, {
  DatasourceEditorSubmitPayload
} from './datasource/DatasourceEditorDrawer'

const { Search } = Input

export default function Datasource() {
  const [datasourceList, setDatasourceList] = useState<DatasourceVO[]>([])
  const [datasourceTypes, setDatasourceTypes] = useState<DatasourceTypeVO[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [typeLoading, setTypeLoading] = useState(false)
  const [drawerSubmitting, setDrawerSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editingDatasource, setEditingDatasource] = useState<DatasourceVO | null>(null)

  const datasourceTypeNameMap = useMemo(() => {
    return new Map(datasourceTypes.map((item) => [item.typeCode, item.typeName || item.typeCode]))
  }, [datasourceTypes])

  const fetchDatasourceList = useCallback(async () => {
    setListLoading(true)
    try {
      const list = await selectDatasource()
      setDatasourceList(list || [])
    } catch (error) {
      console.error('获取数据源列表失败:', error)
      Message.error('获取数据源列表失败')
    } finally {
      setListLoading(false)
    }
  }, [])

  const fetchDatasourceTypes = useCallback(async () => {
    setTypeLoading(true)
    try {
      const list = await selectDatasourceType()
      setDatasourceTypes(list || [])
    } catch (error) {
      console.error('获取数据源类型失败:', error)
      Message.error('获取数据源类型失败')
    } finally {
      setTypeLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDatasourceList()
    fetchDatasourceTypes()
  }, [fetchDatasourceList, fetchDatasourceTypes])

  const ensureDatasourceTypeLoaded = useCallback(
    async (typeCode: string) => {
      if (!typeCode || datasourceTypes.some((item) => item.typeCode === typeCode)) {
        return
      }

      try {
        const result = await selectDatasourceType(typeCode)
        if (!result || result.length === 0) {
          return
        }
        setDatasourceTypes((prev) => {
          const typeCodeSet = new Set(prev.map((item) => item.typeCode))
          const merged = [...prev]
          for (const item of result) {
            if (!typeCodeSet.has(item.typeCode)) {
              merged.push(item)
              typeCodeSet.add(item.typeCode)
            }
          }
          return merged
        })
      } catch (error) {
        console.error('按类型获取数据源定义失败:', error)
      }
    },
    [datasourceTypes]
  )

  const filteredDatasourceList = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) {
      return datasourceList
    }

    return datasourceList.filter((item) => {
      return (
        (item.datasourceName || '').toLowerCase().includes(keyword) ||
        (item.datasourceType || '').toLowerCase().includes(keyword) ||
        (item.datasourceVersion || '').toLowerCase().includes(keyword) ||
        (item.description || '').toLowerCase().includes(keyword)
      )
    })
  }, [datasourceList, searchTerm])

  const openCreateDrawer = () => {
    setDrawerMode('create')
    setEditingDatasource(null)
    setDrawerVisible(true)
  }

  const openEditDrawer = async (record: DatasourceVO) => {
    await ensureDatasourceTypeLoaded(record.datasourceType)
    setDrawerMode('edit')
    setEditingDatasource(record)
    setDrawerVisible(true)
  }

  const handleDeleteDatasource = (record: DatasourceVO) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除数据源 "${record.datasourceName}" 吗？该操作不可恢复。`,
      onOk: async () => {
        try {
          const res = await deleteDatasource({ datasourceId: record.datasourceId })
          if (!res.data.success) {
            Message.error(res.data.msg || '删除数据源失败')
            return
          }
          Message.success('删除数据源成功')
          fetchDatasourceList()
        } catch (error) {
          console.error('删除数据源失败:', error)
          Message.error('删除数据源失败')
        }
      }
    })
  }

  const handleOnTest = async (payload: DatasourceEditorSubmitPayload) => {
    // todo: 实现测试连接的逻辑，调用后端接口进行连接测试
    Message.info('测试连接功能尚未实现')
  }
  // //参数是：(payload: DatasourceEditorSubmitPayload)，从Drawer传过来，里面的linkJson是已经解析好的对象了
  const handleDrawerSubmit = async (payload: DatasourceEditorSubmitPayload) => {
    setDrawerSubmitting(true)
    try {
      if (drawerMode === 'create') {
        const res = await createDatasource({
          datasourceName: payload.datasourceName,
          description: payload.description,
          datasourceType: payload.datasourceType,
          datasourceVersion: payload.datasourceVersion,
          linkJson: payload.linkJson
        })
        if (!res.data.success) {
          Message.error(res.data.msg || '创建数据源失败')
          return
        }
        Message.success('创建数据源成功')
      } else {
        if (!payload.datasourceId) {
          Message.error('缺少数据源 ID, 无法保存')
          return
        }
        const res = await updateDatasource({
          datasourceId: payload.datasourceId,
          datasourceName: payload.datasourceName,
          description: payload.description,
          datasourceType: payload.datasourceType,
          datasourceVersion: payload.datasourceVersion,
          linkJson: payload.linkJson
        })
        if (!res.data.success) {
          Message.error(res.data.msg || '更新数据源失败')
          return
        }
        Message.success('更新数据源成功')
      }

      setDrawerVisible(false)
      setEditingDatasource(null)
      fetchDatasourceList()
    } catch (error) {
      console.error('提交数据源失败:', error)
      Message.error('提交数据源失败')
    } finally {
      setDrawerSubmitting(false)
    }
  }

  const columns: TableProps<DatasourceVO>['columns'] = [
    {
      title: '数据源名称',
      dataIndex: 'datasourceName'
    },
    {
      title: '类型',
      dataIndex: 'datasourceType',
      render: (value: string) => {
        return <Tag color="arcoblue">{datasourceTypeNameMap.get(value) || value}</Tag>
      }
    },
    {
      title: '版本',
      dataIndex: 'datasourceVersion'
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (value: string) => {
        if (!value) {
          return <Typography.Text type="secondary">-</Typography.Text>
        }
        return value
      }
    },
    {
      title: '创建人',
      dataIndex: 'createUsername'
    },
    {
      title: '创建时间',
      dataIndex: 'createTime'
    },
    {
      title: '最近更新人',
      dataIndex: 'updateUsername'
    },
    {
      title: '最近更新时间',
      dataIndex: 'updateTime'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<IconEdit />}
            style={{ color: '#165DFF' }}
            onClick={() => openEditDrawer(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            icon={<IconDelete />}
            style={{ color: '#F53F3F' }}
            onClick={() => handleDeleteDatasource(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            allowClear
            placeholder="搜索名称/类型/版本/描述"
            style={{ width: 320 }}
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <Space>
            <Button
              icon={<IconRefresh />}
              onClick={() => {
                fetchDatasourceList()
                fetchDatasourceTypes()
              }}
            >
              刷新
            </Button>
            <Button type="primary" icon={<IconPlus />} onClick={openCreateDrawer}>
              新建
            </Button>
          </Space>
        </Space>

        <Table
          rowKey="datasourceId"
          loading={listLoading}
          columns={columns}
          data={filteredDatasourceList}
          pagination={{ pageSize: 20 }}
          border={false}
        />
      </Card>

      <DatasourceEditorDrawer
        visible={drawerVisible}
        mode={drawerMode}
        datasourceTypes={datasourceTypes} // 包含所有的类型，Drawer里需要根据editingDatasource.datasourceType来找到对应的schemaJson
        typeLoading={typeLoading}
        submitting={drawerSubmitting}
        initialDatasource={editingDatasource} // 包含linkJson对象，Drawer里直接用editingDatasource.linkJson来渲染表单
        onCancel={() => {
          if (drawerSubmitting) {
            return
          }
          setDrawerVisible(false)
          setEditingDatasource(null)
        }}
        onSubmit={handleDrawerSubmit}  //参数是：(payload: DatasourceEditorSubmitPayload)，从Drawer传过来，里面的linkJson是已经解析好的对象了
        onTest= {handleOnTest}
      />
    </>
  )
}

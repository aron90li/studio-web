import { useEffect, useMemo, useState } from 'react'
import {
  Button, Divider, Drawer, Empty, Form, Input, Message, Select, Space, Spin, Typography
} from '@arco-design/web-react'
import { DatasourceTypeVO, DatasourceVO } from '../../types/datasource'
import DynamicForm, {
  initializeValueBySchema,
  resolveSchemaPackage,
  sanitizeValueBySchema,
  validateSchemaValue
} from './DynamicForm'

// payload 作为 onSubmit 和 onTest 的参数，从 Drawer 传过来，包含了编辑器里所有的字段值，包括 linkJson（已经解析成对象了）
interface DatasourceEditorDrawerProps {
  visible: boolean
  mode: 'create' | 'edit'
  datasourceTypes: DatasourceTypeVO[]
  typeLoading: boolean
  submitting: boolean
  initialDatasource?: DatasourceVO | null  // 包含 linkJson 对象
  onCancel: () => void
  onSubmit: (payload: DatasourceEditorSubmitPayload) => Promise<void>
  onTest: (payload: DatasourceEditorSubmitPayload) => Promise<void>
}

interface EditorBaseFormValues {
  datasourceName: string
  description?: string
  datasourceType: string
  datasourceVersion: string
}

export interface DatasourceEditorSubmitPayload {
  datasourceId?: string
  datasourceName: string
  description: string
  datasourceType: string
  datasourceVersion: string
  linkJson: Record<string, unknown> // 已经解析好的对象, 类似于 { host: 'localhost', port: 3306, username: 'root', password: 'password' }
}

function ensureString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default function DatasourceEditorDrawer({
  visible,
  mode,
  datasourceTypes,
  typeLoading,
  submitting,
  initialDatasource,
  onCancel,
  onSubmit,
  onTest
}: DatasourceEditorDrawerProps) {
  const [form] = Form.useForm<EditorBaseFormValues>()
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('')
  // 类似于 { host: 'localhost', port: 3306, username: 'root', password: 'password' }，
  // 这个对象的结构和字段是由不同的数据源类型的 schema 决定的，所以不能提前定义好类型，只能用 Record<string, unknown>
  const [linkJsonValue, setLinkJsonValue] = useState<Record<string, unknown>>({})

  const datasourceTypeMap = useMemo(() => {
    return new Map(datasourceTypes.map((item) => [item.typeCode, item]))
  }, [datasourceTypes])

  // {typeCode: string, typeName?: string, schemaJson: Object}
  const currentDatasourceType = selectedTypeCode ? datasourceTypeMap.get(selectedTypeCode) : undefined
  // currentSchemaPackage 包含了当前选中数据源类型的 schema 和 uiSchema，用于渲染 DynamicForm
  // 返回 JsonSchema 和 UiSchema 的组合
  const currentSchemaPackage = useMemo(() => {
    return resolveSchemaPackage(currentDatasourceType?.schemaJson)
  }, [currentDatasourceType])


  // 初始化表单状态的函数，编辑和新建都会用到
  // typeCode 是要切换到的数据源类型，sourceLinkJson 是当前数据源的 linkJson（编辑时有，新增时没有），baseValues 是表单里除了 linkJson 以外的基础字段值
  const initializeFormState = (
    typeCode: string,
    sourceLinkJson: Record<string, unknown> | undefined,
    baseValues: EditorBaseFormValues
  ) => {
    setSelectedTypeCode(typeCode)
    form.setFieldsValue(baseValues)

    const targetType = datasourceTypeMap.get(typeCode)

    // resolveSchemaPackage不是“改变数据”，而是“规范化 & 防御性处理输入数据”
    const schemaPackage = resolveSchemaPackage(targetType?.schemaJson)

    // initializeValueBySchema不是为了“改变数据”，按 schema 的规则，清洗 / 初始化 / 兜底一个“安全、可渲染的值”
    // 输入     { host: 'localhost', port: 3306, username: 'root', password: 'password' }
    // 输出  => { host: 'localhost', port: 3306, username: 'root', password: 'password' }
    const initialLinkJson = initializeValueBySchema(schemaPackage.schema, sourceLinkJson)

    setLinkJsonValue(initialLinkJson)
  }

  useEffect(() => {
    if (!visible) {
      return
    }

    if (mode === 'edit' && initialDatasource) {
      const preferredTypeCode = initialDatasource.datasourceType || datasourceTypes[0]?.typeCode || ''

      initializeFormState(
        preferredTypeCode,
        (initialDatasource.linkJson as Record<string, unknown>) || {},
        {
          datasourceName: ensureString(initialDatasource.datasourceName),
          description: ensureString(initialDatasource.description),
          datasourceType: preferredTypeCode,
          datasourceVersion: ensureString(initialDatasource.datasourceVersion)
        }
      )
      return
    }

    const firstTypeCode = datasourceTypes[0]?.typeCode || ''
    initializeFormState(firstTypeCode, {}, {
      datasourceName: '',
      description: '',
      datasourceType: firstTypeCode,
      datasourceVersion: ''
    })
  }, [visible, mode, initialDatasource, datasourceTypes, datasourceTypeMap, form])

  useEffect(() => {
    if (!visible || datasourceTypes.length === 0) {
      return
    }

    if (!selectedTypeCode || !datasourceTypeMap.has(selectedTypeCode)) {
      const fallbackTypeCode =
        (mode === 'edit' && initialDatasource?.datasourceType) || datasourceTypes[0].typeCode
      const targetType = datasourceTypeMap.get(fallbackTypeCode)
      if (!targetType) {
        return
      }

      form.setFieldValue('datasourceType', targetType.typeCode)
      setSelectedTypeCode(targetType.typeCode)

      const sourceLinkJson =
        mode === 'edit' && initialDatasource
          ? ((initialDatasource.linkJson as Record<string, unknown>) || {})
          : {}
      const nextLinkJson = initializeValueBySchema(
        resolveSchemaPackage(targetType.schemaJson).schema,
        sourceLinkJson
      )
      setLinkJsonValue(nextLinkJson)
    }
  }, [visible, datasourceTypes, selectedTypeCode, datasourceTypeMap, mode, initialDatasource, form])

  const handleDatasourceTypeChange = (nextTypeCode: string) => {
    setSelectedTypeCode(nextTypeCode)
    form.setFieldValue('datasourceType', nextTypeCode)

    const targetType = datasourceTypeMap.get(nextTypeCode)
    const targetSchema = resolveSchemaPackage(targetType?.schemaJson).schema
    const sanitizedCurrent = sanitizeValueBySchema(targetSchema, linkJsonValue)
    const nextValue = initializeValueBySchema(targetSchema, sanitizedCurrent)
    setLinkJsonValue(nextValue)
  }

  const handleOk = async () => {
    try {
      const values = await form.validate()
      const currentType = datasourceTypeMap.get(selectedTypeCode || values.datasourceType)
      if (!currentType) {
        Message.warning('请选择数据源类型')
        return
      }

      const schemaPackage = resolveSchemaPackage(currentType.schemaJson)
      const sanitizedLinkJson = sanitizeValueBySchema(schemaPackage.schema, linkJsonValue)
      const errors = validateSchemaValue(schemaPackage.schema, schemaPackage.uiSchema, sanitizedLinkJson)
      if (errors.length > 0) {
        Message.warning(errors[0])
        return
      }

      await onSubmit({
        datasourceId: mode === 'edit' ? initialDatasource?.datasourceId : undefined,
        datasourceName: values.datasourceName.trim(),
        description: ensureString(values.description).trim(),
        datasourceType: currentType.typeCode,
        datasourceVersion: values.datasourceVersion.trim(),
        linkJson: sanitizedLinkJson
      })
    } catch {
      // Arco form validation errors are shown in form items.
    }
  }

  return (
    <Drawer
      title={mode === 'edit' ? '编辑数据源' : '新建数据源'}
      visible={visible}
      placement="right"
      width="50%"
      onCancel={onCancel}
      unmountOnExit
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleOk}>
            {mode === 'edit' ? '保存' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          field="datasourceName"
          label="数据源名称"
          rules={[
            { required: true, message: '请输入数据源名称' },
            { max: 100, message: '长度不能超过 100' }
          ]}
        >
          <Input placeholder="请输入数据源名称" />
        </Form.Item>

        <Form.Item
          field="datasourceType"
          label="数据源类型"
          rules={[{ required: true, message: '请选择数据源类型' }]}
        >
          <Select
            placeholder="请选择数据源类型"
            options={datasourceTypes.map((item) => ({
              label: item.typeName || item.typeCode,
              value: item.typeCode
            }))}
            onChange={(value) => handleDatasourceTypeChange(value as string)}
          />
        </Form.Item>

        <Form.Item
          field="datasourceVersion"
          label="版本"
          rules={[
            { required: true, message: '请输入版本号' },
            { max: 50, message: '长度不能超过 50' }
          ]}
        >
          <Input placeholder="请输入版本号，例如：1.0.0" />
        </Form.Item>

        <Form.Item
          field="description"
          label="描述"
          rules={[{ max: 500, message: '长度不能超过 500' }]}
        >
          <Input.TextArea
            placeholder="请输入描述（可选）"
            autoSize={{ minRows: 1, maxRows: 5 }}
          />
        </Form.Item>
      </Form>

      <Divider style={{ marginTop: 8 }} />
      <Typography.Text
        style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#1D2129' }}
      >
        连接配置
      </Typography.Text>

      {typeLoading ? (
        <div style={{ paddingTop: 8 }}>
          <Spin />
        </div>
      ) : currentDatasourceType ? (
        <DynamicForm
          schema={currentSchemaPackage.schema}
          uiSchema={currentSchemaPackage.uiSchema}
          value={linkJsonValue}
          onChange={setLinkJsonValue}
          disabled={submitting}
        />
      ) : (
        <Empty description="暂无可用数据源类型" />
      )}
    </Drawer>
  )
}

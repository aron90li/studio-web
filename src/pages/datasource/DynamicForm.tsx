import { useState, type ReactNode } from 'react'
import { Form, Input, InputNumber, Select, Switch, Typography } from '@arco-design/web-react'

export interface JsonSchema {
  type?: string
  title?: string
  description?: string
  default?: unknown
  enum?: unknown[]
  const?: unknown
  properties?: Record<string, JsonSchema>
  required?: string[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  items?: JsonSchema
  minimum?: number
  maximum?: number
  [key: string]: unknown
}

export interface UiSchemaNode {
  [key: string]: unknown
  'ui:title'?: string
  'ui:widget'?: string  // input select password textarea
  'ui:placeholder'?: string
  'ui:help'?: string
  'ui:disabled'?: boolean
  'ui:hidden'?: boolean
}

export interface SchemaPackage {
  schema: JsonSchema
  uiSchema: UiSchemaNode
}

interface DynamicFormProps {
  schema: JsonSchema
  uiSchema?: UiSchemaNode
  value: Record<string, unknown>
  onChange: (nextValue: Record<string, unknown>) => void
  disabled?: boolean
}

type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepClone<T>(value: T): T {
  if (value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function getObject(value: unknown): PlainObject {
  return isPlainObject(value) ? value : {}
}

function getValueByPath(source: unknown, path: string[]): unknown {
  let current: unknown = source
  for (const segment of path) {
    if (!isPlainObject(current)) {
      return undefined
    }
    current = current[segment]
  }
  return current
}

function setValueByPath(source: PlainObject, path: string[], nextValue: unknown): PlainObject {
  if (path.length === 0) {
    return isPlainObject(nextValue) ? nextValue : {}
  }

  const [head, ...rest] = path
  const cloned: PlainObject = { ...source }

  if (rest.length === 0) {
    if (nextValue === undefined) {
      delete cloned[head]
    } else {
      cloned[head] = nextValue
    }
    return cloned
  }

  const child = getObject(cloned[head])
  cloned[head] = setValueByPath(child, rest, nextValue)
  return cloned
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true
  }
  if (typeof value === 'string') {
    return value.trim().length === 0
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  return false
}

function toUiSchemaNode(value: unknown): UiSchemaNode {
  return isPlainObject(value) ? (value as UiSchemaNode) : {}
}

function getOptionMatchScore(option: JsonSchema, value: PlainObject): number {
  const properties = option.properties || {}
  let score = 0

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (propertySchema.const === undefined) {
      continue
    }

    const current = value[key]
    if (current === undefined || current === null || current === '') {
      continue
    }

    if (current !== propertySchema.const) {
      return -1
    }

    score += 1
  }

  return score
}

function pickActiveOption(options: JsonSchema[] | undefined, value: PlainObject): JsonSchema | null {
  if (!options || options.length === 0) {
    return null
  }

  let bestOption: JsonSchema | null = null
  let bestScore = -1
  for (const option of options) {
    const score = getOptionMatchScore(option, value)
    if (score > bestScore) {
      bestScore = score
      bestOption = option
    }
  }

  return bestOption
}

function getObjectProperties(schema: JsonSchema, value: PlainObject) {
  const baseProperties = schema.properties || {}
  const activeOption = pickActiveOption(schema.oneOf, value)
  const optionProperties = activeOption?.properties || {}

  const orderedKeys = [
    ...Object.keys(baseProperties),
    ...Object.keys(optionProperties).filter((key) => !(key in baseProperties))
  ]

  return {
    activeOption,
    baseProperties,
    optionProperties,
    orderedKeys
  }
}

function getLabel(schema: JsonSchema, uiSchema: UiSchemaNode, fallback: string): string {
  return (uiSchema['ui:title'] as string) || schema.title || fallback
}

function pathToString(path: string[]): string {
  return path.join('.')
}

function pathToLabel(path: string[]): string {
  return path.join('.')
}

function mergeRequired(schema: JsonSchema, activeOption: JsonSchema | null): Set<string> {
  return new Set([...(schema.required || []), ...(activeOption?.required || [])])
}

function applySchemaToValue(schema: JsonSchema, source: unknown, mode: 'init' | 'sanitize'): unknown {
  if (schema.const !== undefined) {
    return deepClone(schema.const)
  }

  if (schema.type === 'object' || schema.properties || schema.oneOf) {
    const sourceObj = getObject(source)
    const result: PlainObject = {}
    const { activeOption, baseProperties, optionProperties, orderedKeys } = getObjectProperties(schema, sourceObj)

    for (const key of orderedKeys) {
      const childSchema = baseProperties[key] || optionProperties[key]
      const nextValue = applySchemaToValue(childSchema, sourceObj[key], mode)

      if (nextValue !== undefined) {
        result[key] = nextValue
      } else if (mode === 'init' && childSchema.default !== undefined) {
        result[key] = deepClone(childSchema.default)
      }
    }

    if (mode === 'init' && activeOption) {
      const optionRequired = activeOption.required || []
      for (const key of optionRequired) {
        const childSchema = optionProperties[key]
        if (!childSchema) {
          continue
        }
        if (result[key] === undefined && childSchema.default !== undefined) {
          result[key] = deepClone(childSchema.default)
        }
        if (result[key] === undefined && childSchema.const !== undefined) {
          result[key] = deepClone(childSchema.const)
        }
      }
    }

    return result
  }

  if (source !== undefined) {
    return deepClone(source)
  }

  if (schema.default !== undefined) {
    return deepClone(schema.default)
  }

  if (schema.type === 'array') {
    return []
  }

  return undefined
}

function validateNode(
  schema: JsonSchema,
  uiSchema: UiSchemaNode,
  value: unknown,
  path: string[],
  errors: string[]
) {
  if (uiSchema['ui:hidden'] === true) {
    return
  }

  const label = getLabel(schema, uiSchema, path[path.length - 1] || '字段')

  if (schema.type === 'object' || schema.properties || schema.oneOf) {
    const objectValue = getObject(value)
    const { activeOption, baseProperties, optionProperties, orderedKeys } = getObjectProperties(schema, objectValue)
    const requiredSet = mergeRequired(schema, activeOption)

    for (const key of requiredSet) {
      if (isEmptyValue(objectValue[key])) {
        const childSchema = baseProperties[key] || optionProperties[key] || {}
        const childUi = toUiSchemaNode(uiSchema[key])
        const childLabel = getLabel(childSchema, childUi, key)
        errors.push(`${pathToLabel([...path, childLabel])}不能为空`)
      }
    }

    for (const key of orderedKeys) {
      const childSchema = baseProperties[key] || optionProperties[key]
      const childUi = toUiSchemaNode(uiSchema[key])
      if (childSchema.const !== undefined) {
        continue
      }
      if (objectValue[key] === undefined && !requiredSet.has(key)) {
        continue
      }
      validateNode(childSchema, childUi, objectValue[key], [...path, key], errors)
    }

    return
  }

  if (value === undefined || value === null || value === '') {
    return
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`${pathToLabel([...path.slice(0, -1), label])}必须是数字`)
      return
    }
    if (schema.type === 'integer' && !Number.isInteger(value)) {
      errors.push(`${pathToLabel([...path.slice(0, -1), label])}必须是整数`)
      return
    }
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${pathToLabel([...path.slice(0, -1), label])}不能小于 ${schema.minimum}`)
      return
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${pathToLabel([...path.slice(0, -1), label])}不能大于 ${schema.maximum}`)
      return
    }
  }

  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${pathToLabel([...path.slice(0, -1), label])}必须是布尔值`)
    return
  }

  if (schema.enum && schema.enum.length > 0 && !schema.enum.includes(value)) {
    errors.push(`${pathToLabel([...path.slice(0, -1), label])}不在可选范围内`)
  }
}

export function resolveSchemaPackage(rawSchemaJson: unknown): SchemaPackage {
  if (isPlainObject(rawSchemaJson) && (rawSchemaJson.schema || rawSchemaJson.uiSchema)) {
    return {
      schema: (rawSchemaJson.schema as JsonSchema) || { type: 'object', properties: {} },
      uiSchema: toUiSchemaNode(rawSchemaJson.uiSchema)
    }
  }

  return {
    schema: isPlainObject(rawSchemaJson)
      ? (rawSchemaJson as JsonSchema)
      : { type: 'object', properties: {} },
    uiSchema: {}
  }
}

export function initializeValueBySchema(
  schema: JsonSchema,
  sourceValue?: unknown
): Record<string, unknown> {
  const value = applySchemaToValue(schema, sourceValue, 'init')
  return getObject(value)
}

export function sanitizeValueBySchema(
  schema: JsonSchema,
  value: Record<string, unknown>
): Record<string, unknown> {
  const sanitized = applySchemaToValue(schema, value, 'sanitize')
  return getObject(sanitized)
}

export function validateSchemaValue(
  schema: JsonSchema,
  uiSchema: UiSchemaNode | undefined,
  value: Record<string, unknown>
): string[] {
  const errors: string[] = []
  validateNode(schema, uiSchema || {}, value, [], errors)
  return errors
}

export default function DynamicForm({
  schema,
  uiSchema,
  value,
  onChange,
  disabled = false
}: DynamicFormProps) {
  const [arrayDraftMap, setArrayDraftMap] = useState<Record<string, string>>({})

  const rootSchema = schema || { type: 'object', properties: {} }
  const rootUiSchema = uiSchema || {}
  const rootValue = getObject(value)

  const updateByPath = (path: string[], nextValue: unknown) => {
    const next = setValueByPath(rootValue, path, nextValue)
    onChange(next)
  }

  const renderField = (
    fieldSchema: JsonSchema,
    fieldUiSchema: UiSchemaNode,
    path: string[],
    required: boolean,
    level: number
  ): ReactNode => {
    if (fieldUiSchema['ui:hidden'] === true) {
      return null
    }

    if (fieldSchema.const !== undefined) {
      return null
    }

    const pathKey = pathToString(path)
    const fieldValue = getValueByPath(rootValue, path)
    const fieldLabel = getLabel(fieldSchema, fieldUiSchema, path[path.length - 1] || '字段')
    const fieldPlaceholder =
      (fieldUiSchema['ui:placeholder'] as string) || fieldSchema.description || `请输入${fieldLabel}`
    const widget = (fieldUiSchema['ui:widget'] as string) || ''
    const fieldDisabled = disabled || fieldUiSchema['ui:disabled'] === true
    const fieldHelp = (fieldUiSchema['ui:help'] as string) || fieldSchema.description

    if (fieldSchema.type === 'object' || fieldSchema.properties || fieldSchema.oneOf) {
      const objectValue = getObject(fieldValue)
      const { activeOption, baseProperties, optionProperties, orderedKeys } = getObjectProperties(
        fieldSchema,
        objectValue
      )
      const requiredSet = mergeRequired(fieldSchema, activeOption)

      return (
        <div
          key={pathKey || 'root-object'}
          style={
            level > 0
              ? {
                  border: '1px solid #E5E6EB',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 16
                }
              : undefined
          }
        >
          {level > 0 ? (
            <Typography.Text
              style={{
                display: 'block',
                marginBottom: 12,
                fontWeight: 500,
                color: '#1D2129'
              }}
            >
              {fieldLabel}
            </Typography.Text>
          ) : null}

          {orderedKeys.map((key) => {
            const childSchema = baseProperties[key] || optionProperties[key]
            const childUi = toUiSchemaNode(fieldUiSchema[key])
            const childPath = [...path, key]
            const isRequired = requiredSet.has(key)
            return renderField(childSchema, childUi, childPath, isRequired, level + 1)
          })}
        </div>
      )
    }

    const renderControl = () => {
      if (widget === 'select' || (fieldSchema.enum && fieldSchema.enum.length > 0)) {
        const options = (fieldSchema.enum || []).map((item) => ({
          label: String(item),
          value: item as string | number
        }))

        return (
          <Select
            placeholder={fieldPlaceholder}
            value={fieldValue as string | number | undefined}
            onChange={(next) => updateByPath(path, next)}
            options={options}
            disabled={fieldDisabled}
            allowClear
          />
        )
      }

      if (fieldSchema.type === 'boolean') {
        return (
          <Switch
            checked={Boolean(fieldValue)}
            onChange={(next) => updateByPath(path, next)}
            disabled={fieldDisabled}
          />
        )
      }

      if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
        return (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={fieldPlaceholder}
            value={typeof fieldValue === 'number' ? fieldValue : undefined}
            min={typeof fieldSchema.minimum === 'number' ? fieldSchema.minimum : undefined}
            max={typeof fieldSchema.maximum === 'number' ? fieldSchema.maximum : undefined}
            precision={fieldSchema.type === 'integer' ? 0 : undefined}
            onChange={(next) => updateByPath(path, typeof next === 'number' ? next : undefined)}
            disabled={fieldDisabled}
          />
        )
      }

      if (fieldSchema.type === 'array') {
        const currentText = Array.isArray(fieldValue) ? JSON.stringify(fieldValue, null, 2) : '[]'
        const draft = arrayDraftMap[pathKey] === undefined ? currentText : arrayDraftMap[pathKey]

        return (
          <Input.TextArea
            placeholder={'请输入 JSON 数组，例如：["a", "b"]'}
            autoSize={{ minRows: 4, maxRows: 8 }}
            value={draft}
            onChange={(text) => {
              setArrayDraftMap((prev) => ({ ...prev, [pathKey]: text }))
            }}
            onBlur={() => {
              const targetText = arrayDraftMap[pathKey] === undefined ? currentText : arrayDraftMap[pathKey]
              try {
                const parsed = JSON.parse(targetText)
                if (Array.isArray(parsed)) {
                  updateByPath(path, parsed)
                  setArrayDraftMap((prev) => ({ ...prev, [pathKey]: JSON.stringify(parsed, null, 2) }))
                }
              } catch {
                // Keep existing value when input is not valid JSON.
              }
            }}
            disabled={fieldDisabled}
          />
        )
      }

      if (widget === 'password') {
        return (
          <Input.Password
            placeholder={fieldPlaceholder}
            value={(fieldValue as string) || ''}
            onChange={(next) => updateByPath(path, next)}
            disabled={fieldDisabled}
          />
        )
      }

      if (widget === 'textarea') {
        return (
          <Input.TextArea
            placeholder={fieldPlaceholder}
            value={(fieldValue as string) || ''}
            onChange={(next) => updateByPath(path, next)}
            autoSize={{ minRows: 3, maxRows: 6 }}
            disabled={fieldDisabled}
          />
        )
      }

      return (
        <Input
          placeholder={fieldPlaceholder}
          value={typeof fieldValue === 'string' ? fieldValue : ''}
          onChange={(next) => updateByPath(path, next)}
          disabled={fieldDisabled}
        />
      )
    }

    return (
      <Form.Item key={pathKey} label={fieldLabel} required={required} extra={fieldHelp}>
        {renderControl()}
      </Form.Item>
    )
  }

  return <>{renderField(rootSchema, rootUiSchema, [], false, 0)}</>
}

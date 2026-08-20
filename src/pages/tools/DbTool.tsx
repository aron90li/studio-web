import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Empty, Message, Select, Spin, Table, Typography } from '@arco-design/web-react'
import { IconCode, IconPlayArrow, IconRefresh } from '@arco-design/web-react/icon'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import loader from '@monaco-editor/loader'
import { getDbConnections, executeSql as executeSqlApi } from '../../api/dbTool'
import type { DbConnection, MysqlQueryResult } from '../../types/dbTool'

loader.config({ monaco })

const DEFAULT_SQL = 'SELECT * FROM your_table LIMIT 100;'

function getDisplayValue(value: unknown): string {
	if (value === null || value === undefined) return ''
	if (typeof value === 'object') return JSON.stringify(value)
	return String(value)
}

export default function DbTool() {
	const [connections, setConnections] = useState<DbConnection[]>([])
	const [selectedConnection, setSelectedConnection] = useState<string>()
	const [sql, setSql] = useState(DEFAULT_SQL)
	const [result, setResult] = useState<MysqlQueryResult | null>(null)
	const [loadingConnections, setLoadingConnections] = useState(false)
	const [executing, setExecuting] = useState(false)
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

	const fetchConnections = useCallback(async () => {
		setLoadingConnections(true)
		try {
			const response = await getDbConnections()
			if (!response.data.success) {
				Message.error(response.data.msg || '获取数据库连接失败')
				return
			}

			const list = response.data.data || []
			setConnections(list)
			setSelectedConnection((current) =>
				current && list.some((connection) => connection.name === current)
					? current
					: list[0]?.name
			)
		} catch (error) {
			console.error('获取数据库连接失败:', error)
			Message.error('获取数据库连接失败')
		} finally {
			setLoadingConnections(false)
		}
	}, [])

	useEffect(() => {
		void fetchConnections()
	}, [fetchConnections])

	const activeConnection = useMemo(
		() => connections.find((connection) => connection.name === selectedConnection),
		[connections, selectedConnection]
	)

	const columns = useMemo(() => {
		const keys = Array.from(new Set((result?.data || []).flatMap((row) => Object.keys(row))))
		return keys.map((key) => ({
			title: key,
			dataIndex: key,
			key,
			render: (value: unknown) => getDisplayValue(value)
		}))
	}, [result])

	const executeSql = async () => {
		const editor = editorRef.current
		const selection = editor?.getSelection()
		const selectedSql = editor && selection && !selection.isEmpty()
			? editor.getModel()?.getValueInRange(selection)
			: sql
		const trimmedSql = selectedSql?.trim() || ''
		if (!selectedConnection) {
			Message.warning('请选择数据库连接')
			return
		}
		if (!trimmedSql) {
			Message.warning('请输入 SQL')
			return
		}

		setExecuting(true)
		setResult(null)
		try {
			const response = await executeSqlApi({
				connectionName: selectedConnection,
				sql: trimmedSql
			})
			if (!response.data.success) {
				Message.error(response.data.msg || 'SQL 执行失败')
				return
			}

			const queryResult = response.data.data
			setResult(queryResult)
			if (queryResult.error) {
				Message.error(queryResult.error)
			} else {
				Message.success(`执行完成，共 ${queryResult.count || queryResult.affectedRows || 0} 条记录`)
			}
		} catch (error) {
			console.error('执行 SQL 失败:', error)
			Message.error('执行 SQL 失败')
		} finally {
			setExecuting(false)
		}
	}

	return (
		<div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 12, boxSizing: 'border-box' }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<div>
					<Typography.Title heading={5} style={{ margin: 0 }}>数据库查询</Typography.Title>
				</div>
				<Button icon={<IconRefresh />} loading={loadingConnections} onClick={() => void fetchConnections()}>刷新连接</Button>
			</div>

			<div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 12 }}>
				<Card title="数据库连接" bordered style={{ height: '100%', overflow: 'auto' }} bodyStyle={{ padding: 0 }}>
					{loadingConnections && connections.length === 0 ? (
						<div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
					) : connections.length === 0 ? (
						<Empty description="暂无可用连接" />
					) : (
						<Select
							value={selectedConnection}
							onChange={setSelectedConnection}
							placeholder="请选择连接"
							style={{ width: '100%' }}
						>
							{connections.map((connection) => (
								<Select.Option key={connection.name} value={connection.name}>
									{connection.name}
								</Select.Option>
							))}
						</Select>
					)}
					{activeConnection && (
						<div style={{ margin: '16px', paddingTop: 16, borderTop: '1px solid #e5e6eb', color: '#86909c', fontSize: 12, lineHeight: 1.8 }}>
							<div>类型：{activeConnection.driverClassName || 'MySQL'}</div>
							<div style={{ wordBreak: 'break-all' }}>地址：{activeConnection.url || '-'}</div>
							<div>用户：{activeConnection.username || '-'}</div>
						</div>
					)}
				</Card>

				<div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
					<Card
						title="SQL 编辑器"
						bordered
						style={{ flex: '0 0 310px', minHeight: 220 }}
						bodyStyle={{ padding: 0, height: 'calc(100% - 48px)' }}
						extra={<Button type="primary" icon={<IconPlayArrow />} loading={executing} disabled={!selectedConnection} onClick={() => void executeSql()}>执行</Button>}
					>
						<Editor
							height="100%"
							language="sql"
							theme="vs"
							value={sql}
							onMount={(editor) => { editorRef.current = editor }}
							onChange={(value) => setSql(value || '')}
							options={{ minimap: { enabled: false }, automaticLayout: true, fontSize: 14, tabSize: 2, scrollBeyondLastLine: false }}
						/>
					</Card>

					<Card title="执行结果" bordered style={{ flex: 1, minHeight: 180, overflow: 'hidden' }} bodyStyle={{ height: 'calc(100% - 48px)', padding: 12, overflow: 'auto' }}>
						{result?.error ? (
							<Typography.Text type="error" style={{ whiteSpace: 'pre-wrap' }}>{result.error}</Typography.Text>
						) : result && columns.length > 0 ? (
									<div style={{ width: '100%', height: '100%', overflowX: 'auto', overflowY: 'auto' }}>
										<Table
											rowKey={(record) => JSON.stringify(record)}
											columns={columns}
											data={result.data}
											pagination={false}
											borderCell
											style={{ minWidth: Math.max(columns.length * 160, 800) }}
										/>
									</div>
						) : result ? (
							<Empty description={`执行完成，影响 ${result.affectedRows || 0} 行`} />
						) : (
							<Empty description="执行 SQL 后显示结果" />
						)}
					</Card>
				</div>
			</div>
		</div>
	)
}

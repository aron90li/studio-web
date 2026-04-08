import { useEffect, useRef, useState } from 'react';
import { Drawer, Spin, Message, Tag, Tabs, Table, Button, Input, Modal, Space, Select } from '@arco-design/web-react';
import { IconDelete, IconSave } from '@arco-design/web-react/icon';
import type { TableProps } from '@arco-design/web-react';
import { getProjectDetail, createOrUpdateProjectDetail } from '../../api/project';
import type { ProjectDetailVO } from '../../types/project';

import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';
import type { DatasourceVO } from '../../types/datasource';
import { selectDatasource } from '../../api/datasource';

loader.config({ monaco });

interface ProjectDetailPanelProps {
    visible: boolean;
    projectId: string | null;
    projectName: string | null;
    onClose: () => void;
}

type TabKey = 'env_template' | 'alert_tel' | 'alert_yx' | 'datasource';

interface TabData {
    loading: boolean;
    fetched: boolean;
    stringValue: string;
    listValue: string[];
}

const createInitialTabState = (): Record<TabKey, TabData> => ({
    env_template: { loading: false, fetched: false, stringValue: '', listValue: [] },
    alert_tel: { loading: false, fetched: false, stringValue: '', listValue: [] },
    alert_yx: { loading: false, fetched: false, stringValue: '', listValue: [] },
    datasource: { loading: false, fetched: false, stringValue: '', listValue: [] }
});

const typeMap: Record<TabKey, string> = {
    env_template: 'env_template',
    alert_tel: 'alert_tel',
    alert_yx: 'alert_yx',
    datasource: 'datasource'
};

function parseListValue(raw: string): string[] {
    if (!raw) {
        return [];
    }

    try {
        if (raw.startsWith('[')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item)).filter(Boolean);
            }
        }
    } catch {
        // fallthrough
    }

    if (raw.includes(',') || raw.includes(';')) {
        return raw
            .split(/[,;]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [raw];
}

export default function ProjectDetailPanel({ visible, projectId, projectName, onClose }: ProjectDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('env_template');
    const [tabData, setTabData] = useState<Record<TabKey, TabData>>(createInitialTabState());

    const [inputValue, setInputValue] = useState('');
    const [envDirty, setEnvDirty] = useState<boolean>(false);
    const envContentRef = useRef<string>('');

    // 数据源
    const [datasourceList, setDatasourceList] = useState<DatasourceVO[]>([]);
    const [selectedDatasourceId, setSelectedDatasourceId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (visible && projectId) {
            if (!tabData[activeTab].fetched && !tabData[activeTab].loading) {
                fetchTabData(activeTab);
            }
            return;
        }

        if (!visible) {
            setTabData(createInitialTabState());
            setActiveTab('env_template');
            setEnvDirty(false);
            envContentRef.current = '';
            setInputValue('');
            setDatasourceList([]);
            setSelectedDatasourceId(undefined);
        }
    }, [visible, projectId, activeTab]);

    const fetchTabData = async (type: TabKey) => {
        if (!projectId) return;

        setTabData((prev) => ({
            ...prev,
            [type]: { ...prev[type], loading: true, fetched: true }
        }));

        try {
            if (type === 'datasource') {
                try {
                    const allDatasource = await selectDatasource();
                    setDatasourceList(allDatasource || []);
                } catch (error) {
                    console.error('获取数据源列表失败:', error);
                    Message.error('获取数据源列表失败');
                }
            }

            const res = await getProjectDetail(projectId, typeMap[type]);

            if (!res.data.success) {
                Message.error(res.data.msg || '获取详情失败');
                setTabData((prev) => ({ ...prev, [type]: { ...prev[type], loading: false } }));
                return;
            }

            // 返回数组，最多一个值
            const list: ProjectDetailVO[] = res.data.data || [];
            let stringValue = '';
            let listValue: string[] = [];

            if (list.length > 0) {
                stringValue = list[0].detailValue || '';

                if (type === 'env_template') {
                    envContentRef.current = stringValue;
                }

                listValue = parseListValue(stringValue);

                if (type === 'datasource') {
                    listValue = listValue.map((item) => String(item)).filter(Boolean);
                }
            }

            setTabData((prev) => ({
                ...prev,
                [type]: {
                    ...prev[type],
                    loading: false,
                    stringValue,
                    listValue
                }
            }));
        } catch (error) {
            console.error('获取详情异常:', error);
            Message.error('网络异常');
            setTabData((prev) => ({ ...prev, [type]: { ...prev[type], loading: false } }));
        }
    };

    const handleSaveEnv = async () => {
        if (!projectId) return;
        const newContent = envContentRef.current;

        try {
            const res = await createOrUpdateProjectDetail({
                projectId,
                detailType: 'env_template',
                detailValue: newContent
            });

            if (res.data.success) {
                Message.success('保存成功');
                setTabData((prev) => ({
                    ...prev,
                    env_template: {
                        ...prev.env_template,
                        stringValue: newContent
                    }
                }));
                setEnvDirty(false);
            } else {
                Message.error(res.data.msg || '保存失败');
            }
        } catch (error) {
            console.error('保存失败:', error);
            Message.error('保存失败');
        }
    };

    const saveTabData = async (type: TabKey, newList: string[]) => {
        if (!projectId) return;

        const newValue = JSON.stringify(newList);

        try {
            const res = await createOrUpdateProjectDetail({
                projectId,
                detailType: typeMap[type],
                detailValue: newValue
            });

            if (res.data.success) {
                Message.success('保存成功');
                setTabData((prev) => ({
                    ...prev,
                    [type]: {
                        ...prev[type],
                        stringValue: newValue,
                        listValue: newList
                    }
                }));

                if (type === 'datasource') {
                    setSelectedDatasourceId(undefined);
                } else {
                    setInputValue('');
                }
            } else {
                Message.error(res.data.msg || '保存失败');
            }
        } catch (error) {
            console.error('保存失败:', error);
            Message.error('保存失败');
        }
    };

    const handleAddItem = (type: TabKey) => {
        if (!inputValue.trim()) {
            Message.warning('请输入内容');
            return;
        }

        const currentList = tabData[type].listValue;
        const targetValue = inputValue.trim();
        if (currentList.includes(targetValue)) {
            Message.warning('该内容已存在');
            return;
        }

        saveTabData(type, [...currentList, targetValue]);
    };

    const handleDeleteItem = (type: TabKey, index: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除该项吗？',
            onOk: () => {
                const currentList = tabData[type].listValue;
                saveTabData(
                    type,
                    currentList.filter((_, i) => i !== index)
                );
            }
        });
    };

    // 数据源
    const handleAddDatasource = () => {
        if (!selectedDatasourceId) {
            Message.warning('请选择数据源');
            return;
        }

        const currentIds = tabData.datasource.listValue;
        if (currentIds.includes(selectedDatasourceId)) {
            Message.warning('该数据源已存在');
            return;
        }

        saveTabData('datasource', [...currentIds, selectedDatasourceId]);
    };

    const handleDeleteDatasource = (datasourceId: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除该数据源吗？',
            onOk: () => {
                const currentIds = tabData.datasource.listValue;
                saveTabData(
                    'datasource',
                    currentIds.filter((id) => id !== datasourceId)
                );
            }
        });
    };

    const renderStringContent = () => {
        const data = tabData.env_template;
        if (data.loading) return <div style={{ padding: 20 }}><Spin /></div>;

        return (
            <div>
                <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#86909c' }}>
                        {envDirty ? <span style={{ color: '#f53f3f' }}>内容已修改，请保存</span> : '当前为最新版本'}
                    </span>

                    <Button
                        type="primary"
                        size="mini"
                        icon={<IconSave />}
                        onClick={handleSaveEnv}
                        disabled={!envDirty}
                        loading={false}
                    >
                        更新
                    </Button>
                </Space>

                <div style={{ border: '1px solid #eee' }}>
                    <style>
                        {`
              .monaco-editor .find-widget {
                right: 50px !important;
              }
            `}
                    </style>
                    <Editor
                        height="600px"
                        key={projectId}
                        defaultLanguage="sql"
                        theme="light"
                        defaultValue={data.stringValue}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            automaticLayout: true,
                            padding: { top: 3 }
                        }}
                        onChange={(value) => {
                            envContentRef.current = value || '';
                            setEnvDirty(true);
                        }}
                    />
                </div>
            </div>
        );
    };

    const renderListContent = (type: TabKey, title: string, placeholder: string) => {
        const data = tabData[type];
        if (data.loading) return <div style={{ padding: 20 }}><Spin /></div>;

        const columns: TableProps<any>['columns'] = [
            {
                title: '序号',
                dataIndex: 'index',
                width: 60,
                render: (_, __, index) => index + 1
            },
            {
                title,
                dataIndex: 'value',
                render: (val: string) => <Tag color="blue">{val}</Tag>
            },
            {
                title: '操作',
                key: 'action',
                width: 80,
                align: 'center',
                render: (_: any, __: string, index: number) => (
                    <Button
                        type="text"
                        icon={<IconDelete />}
                        style={{ color: '#F53F3F' }}
                        onClick={() => handleDeleteItem(type, index)}
                    >
                        删除
                    </Button>
                )
            }
        ];

        const dataSource: { key: number; value: string; index: number }[] = data.listValue.map((val, idx) => ({
            key: idx,
            value: val,
            index: idx
        }));

        return (
            <div>
                <Space style={{ marginBottom: 16, width: '100%' }}>
                    <Input
                        placeholder={placeholder}
                        value={inputValue}
                        onChange={setInputValue}
                        style={{ width: 300 }}
                        onPressEnter={() => handleAddItem(type)}
                    />
                    <Button type="primary" size="small" onClick={() => handleAddItem(type)}>
                        添加
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    data={dataSource}
                    pagination={{ pageSize: 10 }}
                    border={false}
                    rowKey="key"
                />
            </div>
        );
    };

    const renderDatasourceContent = () => {
        const data = tabData.datasource;
        if (data.loading) return <div style={{ padding: 20 }}><Spin /></div>;

        const datasourceMap = new Map(datasourceList.map((item) => [item.datasourceId, item]));
        const dataSource = data.listValue
            .map((datasourceId) => datasourceMap.get(datasourceId))
            .filter((item): item is DatasourceVO => Boolean(item))
            .map((item) => ({
                key: item.datasourceId,
                datasourceId: item.datasourceId,
                datasourceName: item.datasourceName,
                datasourceType: item.datasourceType
            }));

        const columns: TableProps<any>['columns'] = [
            {
                title: '序号',
                dataIndex: 'index',
                width: 60,
                render: (_, __, index) => index + 1
            },
            {
                title: '数据源名称',
                dataIndex: 'datasourceName'
            },
            {
                title: '数据源类型',
                dataIndex: 'datasourceType',
                render: (value: string) => <Tag color="arcoblue">{value}</Tag>
            },
            {
                title: '操作',
                key: 'action',
                width: 80,
                align: 'center',
                render: (_: any, record: { datasourceId: string }) => (
                    <Button
                        type="text"
                        icon={<IconDelete />}
                        style={{ color: '#F53F3F' }}
                        onClick={() => handleDeleteDatasource(record.datasourceId)}
                    >
                        删除
                    </Button>
                )
            }
        ];

        return (
            <div>
                <Space style={{ marginBottom: 16, width: '100%' }}>
                    <Select
                        placeholder="请选择数据源"
                        value={selectedDatasourceId}
                        style={{ width: 320 }}
                        allowClear
                        showSearch
                        filterOption={(inputValue, option: any) => {
                            const label = (option?.label || option?.props?.children || '').toLowerCase();
                            return label.includes(inputValue.toLowerCase());
                        }}
                        options={datasourceList.map((item) => ({
                            label: item.datasourceName,
                            value: item.datasourceId
                        }))}
                        onChange={(value) => setSelectedDatasourceId(value as string)}
                    />
                    <Button type="primary" size="small" onClick={handleAddDatasource}>
                        添加
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    data={dataSource}
                    pagination={{ pageSize: 10 }}
                    border={false}
                    rowKey="key"
                />
            </div>
        );
    };

    return (
        <Drawer
            title={`项目详情: ${projectName || ''}`}
            visible={visible}
            placement="right"
            width="50%"
            onCancel={onClose}
            footer={null}
            closable
        >
            <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as TabKey)} type="rounded">
                <Tabs.TabPane key="env_template" title="参数模板">
                    {renderStringContent()}
                </Tabs.TabPane>

                <Tabs.TabPane key="alert_tel" title="告警电话">
                    {renderListContent('alert_tel', '电话号码', '请输入手机号')}
                </Tabs.TabPane>

                <Tabs.TabPane key="alert_yx" title="告警邮箱">
                    {renderListContent('alert_yx', '邮箱号', '请输入邮箱')}
                </Tabs.TabPane>

                <Tabs.TabPane key="datasource" title="数据源">
                    {renderDatasourceContent()}
                </Tabs.TabPane>
            </Tabs>
        </Drawer>
    );
}

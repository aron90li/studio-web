import { useEffect, useState, useRef } from 'react';
import {
    Drawer, Descriptions, Spin, Message, Empty, Tag,
    Tabs, Table, Button, Input, Modal, Space
} from '@arco-design/web-react';
import { IconPlus, IconDelete, IconSave, IconUserAdd } from '@arco-design/web-react/icon';
import type { TableProps } from '@arco-design/web-react';
import { getProjectDetail, createOrUpdateProjectDetail } from '../../api/project';
import { ProjectDetailVO } from '../../types/project';

import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';
// 确保配置了 loader，如果主项目已配置可省略
loader.config({ monaco });

interface ProjectDetailPanelProps {
    visible: boolean;
    projectId: string | null;
    projectName: string | null;
    onClose: () => void;
}

// 定义 Tab 类型
type TabKey = 'env_template' | 'alert_tel' | 'alert_yx';

// 定义内部数据结构, 每个tab一个数据
interface TabData {
    loading: boolean;
    fetched: boolean; // 是否已加载过
    stringValue: string; // 用于 SQL 展示的字符串
    listValue: string[]; // 用于电话/邮箱展示的数组
}


export default function ProjectDetailPanel({ visible, projectId, projectName, onClose }: ProjectDetailPanelProps) {
    const initialTabState: Record<TabKey, TabData> = {
        env_template: { loading: false, fetched: false, stringValue: '', listValue: [] },
        alert_tel: { loading: false, fetched: false, stringValue: '', listValue: [] },
        alert_yx: { loading: false, fetched: false, stringValue: '', listValue: [] },
    };

    const typeMap: Record<TabKey, string> = {
        env_template: 'env_template',
        alert_tel: 'alert_tel',
        alert_yx: 'alert_yx'
    };

    const [activeTab, setActiveTab] = useState<TabKey>('env_template');
    const [tabData, setTabData] = useState<Record<TabKey, TabData>>(initialTabState);

    // 用于添加电话/邮箱的输入框状态
    const [inputValue, setInputValue] = useState('');

    const [envDirty, setEnvDirty] = useState<boolean>(false)
    const envContentRef = useRef<string>('');

    // 懒加载逻辑：当 Tab 切换或面板打开时，如果当前 Tab 未加载，则请求
    useEffect(() => {
        if (visible && projectId) {
            if (!tabData[activeTab].fetched && !tabData[activeTab].loading) {
                fetchTabData(activeTab);
            }
        } else {
            // 关闭时重置所有状态（可选，如果希望下次打开重新加载）
            if (!visible) {
                setTabData(initialTabState);
                setActiveTab('env_template');

                setEnvDirty(false); // 关闭时重置 dirty 状态
                envContentRef.current = ''; // 清空 ref
            }
        }
    }, [visible, projectId, activeTab]);

    const fetchTabData = async (type: TabKey) => {
        if (!projectId) return;

        // 更新 loading 状态
        setTabData(prev => ({
            ...prev,
            [type]: { ...prev[type], loading: true, fetched: true }
        }));

        try {
            const res = await getProjectDetail(projectId, typeMap[type]);

            if (res.data.success) {
                const list: ProjectDetailVO[] = res.data.data || [];
                let stringValue = '';
                let listValue: string[] = [];

                if (list.length > 0) {
                    const detailVO = list[0];
                    stringValue = detailVO.detailValue || ''

                    if (type === 'env_template') {
                        envContentRef.current = stringValue;
                    }

                    // 尝试解析为数组 (针对电话和邮箱)
                    try {
                        if (stringValue.startsWith('[')) {
                            listValue = JSON.parse(stringValue);
                        } else if (stringValue.includes(',') || stringValue.includes(';')) {
                            listValue = stringValue.split(/[,;]/).map(s => s.trim()).filter(s => s);
                        } else if (stringValue) {
                            listValue = [stringValue];
                        }
                    } catch (e) {
                        listValue = stringValue ? [stringValue] : [];
                    }
                }

                setTabData(prev => ({
                    ...prev,
                    [type]: {
                        ...prev[type],
                        loading: false,
                        stringValue: stringValue,
                        listValue: listValue
                    }
                }));
            } else {
                Message.error(res.data.msg || '获取详情失败');
                setTabData(prev => ({ ...prev, [type]: { ...prev[type], loading: false } }));
            }
        } catch (err) {
            console.error('获取详情异常:', err);
            Message.error('网络异常');
            setTabData(prev => ({ ...prev, [type]: { ...prev[type], loading: false } }));
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

                // 更新本地状态，使其成为“干净”状态
                setTabData(prev => ({
                    ...prev,
                    env_template: {
                        ...prev.env_template,
                        stringValue: newContent // listValue不更新，因为没有用到                        
                    }
                }));
                setEnvDirty(false); // 重置 dirty 标志
            } else {
                Message.error(res.data.msg || '保存失败');
            }
        } catch (err) {
            console.error('保存失败:', err);
            Message.error('保存失败');
        }
    };

    // 保存单个 Tab 的数据 (添加/删除后调用)
    const saveTabData = async (type: TabKey, newList: string[]) => {
        if (!projectId) return;

        // 将数组转回字符串存储 (JSON 格式)  [134,123]
        const newValue = JSON.stringify(newList);

        try {
            const res = await createOrUpdateProjectDetail({
                projectId,
                detailType: typeMap[type],
                detailValue: newValue
            });

            if (res.data.success) {
                Message.success('保存成功');

                // 更新本地
                setTabData(prev => ({
                    ...prev,
                    [type]: {
                        ...prev[type],
                        stringValue: newValue,
                        listValue: newList
                    }
                }));
                setInputValue('');
            } else {
                Message.error(res.data.msg || '保存失败');
            }
        } catch (err) {
            console.error('保存失败:', err);
            Message.error('保存失败');
        }
    };


    // 1. 渲染 环境参数 Tab
    const renderStringContent = () => {
        const data = tabData.env_template;
        if (data.loading) return <div style={{ padding: 20 }}><Spin /></div>;

        return (
            <div>
                <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#86909c' }}>
                        {envDirty ? <span style={{ color: '#f53f3f' }}>● 内容已修改，请保存</span> : '当前为最新版本'}
                    </span>

                    {/* 更新按钮 */}
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
                < div style={{ border: "1px solid #eee" }}>
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
                        defaultValue={data.stringValue} // 初始值
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            automaticLayout: true,
                            // scrollBeyondLastLine: false,

                            padding: { top: 3 }
                        }}
                        onChange={(value) => {
                            // 只更新 Ref 和 Dirty 状态，不触发复杂的重渲染逻辑
                            envContentRef.current = value || '';
                            setEnvDirty(true);
                        }}
                    />
                </div>
            </div>
        );
    };

    // 2. 渲染列表 Tab (电话/邮箱)
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
                title: title,
                dataIndex: 'value',
                render: (val: string) => <Tag color="blue">{val}</Tag>
            },
            {
                title: '操作',
                key: 'action',
                width: 80,
                align: 'center',
                render: (_: any, record: string, index: number) => (
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

        // 构建表格数据源
        const dataSource: { key: number; value: string; index: number }[] =
            data.listValue.map((val, idx) => ({
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
                    <Button type="primary" size="small" onClick={() => handleAddItem(type)}>添加</Button>
                </Space>


                <Table
                    columns={columns}
                    data={dataSource}
                    pagination={{ pageSize: 5 }}
                    border={false}
                    rowKey="key"
                />
            </div>
        );
    };

    // --- 事件处理 ---
    const handleAddItem = (type: TabKey) => {
        if (!inputValue.trim()) {
            Message.warning('请输入内容');
            return;
        }
        const currentList = tabData[type].listValue;
        if (currentList.includes(inputValue.trim())) {
            Message.warning('该内容已存在');
            return;
        }
        const newList = [...currentList, inputValue.trim()];
        saveTabData(type, newList);
    };

    const handleDeleteItem = (type: TabKey, index: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除该项吗？',
            onOk: () => {
                const currentList = tabData[type].listValue;
                const newList = currentList.filter((_, i) => i !== index);
                saveTabData(type, newList);
            }
        });
    };

    return (
        <Drawer
            title={"项目详情: " + projectName}
            visible={visible}
            placement="right"
            width="50%"
            onCancel={onClose}
            footer={null}
            closable={true}
        >
            <Tabs
                activeTab={activeTab}
                onChange={(key) => setActiveTab(key as TabKey)}
                type="rounded"
            >
                <Tabs.TabPane
                    key="env_template" title="参数模板">
                    {renderStringContent()}
                </Tabs.TabPane>

                <Tabs.TabPane
                    key="alert_tel" title="告警电话">
                    {renderListContent('alert_tel', '电话号码', '请输入手机号码')}
                </Tabs.TabPane>

                <Tabs.TabPane
                    key="alert_yx" title="告警原心">
                    {renderListContent('alert_yx', '原心号', '请输入原心号')}
                </Tabs.TabPane>
            </Tabs>
        </Drawer>
    );
}
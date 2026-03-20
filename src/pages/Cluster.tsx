import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Empty, Input, Message, Modal, Space, Tabs } from '@arco-design/web-react';
import { IconClose, IconDelete, IconPlus, IconSave } from '@arco-design/web-react/icon';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';
import { createCluster, deleteClusters, getCluster, updateCluster } from '../api/cluster';
import { ClusterVO } from '../types/cluster';
// import { configureMonacoYaml } from 'monaco-yaml';

loader.config({ monaco });


// let yamlConfigured = false;
// function initYaml(monacoInstance: typeof monaco) {
//     if (yamlConfigured) return;
//     yamlConfigured = true;

//     configureMonacoYaml(monacoInstance, {
//         enableSchemaRequest: false,
//         schemas: [],
//         validate: false,      
//         hover: false,         
//         completion: false,    
//         format: false,        
//     });
// }

const { TextArea } = Input;

type PanelMode = 'none' | 'create' | 'edit';
type ConfigTabKey = 'defaultConf' | 'podTemplate' | 'kubeconfig';

interface ClusterFormData {
    clusterName: string;
    description: string;
    clusterType: string;
    flinkVersion: string;
    defaultConf: string;
    podTemplate: string;
    kubeconfig: string;
}

const CONFIG_TABS: Array<{ key: ConfigTabKey; title: string }> = [
    { key: 'defaultConf', title: 'Default Config' },
    { key: 'podTemplate', title: 'Pod Template' },
    { key: 'kubeconfig', title: 'Kubeconfig' }
];

const EMPTY_FORM: ClusterFormData = {
    clusterName: '',
    description: '',
    clusterType: '',
    flinkVersion: '',
    defaultConf: '',
    podTemplate: '',
    kubeconfig: ''
};

const FORM_KEYS: Array<keyof ClusterFormData> = [
    'clusterName',
    'description',
    'clusterType',
    'flinkVersion',
    'defaultConf',
    'podTemplate',
    'kubeconfig'
];

function toFormData(cluster?: ClusterVO | null): ClusterFormData {
    if (!cluster) {
        return { ...EMPTY_FORM };
    }

    return {
        clusterName: cluster.clusterName || '',
        description: cluster.description || '',
        clusterType: cluster.clusterType || '',
        flinkVersion: cluster.flinkVersion || '',
        defaultConf: cluster.defaultConf || '',
        podTemplate: cluster.podTemplate || '',
        kubeconfig: cluster.kubeconfig || ''
    };
}

function isSameFormData(left: ClusterFormData | null, right: ClusterFormData | null): boolean {
    if (!left || !right) return false;
    return FORM_KEYS.every((key) => left[key] === right[key]);
}

function renderFieldLabel(label: string, required?: boolean) {
    return (
        <div style={{ marginBottom: 6, color: '#4E5969' }}>
            {required && <span style={{ color: '#F53F3F', marginRight: 4 }}>*</span>}
            {label}
        </div>
    );
}

export default function Cluster() {
    const [clusters, setClusters] = useState<ClusterVO[]>([]);
    const [loading, setLoading] = useState(false);
    const [panelMode, setPanelMode] = useState<PanelMode>('none');
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const [formData, setFormData] = useState<ClusterFormData | null>(null);
    const [savedSnapshot, setSavedSnapshot] = useState<ClusterFormData | null>(null);
    const [activeConfigTab, setActiveConfigTab] = useState<ConfigTabKey>('defaultConf');
    const [saving, setSaving] = useState(false);
    const [editorInstanceKey, setEditorInstanceKey] = useState(1);

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const changeDisposableRef = useRef<monaco.IDisposable | null>(null);
    const modelMapRef = useRef<Partial<Record<ConfigTabKey, monaco.editor.ITextModel>>>({});
    const modelRevisionRef = useRef(0);
    const activeEditorKeyRef = useRef(0);

    const fetchClusters = useCallback(async (): Promise<ClusterVO[]> => {
        try {
            setLoading(true);
            const res = await getCluster();
            if (!res.data.success) {
                Message.error(res.data.msg || '获取集群列表失败');
                return [];
            }
            const list = res.data.data || [];
            setClusters(list);
            return list;
        } catch (err) {
            console.error('获取集群列表失败:', err);
            Message.error('获取集群列表失败');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const selectedCluster = useMemo(() => {
        if (!selectedClusterId) return null;
        return clusters.find((item) => item.clusterId === selectedClusterId) || null;
    }, [clusters, selectedClusterId]);

    const hasUnsavedChanges = useMemo(() => {
        if (!formData || !savedSnapshot) return false;
        return !isSameFormData(formData, savedSnapshot);
    }, [formData, savedSnapshot]);

    const tabDirty = useMemo<Record<ConfigTabKey, boolean>>(() => {
        if (!formData || !savedSnapshot) {
            return {
                defaultConf: false,
                podTemplate: false,
                kubeconfig: false
            };
        }
        return {
            defaultConf: formData.defaultConf !== savedSnapshot.defaultConf,
            podTemplate: formData.podTemplate !== savedSnapshot.podTemplate,
            kubeconfig: formData.kubeconfig !== savedSnapshot.kubeconfig
        };
    }, [formData, savedSnapshot]);

    const disposeModelGroup = useCallback((models: Partial<Record<ConfigTabKey, monaco.editor.ITextModel>>) => {
        Object.values(models).forEach((m) => {
            if (m && !m.isDisposed()) {
                m.dispose();
            }
        });
    }, []);

    const cleanupCurrentEditorSession = useCallback(() => {
        changeDisposableRef.current?.dispose();
        changeDisposableRef.current = null;

        const currentEditor = editorRef.current;
        editorRef.current = null;
        if (currentEditor) {
            try {
                currentEditor.setModel(null);
            } catch {
                // ignore
            }
            try {
                currentEditor.dispose();
            } catch {
                // ignore
            }
        }

        disposeModelGroup(modelMapRef.current);
        modelMapRef.current = {};
        activeEditorKeyRef.current = 0;
    }, [disposeModelGroup]);

    const startNewEditorSession = useCallback((focusTab: ConfigTabKey) => {
        cleanupCurrentEditorSession();
        setActiveConfigTab(focusTab);
        setEditorInstanceKey((prev) => prev + 1);
    }, [cleanupCurrentEditorSession]);

    const syncModelValues = useCallback((data: ClusterFormData) => {
        CONFIG_TABS.forEach((tab) => {
            const model = modelMapRef.current[tab.key];
            if (model && !model.isDisposed() && model.getValue() !== data[tab.key]) {
                model.setValue(data[tab.key]);
            }
        });
    }, []);

    const openClusterForEdit = useCallback(
        (cluster: ClusterVO) => {
            const next = toFormData(cluster);
            setPanelMode('edit');
            setSelectedClusterId(cluster.clusterId);
            setFormData(next);
            setSavedSnapshot(next);
            startNewEditorSession('defaultConf');
        },
        [startNewEditorSession]
    );

    const openCreatePanel = useCallback(() => {
        const next = toFormData(null);
        setPanelMode('create');
        setSelectedClusterId(null);
        setFormData(next);
        setSavedSnapshot(next);
        startNewEditorSession('defaultConf');
    }, [startNewEditorSession]);

    const openEmptyPanel = useCallback(() => {
        cleanupCurrentEditorSession();
        setPanelMode('none');
        setSelectedClusterId(null);
        setFormData(null);
        setSavedSnapshot(null);
    }, [cleanupCurrentEditorSession]);

    // useEffect(() => {
    //     loader.init().then(initYaml);
    // }, []);

    useEffect(() => {
        fetchClusters();
    }, [fetchClusters]);

    const runWithUnsavedCheck = useCallback(
        (action: () => void) => {
            if (!hasUnsavedChanges) {
                action();
                return;
            }
            Modal.confirm({
                title: '存在未保存修改',
                content: '当前内容尚未保存，继续操作会丢失已修改内容。确认继续吗？',
                okText: '继续',
                cancelText: '取消',
                onOk: action
            });
        },
        [hasUnsavedChanges]
    );

    const handleFieldChange = <K extends keyof ClusterFormData>(key: K, value: ClusterFormData[K]) => {
        setFormData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [key]: value
            };
        });
    };

    const handleSave = async () => {
        if (!formData) return;

        const clusterName = formData.clusterName.trim();
        const clusterType = formData.clusterType.trim();
        const flinkVersion = formData.flinkVersion.trim();

        if (!clusterName) {
            Message.warning('请输入集群名称');
            return;
        }
        if (!clusterType) {
            Message.warning('请输入集群类型');
            return;
        }
        if (!flinkVersion) {
            Message.warning('请输入 Flink 版本');
            return;
        }

        const payload: ClusterFormData = {
            clusterName,
            description: formData.description || '',
            clusterType,
            flinkVersion,
            defaultConf: formData.defaultConf || '',
            podTemplate: formData.podTemplate || '',
            kubeconfig: formData.kubeconfig || ''
        };

        try {
            setSaving(true);
            if (panelMode === 'create') {
                const res = await createCluster(payload);
                if (!res.data.success) {
                    Message.error(res.data.msg || '创建集群失败');
                    return;
                }
                Message.success('创建集群成功');
                const latestList = await fetchClusters();
                const createdId = (res.data.data as Partial<ClusterVO> | undefined)?.clusterId;
                const created =
                    latestList.find((item) => item.clusterId === createdId) ||
                    latestList.find((item) => item.clusterName === payload.clusterName);
                if (created) {
                    const latestData = toFormData(created);
                    setPanelMode('edit');
                    setSelectedClusterId(created.clusterId);
                    setFormData(latestData);
                    setSavedSnapshot(latestData);
                    syncModelValues(latestData);
                } else {
                    setFormData(payload);
                    setSavedSnapshot(payload);
                    syncModelValues(payload);
                }
                return;
            }

            if (panelMode === 'edit' && selectedClusterId) {
                const res = await updateCluster({
                    clusterId: selectedClusterId,
                    ...payload
                });
                if (!res.data.success) {
                    Message.error(res.data.msg || '更新集群失败');
                    return;
                }
                Message.success('保存成功，当前为最新');
                const latestList = await fetchClusters();
                const latest = latestList.find((item) => item.clusterId === selectedClusterId);
                if (latest) {
                    const latestData = toFormData(latest);
                    setFormData(latestData);
                    setSavedSnapshot(latestData);
                    syncModelValues(latestData);
                } else {
                    openEmptyPanel();
                }
            }
        } catch (err) {
            console.error('保存集群失败:', err);
            Message.error('保存集群失败');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (panelMode !== 'edit' || !selectedClusterId || !selectedCluster?.clusterName) return;
        Modal.confirm({
            title: '确认删除',
            content: `确认删除集群 "${selectedCluster.clusterName}" 吗？此操作不可恢复。`,
            okButtonProps: { status: 'danger' },
            onOk: async () => {
                try {
                    const res = await deleteClusters({ clusterIds: [selectedClusterId] as any });
                    if (!res.data.success) {
                        Message.error(res.data.msg || '删除集群失败');
                        return;
                    }
                    Message.success('删除集群成功');
                    openEmptyPanel();
                    await fetchClusters();
                } catch (err) {
                    console.error('删除集群失败:', err);
                    Message.error('删除集群失败');
                }
            }
        });
    };

    const handleEditorMount = useCallback(
        (editor: monaco.editor.IStandaloneCodeEditor) => {
            editorRef.current = editor;
            activeEditorKeyRef.current = editorInstanceKey;

            modelRevisionRef.current += 1;
            const revision = modelRevisionRef.current;
            const currentData = formData || EMPTY_FORM;
            const modelsForThisEditor: Partial<Record<ConfigTabKey, monaco.editor.ITextModel>> = {};
            CONFIG_TABS.forEach((tab) => {
                const uri = monaco.Uri.parse(`cluster://config/${revision}/${editorInstanceKey}/${tab.key}.yaml`);
                modelsForThisEditor[tab.key] = monaco.editor.createModel(currentData[tab.key], 'yaml', uri);
            });
            modelMapRef.current = modelsForThisEditor;

            changeDisposableRef.current?.dispose();
            const contentChangeDisposable = editor.onDidChangeModelContent(() => {
                const currentModel = editor.getModel();
                if (!currentModel) return;

                let targetKey: ConfigTabKey | null = null;
                CONFIG_TABS.forEach((tab) => {
                    if (modelsForThisEditor[tab.key] === currentModel) {
                        targetKey = tab.key;
                    }
                });
                if (!targetKey) return;

                const value = currentModel.getValue();
                setFormData((prev) => {
                    if (!prev || prev[targetKey as ConfigTabKey] === value) return prev;
                    return {
                        ...prev,
                        [targetKey as ConfigTabKey]: value
                    };
                });
            });
            changeDisposableRef.current = contentChangeDisposable;

            editor.onDidDispose(() => {
                if (changeDisposableRef.current === contentChangeDisposable) {
                    changeDisposableRef.current = null;
                }
                contentChangeDisposable.dispose();

                disposeModelGroup(modelsForThisEditor);

                if (activeEditorKeyRef.current === editorInstanceKey) {
                    modelMapRef.current = {};
                    editorRef.current = null;
                }
            });

            editor.setModel(modelsForThisEditor[activeConfigTab] || modelsForThisEditor.defaultConf || null);
        },
        [activeConfigTab, disposeModelGroup, editorInstanceKey, formData]
    );

    useEffect(() => {
        const targetModel = modelMapRef.current[activeConfigTab];
        if (
            editorRef.current &&
            targetModel &&
            !targetModel.isDisposed() &&
            editorRef.current.getModel() !== targetModel
        ) {
            try {
                editorRef.current.setModel(targetModel);
            } catch {
                // ignore
            }
        }
    }, [activeConfigTab]);

    useEffect(() => {
        return () => {
            cleanupCurrentEditorSession();
        };
    }, [cleanupCurrentEditorSession]);

    const renderRightContent = () => {
        if (panelMode === 'none' || !formData) {
            return (
                <Card style={{
                    height: '100%', borderRadius: 8,
                    background: '#F7F8FA'
                }}
                    bodyStyle={{
                        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#F7F8FA'
                    }}>
                    <Empty description="请选择集群或者新建集群" />
                </Card>
            );
        }

        return (
            <div
                style={{
                    height: '100%',
                    border: '1px solid #E5E6EB',
                    borderRadius: 8,
                    background: '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minHeight: 0
                }}
            >
                <div
                    style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F2F3F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                    }}
                >
                    <div style={{ fontWeight: 600 }}>
                        {panelMode === 'create' ? '新建集群' : `集群详情：${selectedCluster?.clusterName || ''}`}
                    </div>
                    <Space size={8}>
                        <span style={{ color: hasUnsavedChanges ? '#F53F3F' : '#00B42A', fontSize: 12 }}>
                            {hasUnsavedChanges ? '存在未保存修改' : '当前为最新'}
                        </span>
                        <Button
                            type="primary"
                            icon={<IconSave />}
                            onClick={handleSave}
                            loading={saving}
                            disabled={!hasUnsavedChanges}
                        >
                            保存
                        </Button>
                        {panelMode === 'edit' && (
                            <Button status="danger" icon={<IconDelete />} onClick={handleDelete}>
                                删除
                            </Button>
                        )}
                        <Button
                            icon={<IconClose />}
                            onClick={() => runWithUnsavedCheck(() => openEmptyPanel())}
                        >
                            关闭
                        </Button>
                    </Space>
                </div>

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'grid',
                        gridTemplateColumns: '360px minmax(0, 1fr)',
                        gap: 16,
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            border: '1px solid #F2F3F5',
                            borderRadius: 8,
                            padding: 12,
                            overflowY: 'auto',
                            minHeight: 0
                        }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            {renderFieldLabel('集群名称', true)}
                            <Input
                                value={formData.clusterName}
                                placeholder="请输入集群名称"
                                onChange={(value) => handleFieldChange('clusterName', value)}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            {renderFieldLabel('集群类型', true)}
                            <Input
                                value={formData.clusterType}
                                placeholder="例如：Kubernetes / Yarn / Standalone"
                                onChange={(value) => handleFieldChange('clusterType', value)}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            {renderFieldLabel('Flink 版本', true)}
                            <Input
                                value={formData.flinkVersion}
                                placeholder="例如：2.2.0"
                                onChange={(value) => handleFieldChange('flinkVersion', value)}
                            />
                        </div>
                        <div>
                            {renderFieldLabel('描述')}
                            <TextArea
                                value={formData.description}
                                autoSize={{ minRows: 6, maxRows: 10 }}
                                placeholder="请输入集群描述"
                                onChange={(value) => handleFieldChange('description', value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <Tabs activeTab={activeConfigTab} onChange={(key) => setActiveConfigTab(key as ConfigTabKey)}>
                            {CONFIG_TABS.map((tab) => (
                                <Tabs.TabPane
                                    key={tab.key}
                                    title={
                                        <Space size={6}>
                                            <span>{tab.title}</span>
                                            {tabDirty[tab.key] && (
                                                <span
                                                    style={{
                                                        width: 7,
                                                        height: 7,
                                                        borderRadius: '50%',
                                                        background: '#F53F3F',
                                                        display: 'inline-block'
                                                    }}
                                                />
                                            )}
                                        </Space>
                                    }
                                />
                            ))}
                        </Tabs>
                        <div
                            className="cluster-editor"
                            style={{
                                flex: 1,
                                minHeight: 0,
                                border: '1px solid #E5E6EB',
                                borderRadius: 8,
                                // overflow: 'hidden'
                            }}
                        >
                            <style>
                                {`
                                .cluster-editor .monaco-editor .find-widget {
                                    left: 30px !important;
                                    // z-index: 999999 !important;
                                } 
                            `}
                            </style>

                            <Editor
                                key={editorInstanceKey}
                                height="100%"
                                theme="light"
                                // defaultLanguage="yaml"
                                language="yaml"
                                onMount={handleEditorMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    automaticLayout: true,
                                    scrollBeyondLastLine: false,
                                    padding: { top: 8, bottom: 8 }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                height: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '300px minmax(0, 1fr)',
                gap: 4,
                minHeight: 0
            }}
        >
            <Card
                style={{ height: '100%', overflow: 'hidden', borderRadius: 8 }}
                bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', 
                    height: '100%', overflow: 'hidden' }}
            >
                <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>集群列表</span>
                    <Button
                        type="primary"
                        size="small"
                        icon={<IconPlus />}
                        onClick={() => runWithUnsavedCheck(() => openCreatePanel())}
                    >
                        新建集群
                    </Button>
                </Space>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, minHeight: 0 }}>
                    {loading ? (
                        <div style={{ color: '#86909C' }}>加载中...</div>
                    ) : clusters.length === 0 ? (
                        <Empty description="暂无集群" />
                    ) : (
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            {clusters.map((cluster) => {
                                const active = panelMode === 'edit' && selectedClusterId === cluster.clusterId;
                                return (
                                    <div
                                        key={cluster.clusterId}
                                        onClick={() => runWithUnsavedCheck(() => openClusterForEdit(cluster))}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Card
                                            size="small"
                                            hoverable
                                            style={{
                                                border: active ? '1px solid #165DFF' : '1px solid #E5E6EB',
                                                background: active ? '#F2F3FF' : '#FFFFFF'
                                            }}                                            
                                        >
                                            <div
                                                style={{
                                                    fontWeight: active ? 600 : 500,
                                                    color: active ? '#165DFF' : '#1D2129',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {cluster.clusterName || '-'}
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })}
                        </Space>
                    )}
                </div>
            </Card>

            {renderRightContent()}
        </div>
    );
}

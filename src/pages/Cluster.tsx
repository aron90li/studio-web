import { Card, Table, Button, Input, Space, Modal, Form, Message, Tag, Tooltip } from '@arco-design/web-react';
import type { TableProps } from '@arco-design/web-react';
import { IconEdit, IconDelete, IconPlus } from '@arco-design/web-react/icon';
import '@arco-design/web-react/dist/css/arco.css';
import { useEffect, useState } from 'react';
import { createCluster, deleteClusters, getCluster, updateCluster } from '../api/cluster';
import { ClusterVO } from '../types/cluster';

const { Search, TextArea } = Input;

export default function Cluster() {
    const [clusters, setClusters] = useState<ClusterVO[]>([]);
    const [filteredClusters, setFilteredClusters] = useState<ClusterVO[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCluster, setEditingCluster] = useState<ClusterVO | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();

    const fetchClusters = async () => {
        try {
            setLoading(true);
            const res = await getCluster();
            if (!res.data.success) {
                Message.error(res.data.msg || '获取集群列表失败');
                return;
            }
            setClusters(res.data.data || []);
        } catch (err) {
            console.error('获取集群列表失败:', err);
            Message.error('获取集群列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClusters();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredClusters(clusters);
            return;
        }
        const keyword = searchTerm.toLowerCase();
        const filtered = clusters.filter((c) => {
            return (
                c.clusterName?.toLowerCase().includes(keyword) ||
                c.clusterType?.toLowerCase().includes(keyword) ||
                c.flinkVersion?.toLowerCase().includes(keyword) ||
                c.createUsername?.toLowerCase().includes(keyword)
            );
        });
        setFilteredClusters(filtered);
    }, [clusters, searchTerm]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
    };

    const handleCreate = async () => {
        try {
            const values = await form.validate();
            const res = await createCluster({
                clusterName: values.clusterName,
                description: values.description || '',
                clusterType: values.clusterType,
                flinkVersion: values.flinkVersion,
                defaultConf: values.defaultConf || '',
                podTemplate: values.podTemplate || '',
                kubeconfig: values.kubeconfig || ''
            });

            if (!res.data.success) {
                Message.error(res.data.msg || '创建集群失败');
                return;
            }

            Message.success('创建集群成功');
            setModalVisible(false);
            form.resetFields();
            fetchClusters();
        } catch (err) {
            console.error('创建集群失败:', err);
        }
    };

    const handleEdit = async () => {
        try {
            const values = await form.validate();
            if (!editingCluster) return;

            const noChange =
                values.clusterName === editingCluster.clusterName &&
                values.description === editingCluster.description &&
                values.clusterType === editingCluster.clusterType &&
                values.flinkVersion === editingCluster.flinkVersion &&
                values.defaultConf === editingCluster.defaultConf &&
                values.podTemplate === editingCluster.podTemplate &&
                values.kubeconfig === editingCluster.kubeconfig;

            if (noChange) {
                Message.info('集群信息未发生变化');
                return;
            }

            const res = await updateCluster({
                clusterId: editingCluster.clusterId,
                clusterName: values.clusterName,
                description: values.description || '',
                clusterType: values.clusterType,
                flinkVersion: values.flinkVersion,
                defaultConf: values.defaultConf || '',
                podTemplate: values.podTemplate || '',
                kubeconfig: values.kubeconfig || ''
            });

            if (!res.data.success) {
                Message.error(res.data.msg || '更新集群失败');
                return;
            }

            Message.success('更新集群成功');
            setModalVisible(false);
            setEditingCluster(null);
            form.resetFields();
            fetchClusters();
        } catch (err) {
            console.error('更新集群失败:', err);
        }
    };

    const handleDelete = (record: ClusterVO) => {
        Modal.confirm({
            title: '确认删除',
            content: `确认要删除集群 "${record.clusterName}" 吗？此操作不可恢复。`,
            okButtonProps: { status: 'danger' },
            onOk: async () => {
                const res = await deleteClusters({ clusterIds: [record.clusterId] as any });
                if (res.data.success) {
                    Message.success('删除集群成功');
                    fetchClusters();
                } else {
                    Message.error(res.data.msg || '删除集群失败');
                }
            }
        });
    };

    const columns: TableProps<ClusterVO>['columns'] = [
        {
            title: '集群名称',
            dataIndex: 'clusterName'
        },
        {
            title: '类型',
            dataIndex: 'clusterType',
            render: (value: string) => value ? <Tag color="blue">{value}</Tag> : '-'
        },
        {
            title: 'Flink 版本',
            dataIndex: 'flinkVersion'
        },
        {
            title: '描述',
            dataIndex: 'description',
            render: (value: string) => {
                if (!value) return '-';
                return (
                    <Tooltip content={value}>
                        <span style={{ display: 'inline-block', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {value}
                        </span>
                    </Tooltip>
                );
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
            title: '更新人',
            dataIndex: 'updateUsername'
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime'
        },
        {
            title: '操作',
            key: 'action',
            width: 140,
            align: 'center' as const,
            render: (_: any, record: ClusterVO) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<IconEdit />}
                        onClick={() => {
                            setEditingCluster(record);
                            form.setFieldsValue({
                                clusterName: record.clusterName,
                                description: record.description,
                                clusterType: record.clusterType,
                                flinkVersion: record.flinkVersion,
                                defaultConf: record.defaultConf,
                                podTemplate: record.podTemplate,
                                kubeconfig: record.kubeconfig
                            });
                            setModalVisible(true);
                        }}
                        style={{ color: '#165DFF' }}
                    >
                        编辑
                    </Button>
                    <Button
                        type="text"
                        icon={<IconDelete />}
                        onClick={() => handleDelete(record)}
                        style={{ color: '#F53F3F' }}
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <>
            <Card>
                <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                    <Search
                        placeholder="搜索集群名称 / 类型 / 版本 / 创建人"
                        allowClear
                        style={{ width: 300 }}
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    <Button
                        type="primary"
                        icon={<IconPlus />}
                        onClick={() => {
                            setEditingCluster(null);
                            form.resetFields();
                            setModalVisible(true);
                        }}
                    >
                        新建集群
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    data={filteredClusters}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    border={false}
                    rowKey="clusterId"
                />
            </Card>

            <Modal
                title={editingCluster ? '编辑集群' : '新建集群'}
                visible={modalVisible}
                onOk={editingCluster ? handleEdit : handleCreate}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingCluster(null);
                    form.resetFields();
                }}
                style={{ width: 960 }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="集群名称"
                        field="clusterName"
                        rules={[{ required: true, message: '请输入集群名称' }]}
                    >
                        <Input placeholder="集群名称" />
                    </Form.Item>

                    <Form.Item
                        label="集群类型"
                        field="clusterType"
                        rules={[{ required: true, message: '请输入集群类型' }]}
                    >
                        <Input placeholder="例如：Kubernetes / Yarn / Standalone" />
                    </Form.Item>

                    <Form.Item
                        label="Flink 版本"
                        field="flinkVersion"
                        rules={[{ required: true, message: '请输入 Flink 版本' }]}
                    >
                        <Input placeholder="例如：2.2.0" />
                    </Form.Item>

                    <Form.Item label="描述" field="description">
                        <Input placeholder="集群描述" />
                    </Form.Item>

                    <Form.Item label="默认配置" field="defaultConf">
                        <TextArea autoSize={{ minRows: 3, maxRows: 20 }} placeholder="默认配置内容" />
                    </Form.Item>

                    <Form.Item label="Pod 模板" field="podTemplate">
                        <TextArea autoSize={{ minRows: 3, maxRows: 20 }} placeholder="K8s Pod 模板内容" />
                    </Form.Item>

                    <Form.Item label="Kubeconfig" field="kubeconfig">
                        <TextArea autoSize={{ minRows: 3, maxRows: 20 }} placeholder="Kubeconfig 内容" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

import { Card, Table, Button, Input, Space, Modal, Form, Message, Layout, Select, SelectProps } from '@arco-design/web-react';
import type { TableProps } from '@arco-design/web-react';
import { IconEdit, IconDelete, IconUser, IconPlus, IconBook } from '@arco-design/web-react/icon';
import '@arco-design/web-react/dist/css/arco.css';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createProject, deleteProjects, getProjectUsers, updateProject, deleteProjectUser, grantProjectToUser,
    getProjectDetail, createOrUpdateProjectDetail
} from '../api/project';
import { ProjectVO } from '../types/project';
import { useProjects } from '../context/useProjects';
import { useUser } from '../context/useUser';
import { UserVO } from '../types/user';
import { getAllUsers } from '../api/user';
import ProjectDetailPanel from './project/ProjectDetailPanel';

const { Search } = Input;

export default function Projects() {
    const { projects, loading, fetchProjects } = useProjects();
    const [filteredProjects, setFilteredProjects] = useState<ProjectVO[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [editingProject, setEditingProject] = useState<ProjectVO | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useUser();
    const isAdmin = user?.role === 'ROLE_ADMIN' ? true : false;

    //////////////////////////////////////////////////////////////////////////////////////////////
    // 用户管理使用的变量
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [editingProjectUsers, setEditingProjectUsers] = useState<UserVO[]>([]);
    const [allUsers, setAllUsers] = useState<UserVO[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>('');

    // 项目详情使用
    const [detailPanelVisible, setDetailPanelVisible] = useState(false);
    const [currentDetailProjectId, setCurrentDetailProjectId] = useState<string | null>(null);
    const [currentDetailProjectName, setCurrentDetailProjectName] = useState<string | null>(null);

    // 分页使用 todo
    const [projectPageCurrent, setProjectPageCurrent] = useState(1);
    const [projectPageSize, setProjectPageSize] = useState(10);

    const userColumns: TableProps<UserVO>['columns'] = [
        {
            title: '用户名',
            dataIndex: 'username'
        },
        {
            title: '操作',
            key: 'action',
            align: 'center' as const,
            render: (_: any, record: UserVO) => (
                <Space size="small">
                    <Button disabled={record.role === 'ROLE_ADMIN'}
                        type="text"
                        icon={<IconDelete />}
                        onClick={async () => {
                            try {
                                if (!editingProject) {
                                    Message.warning('项目信息异常，无法移除成员');
                                    return
                                }
                                const delRes = await deleteProjectUser({
                                    projectId: editingProject.projectId,
                                    userId: record.userId
                                })
                                if (!delRes.data.success) {
                                    Message.error(delRes.data.msg || '移除成员失败')
                                    return // 不再操作后面
                                }

                                Message.success('移除成员成功');
                                // 刷新成员列表
                                const res = await getProjectUsers(editingProject.projectId);
                                if (!res.data.success) {
                                    Message.error(res.data.msg || '获取项目用户失败');
                                    return;
                                }
                                setEditingProjectUsers(res.data.data);
                            } catch (err) {
                                console.error('移除成员失败:', err);
                                Message.error('移除成员失败');
                            }
                        }}
                        style={{ color: '#F53F3F' }} // 危险色（红色），符合大厂交互规范
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    //////////////////////////////////////////////////////////////////////////////////////////////
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        setFilteredProjects(projects);
    }, [projects]);

    // 分页使用
    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
        if (projectPageCurrent > maxPage) {
            setProjectPageCurrent(maxPage);
        }
    }, [filteredProjects.length, projectPageCurrent, projectPageSize]);

    // 搜索逻辑：前端过滤
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setProjectPageCurrent(1);
        if (!value) {
            setFilteredProjects(projects);
            return;
        }
        const filtered = projects.filter(
            (p) =>
                p.projectName.toLowerCase().includes(value.toLowerCase()) ||
                p.projectIdentity.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProjects(filtered);
    };

    // 监听回车
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch(searchTerm);
        }
    };

    const columns: TableProps<ProjectVO>['columns'] = [
        {
            title: '项目名称',
            dataIndex: 'projectName',
            render: (name: string, record: ProjectVO) => (
                <Button type="text" style={{ color: '#165DFF', padding: 0 }}
                    onClick={() => navigate(`/stream/studio/${record.projectId}`)}
                >
                    {name}
                </Button>
            )
        },
        { title: '项目标识', dataIndex: 'projectIdentity' },
        { title: '创建人', dataIndex: 'createUsername' },
        { title: '创建时间', dataIndex: 'createTime' },
        { title: '最近操作人', dataIndex: 'updateUsername' },
        { title: '最近操作时间', dataIndex: 'updateTime' },
        ...(isAdmin ? [
            {
                title: '操作', // 列标题
                key: 'action', // 列唯一key（必须，Table 要求每列有唯一key）
                width: 160, // 固定列宽，避免挤压
                align: 'center' as const, // 内容居中（可选，视觉更整齐）

                render: (_: any, record: ProjectVO) => (
                    <Space size="small"> {/* Space 组件控制按钮间距，避免手写margin */}
                        <Button
                            type="text" // 文本按钮（无背景，仅文字）
                            icon={<IconEdit />} // 编辑图标（可选，提升体验）
                            onClick={() => {
                                setEditingProject(record);
                                form.setFieldsValue({
                                    projectIdentity: record.projectIdentity,
                                    projectName: record.projectName,
                                    description: record.description
                                });
                                setModalVisible(true);
                            }}
                            style={{ color: '#165DFF' }} // 蓝色文字，和项目名称按钮风格统一
                        >
                            编辑
                        </Button>
                        <Button
                            type="text"
                            icon={<IconUser />}
                            onClick={async () => {
                                try {
                                    // 这时候还不能使用 editingProject.projectId
                                    // 因为 setEditingProject 是异步的, editingProject 还没有更新                                    
                                    setEditingProject(record);

                                    const res = await getProjectUsers(record.projectId);
                                    if (!res.data.success) {
                                        Message.error(res.data.msg || '获取项目用户失败');
                                        return;
                                    }

                                    const allUsersRes = await getAllUsers();
                                    if (!allUsersRes.data.success) {
                                        Message.error(allUsersRes.data.msg || '获取所有用户失败');
                                        return;
                                    }

                                    setAllUsers(allUsersRes.data.data);
                                    setEditingProjectUsers(res.data.data);
                                } catch (err) {
                                    Message.error('获取项目用户或者获取所有用户失败');
                                    console.error('获取项目用户或者获取所有用户失败:', err);
                                } finally {
                                    // 无论成功失败，都打开成员管理弹窗，避免用户点击后没有反馈
                                    setUserModalVisible(true);
                                }
                            }}
                            style={{ color: '#165DFF' }}
                        >
                            成员
                        </Button>
                        <Button
                            type="text"
                            icon={<IconBook />}
                            onClick={() => {
                                setCurrentDetailProjectId(record.projectId);
                                setCurrentDetailProjectName(record.projectName);
                                setDetailPanelVisible(true);
                            }}
                            style={{ color: '#165DFF' }}
                        >
                            详情
                        </Button>
                        <Button
                            type="text"
                            icon={<IconDelete />} // 删除图标（可选）
                            onClick={() => handleDelete(record)} // 点击触发删除逻辑
                            style={{ color: '#F53F3F' }} // 危险色（红色），符合大厂交互规范
                        >
                            删除
                        </Button>
                    </Space>
                )
            }
        ] : [])

    ]; // columns 定义结束

    const handleCreate = async () => {
        try {
            const values = await form.validate();
            const res = await createProject({
                projectName: values.projectName,
                projectIdentity: values.projectIdentity,
                description: values.description
            });

            if (res.data.success) {
                Message.success('创建项目成功');
                setModalVisible(false);
                form.resetFields();
                fetchProjects();
            } else {
                Message.error(res.data.msg || '创建项目失败');
            }
        } catch (err: any) {
            // 这里如果是 401 403 错误，已经在 request.ts 中被拦截处理，这里不需要再处理
            console.error('创建项目失败:', err);
        }
    };

    const handleEdit = async () => {
        try {
            // 校验表单并获取新值
            const values = await form.validate();
            if (!editingProject) return;
            const noChange =
                values.projectName === editingProject.projectName &&
                values.description === editingProject.description;

            if (noChange) {
                Message.info('项目未发生变化');
                return;
            }

            const res = await updateProject({
                projectId: editingProject.projectId,
                projectName: values.projectName,
                projectIdentity: editingProject.projectIdentity, // 标识不允许修改
                description: values.description
            });

            if (!res.data.success) {
                Message.error(res.data.msg || '更新项目失败');
                return;
            }
            Message.success('项目更新成功');
            setModalVisible(false);
            setEditingProject(null);
            form.resetFields();
            fetchProjects();
        } catch (err) {
            console.error('更新项目失败:', err);
        }
    };

    const handleDelete = (record: ProjectVO) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除项目 "${record.projectName}" 吗？此操作不可恢复！`,
            onOk: async () => {
                const res = await deleteProjects({ projectIds: [record.projectId] });
                if (res.data.success) {
                    Message.success('删除项目成功');
                    fetchProjects(); // 刷新列表
                } else {
                    Message.error(res.data.msg || '删除项目失败');
                }
            },
            onCancel: () => Message.info('取消删除项目')

        });
    };

    return (
        <>
            <Card>
                <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                    <Search placeholder="搜索项目名称 / 标识" allowClear style={{ width: 260 }}
                        value={searchTerm}
                        onChange={handleSearch}
                        onKeyDown={handleKeyPress}
                    />
                    <Button type="primary" onClick={() => {
                        setEditingProject(null);
                        form.resetFields();
                        setModalVisible(true);
                    }}
                    >
                        新建项目
                    </Button>
                </Space>

                {/* 项目表格 */}
                <Table
                    columns={columns}
                    data={filteredProjects}
                    loading={loading}
                    pagination={{
                        current: projectPageCurrent,
                        pageSize: projectPageSize,
                        total: filteredProjects.length,
                        sizeCanChange: true,
                        sizeOptions: [10, 20, 50, 100],
                        pageSizeChangeResetCurrent: true,
                        showTotal: true,
                        onChange: (pageNumber, pageSize) => {
                            setProjectPageCurrent(pageNumber);
                            setProjectPageSize(pageSize);
                        },
                        onPageSizeChange: (size) => {
                            setProjectPageSize(size);
                            setProjectPageCurrent(1);
                        }
                    }}
                    border={false}
                    rowKey="projectId"
                />
            </Card>

            {/* 创建or编辑项目弹窗 */}
            <Modal
                title={editingProject ? "编辑项目" : "新建项目"}
                visible={modalVisible}
                onOk={editingProject ? handleEdit : handleCreate}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingProject(null);
                    form.resetFields();
                }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="项目名称" field="projectName"
                        rules={[{ required: true, message: '请输入项目名称' }]}
                    >
                        <Input placeholder="项目名称" />
                    </Form.Item>

                    <Form.Item label="项目标识" field="projectIdentity"
                        rules={
                            editingProject
                                ? [] // 编辑时：不校验
                                : [{ required: true, message: '请输入项目标识' }] // 新建时：必填
                        }
                    >
                        <Input
                            placeholder="项目标识"
                            disabled={!!editingProject} // 编辑时禁用
                        />
                    </Form.Item>


                    <Form.Item
                        label="项目描述"
                        field="description"
                        rules={[{ max: 200, message: '最多200字' }]}
                    >
                        <Input.TextArea placeholder="项目描述" />
                    </Form.Item>
                </Form>
            </Modal>
            {/** 成员管理弹窗 */}
            <Modal
                title={`成员管理: ${editingProject ? editingProject.projectName : ''}`}
                visible={userModalVisible}
                footer={null}
                onCancel={() => {
                    setUserModalVisible(false);
                    setEditingProjectUsers([]);
                    setEditingProject(null);
                    setSelectedUserId('')
                }}
            >
                {/* 新增：用户选择+添加区域 */}
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Select placeholder="请选择要添加的用户" value={selectedUserId} allowClear
                        showSearch filterOption={(input, option) => {
                            return option.props.children.toLowerCase().includes(input.toLowerCase());
                        }}
                        onChange={(value) => { setSelectedUserId(value); }}
                        options={allUsers.filter(user => user.role !== 'ROLE_ADMIN').map(user => ({
                            label: user.username,
                            value: user.userId
                        }))}
                    />
                    <Button type="primary" icon={<IconPlus />} onClick={async () => {
                        if (selectedUserId && editingProject) {
                            if (editingProjectUsers.some(u => u.userId === selectedUserId)) {
                                Message.info('用户已在项目中');
                                return;
                            } else {
                                const res = await grantProjectToUser({
                                    projectId: editingProject.projectId,
                                    userId: selectedUserId
                                });
                                if (!res.data.success) {
                                    Message.error(res.data.msg || '添加用户失败');
                                    return
                                }

                                Message.success('添加用户成功');
                                // 刷新成员列表
                                const getPURes = await getProjectUsers(editingProject.projectId);
                                if (!getPURes.data.success) {
                                    Message.error(getPURes.data.msg || '获取项目用户失败');
                                    return;
                                }
                                setEditingProjectUsers(getPURes.data.data);
                            }
                        }
                    }}
                    >
                        添加用户
                    </Button>
                </div>
                <Table
                    columns={userColumns}
                    data={editingProjectUsers}
                    pagination={{ pageSize: 10 }}
                    border={false}
                    rowKey="userId"
                />

            </Modal>

            {/* 项目详情侧边面板 */}
            <ProjectDetailPanel
                visible={detailPanelVisible}
                projectId={currentDetailProjectId}
                projectName={currentDetailProjectName}
                onClose={() => {
                    setDetailPanelVisible(false);
                    setCurrentDetailProjectId(null);
                    setCurrentDetailProjectName(null);
                }}
            />

        </>
    );
}

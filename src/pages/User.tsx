import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button, Card, Empty, Form, Input, Message, Modal, Space, Table, Tag, Typography
} from '@arco-design/web-react';
import type { TableProps } from '@arco-design/web-react';
import { IconDelete, IconPlus, IconRefresh, IconWechat, IconPlayCircle, IconPlayArrow,  IconStop, 
    IconPoweroff, IconCloseCircle, IconMute
} from '@arco-design/web-react/icon';
import { useUser } from '../context/useUser';
import { addUser, updateEnabled, getAllUsers, resetPassword, updatePassword } from '../api/user';
import { UserVO } from '../types/user';

type PanelKey = 'profile' | 'users';

interface PasswordFormValues {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface ResetPasswordFormValues {
    newPassword: string;
    confirmPassword: string;
}

interface AddUserFormValues {
    username: string;
    password: string;
    confirmPassword: string;
}

const ROLE_LABEL: Record<string, string> = {
    ROLE_ADMIN: '管理员',
    ROLE_USER: '普通用户'
};

const { Text } = Typography;

export default function User() {
    // 当前登陆用户
    const { user } = useUser();
    const isAdmin = user?.role === 'ROLE_ADMIN';

    const [activePanel, setActivePanel] = useState<PanelKey>('profile');
    const [users, setUsers] = useState<UserVO[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // 弹窗变量
    const [profileSaving, setProfileSaving] = useState(false);
    const [addUserVisible, setAddUserVisible] = useState(false);
    const [resetPwdVisible, setResetPwdVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserVO | null>(null);

    // 表单
    const [profilePasswordForm] = Form.useForm<PasswordFormValues>();
    const [addUserForm] = Form.useForm<AddUserFormValues>();
    const [resetPasswordForm] = Form.useForm<ResetPasswordFormValues>();

    const fetchUsers = useCallback(async () => {
        if (!isAdmin) return;
        try {
            setUsersLoading(true);
            const res = await getAllUsers();
            if (!res.data.success) {
                Message.error(res.data.msg || '获取用户列表失败');
                return;
            }
            setUsers(res.data.data || []);
        } catch (err) {
            console.error('获取用户列表失败:', err);
            Message.error('获取用户列表失败');
        } finally {
            setUsersLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin && activePanel === 'users') {
            setActivePanel('profile');
        }
    }, [activePanel, isAdmin]);

    useEffect(() => {
        if (isAdmin && activePanel === 'users') {
            fetchUsers();
        }
    }, [activePanel, fetchUsers, isAdmin]);

    const roleLabel = useMemo(() => {
        return ROLE_LABEL[user?.role || ''] || user?.role || '-';
    }, [user?.role]);

    // 修改密码
    const submitUpdatePassword = async () => {
        if (!user?.userId) {
            Message.warning('当前用户信息异常，请重新登录');
            return;
        }

        try {
            const values = await profilePasswordForm.validate();
            if (values.newPassword !== values.confirmPassword) {
                Message.warning('两次输入的新密码不一致');
                return;
            }
            if (values.oldPassword === values.newPassword) {
                Message.warning('新密码不能与旧密码一致');
                return;
            }

            setProfileSaving(true);
            const res = await updatePassword({
                userId: user.userId,
                oldPassword: values.oldPassword,
                newPassword: values.newPassword
            });
            if (!res.data.success) {
                Message.error(res.data.msg || '修改密码失败');
                return;
            }
            Message.success('密码修改成功');
            profilePasswordForm.resetFields();
        } catch (err) {
            if (!(err instanceof Error)) {
                return;
            }
            console.error('修改密码失败:', err);
            Message.error('修改密码失败');
        } finally {
            setProfileSaving(false);
        }
    };

    // 添加用户
    const submitAddUser = async () => {
        try {
            const values = await addUserForm.validate();
            if (values.password !== values.confirmPassword) {
                Message.warning('两次输入的密码不一致');
                return;
            }

            setActionLoading(true);
            const res = await addUser({
                username: values.username.trim(),
                password: values.password
            });
            if (!res.data.success) {
                Message.error(res.data.msg || '新增用户失败');
                return;
            }
            Message.success('新增用户成功');
            setAddUserVisible(false);
            addUserForm.resetFields();
            await fetchUsers();
        } catch (err) {
            if (!(err instanceof Error)) {
                return;
            }
            console.error('新增用户失败:', err);
            Message.error('新增用户失败');
        } finally {
            setActionLoading(false);
        }
    };

    // 重置密码
    const submitResetPassword = async () => {
        if (!selectedUser) return;

        try {
            const values = await resetPasswordForm.validate();
            if (values.newPassword !== values.confirmPassword) {
                Message.warning('两次输入的新密码不一致');
                return;
            }

            setActionLoading(true);
            const res = await resetPassword({
                userId: selectedUser.userId,
                newPassword: values.newPassword
            });
            if (!res.data.success) {
                Message.error(res.data.msg || `重置用户 ${selectedUser.username} 密码失败`);
                return;
            }
            Message.success(`已重置用户 ${selectedUser.username} 密码`);
            setResetPwdVisible(false);
            setSelectedUser(null);
            resetPasswordForm.resetFields();
        } catch (err) {
            if (!(err instanceof Error)) {
                return;
            }
            console.error('重置密码失败:', err);
            Message.error('重置密码失败');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateEnableUser = (target: UserVO) => {

        Modal.confirm({
            title: `确认${target.enabled ? '禁用' : '启用'}用户`,
            content: `确定${target.enabled ? '禁用' : '启用'}用户 "${target.username}" 吗？${target.enabled ? '禁用后无法登录。' : ''}`,
            okButtonProps: { status: 'danger' },
            onOk: async () => {
                try {
                    const res = await updateEnabled({ userId: target.userId, enabled: target.enabled ? false : true });
                    if (!res.data.success) {
                        Message.error(res.data.msg || '操作失败');
                        return;
                    }
                    Message.success('操作成功');
                    await fetchUsers();
                } catch (err) {
                    console.error('操作成功:', err);
                    Message.error('操作失败');
                }
            }
        });
    };

    const userColumns: TableProps<UserVO>['columns'] = [
        {
            title: '用户名',
            dataIndex: 'username'
        },
        {
            title: '角色',
            dataIndex: 'role',
            render: (role: string) => (
                <Tag color={role === 'ROLE_ADMIN' ? 'arcoblue' : 'green'}>{ROLE_LABEL[role] || role}</Tag>
            )
        },
        {
            title: '状态',
            dataIndex: 'enabled',
            render: (enabled: boolean) => (
                <Tag color={enabled ? 'arcoblue' : 'grey'}>{enabled ? '正常' : '已禁用'}</Tag>
            )
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            width: 180
        },
        {
            title: '最近更新时间',
            dataIndex: 'updateTime',
            width: 180
        },
        {
            title: '操作',
            key: 'action',
            width: 260,
            align: 'center' as const,
            render: (_: unknown, record: UserVO) => {
                const deletingSelf = user?.userId === record.userId;
                const disableVisible = record.role !== 'ROLE_ADMIN'
                return (
                    <Space size="small">
                        <Button
                            type="text"
                            status="warning"
                            icon = {<IconRefresh/>}
                            onClick={() => {
                                setSelectedUser(record);
                                resetPasswordForm.resetFields();
                                setResetPwdVisible(true);
                            }}
                        >
                            重置密码
                        </Button>
                        {disableVisible && (
                            <Button
                                type="text"
                                status={record.enabled ? "danger" : "default"}
                                icon={record.enabled ? <IconStop  /> : <IconPlayArrow />}
                                disabled={deletingSelf}
                                onClick={() => handleUpdateEnableUser(record)}
                            >
                                {record.enabled ? '禁用' : '启用'}
                            </Button>
                        )}
                    </Space>
                );
            }
        }
    ];

    const renderLeftCard = (key: PanelKey, title: string, description: string) => {
        const active = activePanel === key;
        return (
            <div style={{ cursor: 'pointer' }} onClick={() => setActivePanel(key)}>
                <Card
                    size="small"
                    hoverable
                    style={{
                        border: active ? '1px solid #165DFF' : '1px solid #E5E6EB',
                        background: active ? '#F2F3FF' : '#FFFFFF'
                    }}
                >
                    <div style={{ fontWeight: active ? 600 : 500, color: active ? '#165DFF' : '#1D2129' }}>{title}</div>
                    <Text style={{ color: '#86909C', fontSize: 12 }}>{description}</Text>
                </Card>
            </div>
        );
    };

    const renderProfilePanel = () => (
        <div
            style={{
                height: '100%',
                border: '1px solid #E5E6EB',
                borderRadius: 8,
                background: '#FFF',
                display: 'grid',
                gridTemplateRows: 'auto auto',
                gap: 12,
                padding: 12,
                overflow: 'auto'
            }}
        >
            <Card title="基础信息" bordered={false} style={{ background: '#F7F8FA' }}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <div>
                        <Text style={{ color: '#86909C', marginRight: 8 }}>用户名:</Text>
                        <Text>{user?.username || '-'}</Text>
                    </div>
                    <div>
                        <Text style={{ color: '#86909C', marginRight: 8 }}>角色:</Text>
                        <Tag color={user?.role === 'ROLE_ADMIN' ? 'arcoblue' : 'green'}>{roleLabel}</Tag>
                    </div>
                    <div>
                        <Text style={{ color: '#86909C', marginRight: 8 }}>创建时间:</Text>
                        <Text>{user?.createTime || '-'}</Text>
                    </div>
                    <div>
                        <Text style={{ color: '#86909C', marginRight: 8 }}>更新时间:</Text>
                        <Text>{user?.updateTime || '-'}</Text>
                    </div>
                </Space>
            </Card>

            <Card title="修改密码" bordered={false} style={{ width: 300 }}>
                <Form form={profilePasswordForm} layout="vertical">
                    <Form.Item
                        field="oldPassword"
                        label="旧密码"
                        rules={[
                            { required: true, message: '请输入旧密码' }
                        ]}
                    >
                        <Input.Password placeholder="请输入当前密码" />
                    </Form.Item>
                    <Form.Item
                        field="newPassword"
                        label="新密码"
                        rules={[{ required: true, message: '请输入新密码' },
                        { match: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线' },
                        { minLength: 6, message: '密码长度至少为6位' }
                        ]}
                    >
                        <Input.Password placeholder="请输入新密码" />
                    </Form.Item>
                    <Form.Item
                        field="confirmPassword"
                        label="确认新密码"
                        rules={[{ required: true, message: '请再次输入新密码' },
                        { match: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线' },
                        { minLength: 6, message: '密码长度至少为6位' }
                        ]}
                    >
                        <Input.Password placeholder="请再次输入新密码" />
                    </Form.Item>
                    <Button type="primary" loading={profileSaving} onClick={submitUpdatePassword}>
                        保存新密码
                    </Button>
                </Form>
            </Card>
        </div>
    );

    const renderUsersPanel = () => {
        if (!isAdmin) {
            return (
                <Card style={{ height: '100%' }} bodyStyle={{ height: '100%' }}>
                    <Empty description="仅管理员可访问用户列表" />
                </Card>
            );
        }

        return (
            <Card
                style={{ height: '100%', borderRadius: 8 }}
                bodyStyle={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    minHeight: 0
                }}
            >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>用户列表</span>
                    <Space>
                        <Button icon={<IconRefresh />} onClick={fetchUsers} loading={usersLoading}>
                            刷新
                        </Button>
                        <Button
                            type="primary"
                            icon={<IconPlus />}
                            onClick={() => {
                                addUserForm.resetFields();
                                setAddUserVisible(true);
                            }}
                        >
                            新增用户
                        </Button>
                    </Space>
                </Space>

                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table
                        columns={userColumns}
                        data={users}
                        loading={usersLoading}
                        border={false}
                        rowKey="userId"
                        pagination={{ pageSize: 10 }}
                        noDataElement={<Empty description="暂无用户数据" />}
                    />
                </div>
            </Card>
        );
    };

    return (
        <>
            <div
                style={{
                    height: '100%',
                    maxHeight: '100%',
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: '280px minmax(0, 1fr)',
                    gap: 4,
                    minHeight: 0
                }}
            >
                <Card
                    style={{ height: '100%', overflow: 'hidden', borderRadius: 8 }}
                    bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
                >
                    <span style={{ fontWeight: 600, marginBottom: 12 }}>用户中心</span>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        {renderLeftCard('profile', '基本信息', '查看账号信息并修改自己的密码')}
                        {isAdmin && renderLeftCard('users', '用户列表', '管理用户账号和密码')}
                    </Space>
                </Card>

                {activePanel === 'profile' ? renderProfilePanel() : renderUsersPanel()}
            </div>

            <Modal
                title="新增用户"
                visible={addUserVisible}
                onOk={submitAddUser}
                okButtonProps={{ loading: actionLoading }}
                onCancel={() => {
                    setAddUserVisible(false);
                    addUserForm.resetFields();
                }}
            >
                <Form form={addUserForm} layout="vertical">
                    <Form.Item
                        field="username"
                        label="用户名"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input placeholder="请输入用户名" />
                    </Form.Item>
                    <Form.Item
                        field="password"
                        label="登录密码"
                        rules={[{ required: true, message: '请输入密码' },
                        { match: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线' },
                        { minLength: 6, message: '密码长度至少为6位' }]}
                    >
                        <Input.Password placeholder="请输入密码" />
                    </Form.Item>
                    <Form.Item
                        field="confirmPassword"
                        label="确认密码"
                        rules={[{ required: true, message: '请再次输入密码' },
                        { match: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线' },
                        { minLength: 6, message: '密码长度至少为6位' }]}
                    >
                        <Input.Password placeholder="请再次输入密码" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`重置密码: ${selectedUser?.username || ''}`}
                visible={resetPwdVisible}
                onOk={submitResetPassword}
                okButtonProps={{ loading: actionLoading }}
                onCancel={() => {
                    setResetPwdVisible(false);
                    setSelectedUser(null);
                    resetPasswordForm.resetFields();
                }}
            >
                <Form form={resetPasswordForm} layout="vertical">
                    <Form.Item
                        field="newPassword"
                        label="新密码"
                        rules={[{ required: true, message: '请输入新密码' },
                        { match: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线' },
                        { minLength: 6, message: '密码长度至少为6位' }]}
                    >
                        <Input.Password placeholder="请输入新密码" />
                    </Form.Item>
                    <Form.Item
                        field="confirmPassword"
                        label="确认新密码"
                        rules={[{ required: true, message: '请再次输入新密码' },
                        { match: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线' },
                        { minLength: 6, message: '密码长度至少为6位' }]}
                    >
                        <Input.Password placeholder="请再次输入新密码" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

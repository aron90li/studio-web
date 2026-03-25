import { Layout, Tabs, Card, Message, Tree, Dropdown, Modal, Input } from '@arco-design/web-react';
import type { NodeInstance, TreeDataType } from '@arco-design/web-react/es/Tree/interface';
import { Menu } from '@arco-design/web-react';
import { Outlet } from 'react-router-dom';

import { IconFile, IconFolder } from '@arco-design/web-react/icon';
import '@arco-design/web-react/dist/css/arco.css';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useProjects } from '../context/useProjects';
import { useParams } from 'react-router-dom';
import { TaskVO, TreeData, TreeNodeVO, TreeNodeVOExtend } from '../types/task';
import { createTreeNode, getTreeNode, deleteTreeNode, updateTreeNode } from '../api/task';
import StudioTabs from './studio/StudioTabs';
import StudioEditorContainer from './studio/StudioEditorContainer';
import EmptyEditor from './studio/EmptyEditor';

import { useBeforeUnload, useBlocker } from 'react-router-dom'; // 1. 引入新 Hooks
import { Blocker } from 'react-router-dom';

// 解构组件和子组件，方便使用，避免写Layout.Sider Layout.Header等冗长的代码
const { Sider, Header, Content, Footer } = Layout;

export default function Studio() {
    const navigate = useNavigate();
    // url 中的 projectId 参数,首次渲染都有值，可能是undefined
    const { projectId, taskId } = useParams<{ projectId: string, taskId: string }>()
    const { projects, fetchProjects } = useProjects()
    const [treeNodes, setTreeNodes] = useState<TreeNodeVO[]>([]);
    const [treeNodesLoaded, setTreeNodesLoaded] = useState(false);

    // 树节点 左键选中的nodes
    const [selectedKeys, setSelectedKeys] = useState<string[]>([])

    // 树节点 右键菜单使用，含有是否含有children标识
    const [selectedNode, setSelectedNode] = useState<TreeNodeVOExtend | null>(null);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    // 树节点 新建,修改,删除,克隆等弹窗
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'create_task' | 'create_folder' | 'edit_folder' | 'clone_task'
        | 'edit_task' | null>(null);
    const [inputValue, setInputValue] = useState('');

    // 树节点 折叠展开
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    // 打开的任务, 几种情况：切换项目, url变化(点击任务树/切换任务/手动刷新), 关闭tab, 删除任务
    const [openedTaskIds, setOpenedTaskIds] = useState<string[]>([])

    // 20260302 任务状态池, 是否未保存等
    const [taskStateMap, setTaskStateMap] = useState<Record<string, { dirty: boolean; saving: boolean }>>({})

    {/* 浏览器刷新跳转拦截 *******************************/ }
    // 20260312 添加跳转刷新提示
    const hasUnsavedChanges = useMemo(() => {
        if (openedTaskIds.length === 0) return false;
        return Object.values(taskStateMap).some(state => state?.dirty === true);
    }, [openedTaskIds, taskStateMap]);

    // 拦截浏览器刷新、关闭、地址栏手动输入
    useBeforeUnload((event) => {
        if (hasUnsavedChanges) event.preventDefault();
    });

    // todo 要注册全局的blocker，这里不能单独写，后续改正
    // 路由跳转拦截 blocker.state 状态: 'unblocked' | 'blocked' | 'proceeding'
    // const blocker = useBlocker(hasUnsavedChanges);
    // useEffect(() => {
    //     if (blocker.state !== 'blocked') return;
    //     const nextPath = blocker.location?.pathname || '';

    //     if (!nextPath.startsWith('/stream/studio/')) {
    //         showConfirmModal();
    //         return;
    //     }

    //     const segments = nextPath.split('/');
    //     const nextProjectId = segments[3];
    //     if (!nextProjectId || projectId !== nextProjectId) {
    //         showConfirmModal();
    //         return;
    //     }

    //     blocker.proceed();
    // }, [blocker.state, blocker.location, projectId]);

    // const showConfirmModal = () => {
    //     Modal.confirm({
    //         title: '确认离开？',
    //         content: '系统不会保存您的更改，确定要离开当前项目或页面吗？',
    //         okText: '继续离开',
    //         cancelText: '留在页面',
    //         okButtonProps: { status: 'danger' },
    //         maskClosable: false,
    //         onOk: () => {
    //             blocker.proceed?.();
    //         },
    //         onCancel: () => {
    //             blocker.reset?.();
    //         },
    //     });
    // };

    {/* 一、任务树相关 *******************************/ }
    // 1.1 任务树, 扁平的, 来自数据库
    const fetchTreeNodes = async (projectId: string) => {
        try {
            const res = await getTreeNode(projectId)
            if (!res.data.success) {
                Message.error(res.data.msg || '获取任务树失败')
                return
            }
            const nodes = res.data.data;
            setTreeNodes(nodes)
        } catch (err) {
            console.error('获取任务树失败：', err)
            Message.error('获取任务树失败')
        } finally {
            setTreeNodesLoaded(true)
        }
    }

    // 1.2  任务树的数据，根据 treeNodes 构建
    const treeData = useMemo(() => {
        const map = new Map<string, TreeData>();
        const tree: TreeData[] = [];

        treeNodes.forEach(node => {
            const titleElement = (
                <span style={{
                    userSelect: 'none', display: 'block', width: '100%',
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                }}
                    onContextMenu={(e) => handleRightClick(e, node)}
                >
                    {node.nodeType === 'folder' ? <IconFolder style={{ marginRight: 6 }} /> : <IconFile style={{ marginRight: 6 }} />}
                    {node.nodeName}
                </span>
            );

            map.set(node.nodeId, {
                ...node,

                key: node.nodeId,
                title: titleElement,
                children: [],
                icon: null,
                isLeaf: false

            });
        });

        treeNodes.forEach(node => {
            const current = map.get(node.nodeId)!;

            if (node.parentNodeId === '0') {
                tree.push(current);
            } else {
                const parent = map.get(node.parentNodeId);
                parent?.children.push(current);
            }
        });

        // 标记叶子节点
        const markIsLeaf = (nodes: TreeData[]) => {
            nodes.forEach(node => {
                if (node.nodeType === 'folder') {
                    node.isLeaf = node.children.length === 0;
                } else {
                    node.isLeaf = true;
                }
                // 递归子节点
                if (node.children && node.children.length > 0) {
                    markIsLeaf(node.children);
                }
            });
        };
        markIsLeaf(tree);

        return tree;
    }, [treeNodes]);

    // 1.3 任务列表，根据treeData构建
    const taskMap = useMemo(() => {
        const map: Record<string, string> = {}
        treeNodes.forEach(n => {
            if (n.nodeType === 'task') {
                map[n.taskId!] = n.nodeName
            }
        })
        return map
    }, [treeNodes])

    // 展开某个节点和它的所有父节点
    function getParentKeys(taskId: string) {
        const keys: string[] = []

        let node = treeNodes.find(n => n.nodeType === 'task' && n.taskId === taskId)
        while (node?.parentNodeId !== '0') {
            const parent = treeNodes.find(n => n.nodeType === 'folder' && n.nodeId === node?.parentNodeId)
            if (!parent) break

            keys.push(parent.nodeId)
            node = parent
        }

        return keys.reverse()
    }

    {/* 二、 useEffect 相关 *******************************/ }
    // Studio 组件首次挂载执行，刷新执行，浏览器手动输入执行(相当于刷新)
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects()
        }
    }, [])

    useEffect(() => {
        if (!projectId) return
        // 项目变化
        setSelectedNode(null)  // 右键菜单的选中
        setOpenedTaskIds([])   // 打开的tab
        setExpandedKeys([])   // 展开的节点
        setSelectedKeys([])   // 左键选中的节点
        setTreeNodesLoaded(false)
        fetchTreeNodes(projectId)  // 异步函数调用
    }, [projectId])

    // 加载好，没有taskId的处理，没有 taskId 默认展开根节点
    useEffect(() => {
        if (!projectId) return
        if (taskId) return
        if (!treeNodesLoaded) return
        if (treeNodes.length === 0) return

        // 计算根节点
        const rootFolderKeys = treeNodes
            .filter(node => node.parentNodeId === "0" && node.nodeType === 'folder')
            .map(node => node.nodeId);

        if (rootFolderKeys.length > 0) {
            setExpandedKeys(prev => {
                if (prev.length > 0) return prev
                return rootFolderKeys
            })
        }

    }, [treeNodesLoaded]);

    // taskId的变化, Studio挂载执行，依赖变化执行，
    useEffect(() => {
        if (!projectId) return
        if (!treeNodesLoaded) return
        if (!taskId) {
            setSelectedKeys([])
            return
        }

        // tree已经加载完成，如果没有taskId，要跳转到project默认页面
        if (Object.keys(taskMap).length === 0) {
            Message.warning('任务不存在，返回项目首页');
            navigate(`/stream/studio/${projectId}`, { replace: true });
            return
        }

        // 任务不合法
        if (!(taskId in taskMap)) {
            Message.warning('任务不存在，返回项目首页');
            navigate(`/stream/studio/${projectId}`, { replace: true });
            return
        }

        // taskId合法，放入打开的任务中，触发渲染
        setOpenedTaskIds(prev => {
            if (prev.includes(taskId)) return prev
            return [...prev, taskId]
        })

        // 如果是刷新页面, 展开相应的父节点
        setExpandedKeys(prev => {
            if (prev.length > 0) return prev
            return getParentKeys(taskId)
        })

        // 选中节点, todo这里没有区分原地刷新还是点击树节点，在onSelect中处理
        const nodeId = treeNodes.find(n => n.nodeType === 'task' && n.taskId === taskId)?.nodeId!
        setSelectedKeys([nodeId])

    }, [treeNodesLoaded, taskId])

    {/* 三、 Tab操作 *******************************/ }

    // 切换 task tab
    const handleChangeTab = (key: string) => {
        const currentPath = window.location.pathname;
        const targetPath = `/stream/studio/${projectId}/${key}`;
        if (currentPath === targetPath) {
            return;
        }
        navigate(targetPath)
    }

    // 删除tab
    const performDeleteTab = (key: string) => {
        const newTabs = openedTaskIds.filter(id => id !== key);
        setOpenedTaskIds(newTabs);

        // 如果删除的是当前激活的 Tab，执行跳转逻辑
        if (key === taskId) {
            if (newTabs.length > 0) {
                const last = newTabs[newTabs.length - 1];
                navigate(`/stream/studio/${projectId}/${last}`);
            } else {
                navigate(`/stream/studio/${projectId}`);
            }
        }
    }
    const handleDeleteTab = (key: string) => {
        if (!taskStateMap[key]) {
            performDeleteTab(key);
            return;
        }
        if (taskStateMap[key].dirty) {
            Modal.confirm({
                title: '确认关闭？',
                content: `任务有未保存的更改，确定要关闭吗？`,
                okText: '确定',
                cancelText: '取消',
                okButtonProps: { status: 'danger' },
                onOk: () => {
                    performDeleteTab(key)
                },
                onCancel: () => {
                    return
                }
            });
            // 关键
            return;
        }
        performDeleteTab(key)
    };

    {/* 四、 树节点操作 *******************************/ }
    // 右键菜单生成
    const renderMenu = () => {
        if (!selectedNode) return null;
        const { nodeId, projectId, taskId, nodeName, hasChildren, nodeType, parentNodeId } = selectedNode;

        // 根目录
        if (parentNodeId === '0') {
            return (
                <Menu onClickMenuItem={() => setContextMenuVisible(false)}>
                    <Menu.Item key={'create_task'} onClick={() => {
                        setModalType('create_task');
                        setInputValue('');
                        setModalVisible(true);
                    }}>
                        新建任务</Menu.Item>
                    <Menu.Item key={'create_folder'} onClick={() => {
                        setModalType('create_folder');
                        setInputValue('');
                        setModalVisible(true);
                    }}>
                        新建目录</Menu.Item>
                </Menu>
            );
        }

        // 文件夹
        if (nodeType === 'folder') {
            return (
                <Menu onClickMenuItem={() => setContextMenuVisible(false)}>
                    <Menu.Item key={'create_task'} onClick={() => {
                        setModalType('create_task');
                        setInputValue('');
                        setModalVisible(true);
                    }}>新建任务</Menu.Item>
                    <Menu.Item key={'create_folder'} onClick={() => {
                        setModalType('create_folder');
                        setInputValue('');
                        setModalVisible(true);
                    }}>新建目录</Menu.Item>
                    <Menu.Item key={'edit_folder'} onClick={() => {
                        setModalType('edit_folder');
                        setInputValue(selectedNode.nodeName);
                        setModalVisible(true);
                    }}>重命名</Menu.Item>

                    <Menu.Item key={'move_folder'} onClick={() => null}>移动到</Menu.Item>

                    <Menu.Item key={'delete_folder'} onClick={() => {
                        hadleDeleteTreeNode(selectedNode)
                    }}>删除</Menu.Item>
                </Menu>
            );
        }

        // 任务
        return (
            <Menu onClickMenuItem={() => setContextMenuVisible(false)}>
                <Menu.Item key={'edit_task'} onClick={() => {
                    setModalType('edit_task');
                    setInputValue(selectedNode.nodeName);
                    setModalVisible(true);
                }}>重命名</Menu.Item>
                <Menu.Item key={'move_task'} onClick={() => null}>移动到</Menu.Item>
                <Menu.Item key={'clone_task'} onClick={() => {
                    setModalType('clone_task');
                    setInputValue(selectedNode.nodeName + '_copy');
                    setModalVisible(true);
                }}>克隆</Menu.Item>
                <Menu.Item key={'delete_task'} onClick={() => { hadleDeleteTreeNode(selectedNode) }}>
                    删除</Menu.Item>
            </Menu>
        );
    };

    // 删除节点
    const hadleDeleteTreeNode = (selected: TreeNodeVOExtend) => {
        if (selected.parentNodeId === "0") {
            Message.warning('根节点不能删除');
            return
        }
        if (selected.hasChildren) {
            Message.warning('含有子节点不能删除')
            return
        }
        if (selected.nodeType === 'task' && openedTaskIds.includes(selected.taskId!)) {
            Message.warning('请先关闭任务')
            return
        }
        Modal.confirm({
            title: '确认删除？',
            content: (
                <div style={{ textAlign: 'center' }}>
                    确定要删除 "{selected.nodeName}" 吗？
                </div>
            ),
            onOk: async () => {
                try {
                    const res = await deleteTreeNode({
                        nodeId: selected.nodeId,
                        projectId: selected.projectId
                    });
                    if (!res.data.success) {
                        Message.error(res.data.msg || '删除失败')
                        return
                    }

                    Message.success('删除成功');
                    // 刷新树
                    if (projectId) await fetchTreeNodes(projectId);
                } catch (err) {
                    console.error('删除失败:', err);
                    Message.error('删除失败，请重试');
                }
            },
            onCancel: () => {
                console.log('取消删除');
            },
        });
    }

    // 右键node弹出右键菜单
    const handleRightClick = (e: React.MouseEvent, node: TreeNodeVO) => {
        e.preventDefault();
        // 判断是否有children
        const hasChildren = treeNodes.some(
            n => n.parentNodeId === node.nodeId
        );

        // 菜单预估尺寸
        const MENU_WIDTH = 180;
        const MENU_HEIGHT = 120; // 3~4 个菜单项的高度

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = e.clientX;
        let y = e.clientY;

        // 防止超出右侧
        if (x + MENU_WIDTH > viewportWidth) {
            x = viewportWidth - MENU_WIDTH - 2;
        }

        // 防止超出底部（关键！）
        if (y + MENU_HEIGHT > viewportHeight) {
            y = viewportHeight - MENU_HEIGHT - 2;
        }

        // 新增：如果在任务栏附近，且菜单会遮挡，向上移动
        const taskbarHeight = 40; // Windows 默认
        const safeBottom = viewportHeight - taskbarHeight;

        if (y + MENU_HEIGHT > safeBottom) {
            y = safeBottom - MENU_HEIGHT - 2;
        }

        // 防止超出左侧
        if (x < 0) x = 2;

        const nodeExtend: TreeNodeVOExtend = {
            ...node,
            hasChildren: hasChildren, // 新增字段
        };
        setSelectedNode(nodeExtend);

        setContextMenuPos({ x, y });
        setContextMenuVisible(true);
    };

    // 关闭右键菜单
    useEffect(() => {
        const handleClick = () => {
            if (contextMenuVisible) {
                setContextMenuVisible(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [contextMenuVisible]);

    // 弹窗点击确定
    const handleModalOk = async () => {
        if (!inputValue.trim()) {
            Message.warning('名称不能为空');
            return;
        }

        if (modalType === "edit_folder" || modalType === "edit_task") {
            if (selectedNode?.nodeName === inputValue.trim()) {
                Message.warning('名称没有变化')
                return
            }
        }

        if (modalType === 'create_task' || modalType === 'edit_task') {
            const isValid = /^[a-zA-Z0-9_]{1,20}$/.test(inputValue.trim());
            if (!isValid) {
                Message.warning('只能包含字母、数字、下划线，长度1-20');
                return;
            }
        }

        if (!projectId) {
            Message.error('项目id缺失');
            return;
        }
        if (!selectedNode) {
            Message.error('必须在一个目录下创建')
            return
        }

        try {
            let res;
            if (modalType === 'create_task') {
                const parentNodeId = selectedNode.nodeId
                res = await createTreeNode({
                    projectId: projectId,
                    parentNodeId: parentNodeId,
                    nodeName: inputValue.trim(),
                    nodeType: 'task',
                });
            } else if (modalType === 'create_folder') {
                const parentNodeId = selectedNode.nodeId
                res = await createTreeNode({
                    projectId: projectId,
                    parentNodeId: parentNodeId,
                    nodeName: inputValue.trim(),
                    nodeType: 'folder',
                });
            } else if (modalType === 'edit_folder' || modalType === 'edit_task') {
                // 重命名 folder
                res = await updateTreeNode({
                    nodeId: selectedNode.nodeId,
                    projectId: selectedNode.projectId,
                    nodeType: selectedNode.nodeType,
                    taskId: selectedNode.taskId,
                    nodeName: inputValue.trim()
                })
            } else if (modalType === 'clone_task') {
                // todo 
                Message.info("待实现")
                return
            }

            if (!res?.data.success) {
                Message.error(res?.data?.msg || '操作失败');
                return
            }

            Message.success('操作成功');
            setModalVisible(false);
            await fetchTreeNodes(projectId);
        } catch (err) {
            console.error('操作失败:', err);
            Message.error('操作失败，请重试');
        }
    };

    // 点击节点, 这里和右键分开, 跳转
    const handleSelect = (keys: string[], extra: {
        selected: boolean; selectedNodes: NodeInstance[]; node: NodeInstance; e: Event
    }) => {
        if (!extra.node) return
        if (!extra.node.props.dataRef) {
            Message.error('节点数据异常')
            return
        }

        const n: TreeDataType = extra.node.props.dataRef
        if (n.nodeType === 'task') {
            // 要区分是原地刷新，还是点击了树，
            const currentPath = window.location.pathname;
            const targetPath = `/stream/studio/${projectId}/${n.taskId}`;
            if (currentPath === targetPath) {
                return;
            }
            navigate(targetPath)
        }

        if (n.nodeType === 'folder') {
            setExpandedKeys(prevKeys => {
                if (prevKeys.includes(n.key!)) {
                    return prevKeys.filter(key => key !== n.key);
                } else {
                    return [...prevKeys, n.key!];
                }
            });
        }
    };

    {/* 五、 taskEditor操作 *******************************/ }
    const handleTaskStateChange = (
        taskId: string,
        patch: Partial<{ dirty: boolean; saving: boolean }>
    ) => {
        setTaskStateMap(prev => ({
            ...prev,
            [taskId]: {
                dirty: prev[taskId]?.dirty ?? false,
                saving: prev[taskId]?.saving ?? false,
                ...patch
            }
        }))
    }

    return (
        <Layout style={{
            height: '100%', width: '100%', background: '#f5f6f7',
            display: 'flex', overflow: 'hidden', minWidth: 0,
        }} >

            <Sider width={300} resizeBoxProps={{ directions: ['right'] }} style={{
                background: '#fff',
                borderRight: '1px solid #eee',
                flex: '0 0 auto',   // 不伸缩，但允许 resize 改变 width
                maxWidth: '50%',   //  可选：防止拉太宽
                minWidth: '10%',
            }}>

                <Tree treeData={treeData} blockNode expandedKeys={expandedKeys} onExpand={setExpandedKeys}
                    onSelect={handleSelect}
                    selectedKeys={selectedKeys}
                />

            </Sider>
            <Content style={{
                background: '#fff', overflow: 'hidden',
                flex: 1,
                width: 0,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* IDE 级多实例隐藏架构 */}
                {
                    openedTaskIds.length === 0 ? <EmptyEditor /> :
                        <>
                            <StudioTabs
                                projectId={projectId!}
                                activeTaskId={taskId}
                                taskStateMap={taskStateMap}
                                openedTaskIds={openedTaskIds}
                                taskMap={taskMap}
                                onChange={handleChangeTab} // url改变
                                onDelete={handleDeleteTab} // url改变 openedTaskIds
                            />

                            <StudioEditorContainer
                                projectId={projectId!}
                                activeTaskId={taskId}
                                openedTaskIds={openedTaskIds}
                                taskMap={taskMap}
                                onStateChange={handleTaskStateChange}
                            />
                        </>
                }
            </Content>

            {contextMenuVisible && (
                <div
                    style={{
                        position: 'fixed',
                        left: contextMenuPos.x,
                        top: contextMenuPos.y,
                        zIndex: 10000,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #f0f0f0', // 可选：加个细边框更清晰
                        background: '#fff',
                        minWidth: '80px', // 防止太窄
                    }}
                >
                    {renderMenu()}
                </div>
            )}

            <Modal
                title={
                    modalType === 'create_task' ? '新建任务' :
                        modalType === 'create_folder' ? '新建目录' :
                            modalType === 'edit_folder' ? '编辑目录' :
                                modalType === 'edit_task' ? '编辑任务' :
                                    modalType === 'clone_task' ? '克隆任务' :
                                        ''
                }
                visible={modalVisible}
                onOk={handleModalOk}
                onCancel={() => setModalVisible(false)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <span>
                        {
                            modalType === 'create_task' || modalType === 'edit_task' || modalType === 'clone_task' ? '任务名' :
                                modalType === 'create_folder' || modalType === 'edit_folder' ? '目录名' :
                                    ''
                        }
                    </span>
                    <Input style={{ flex: 1, minWidth: 0 }}
                        placeholder={
                            modalType === 'create_task' || modalType === 'edit_task' || modalType === 'clone_task' ? '仅支持字母、数字、下划线，最长30字符' :
                                modalType === 'create_folder' || modalType === 'edit_folder' ? '目录名' :
                                    ''
                        }
                        value={inputValue}
                        onChange={setInputValue}
                        onPressEnter={(e) => {
                            e.preventDefault();
                            handleModalOk();
                        }}
                    />
                </div>
            </Modal>


        </Layout>
    );
}

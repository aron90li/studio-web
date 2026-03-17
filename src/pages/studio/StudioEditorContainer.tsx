import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { IconSave, IconEdit, IconLaunch, IconMan, IconSettings, IconTool, IconList, IconCheckSquare } from "@arco-design/web-react/icon";
import { getTask, updateTask } from "../../api/task";
import { Layout, Message, Space, Button } from "@arco-design/web-react";
import { TaskVO } from "../../types/task";

// 1. 手动引入 monaco-editor 核心（禁用 CDN 关键）
import * as monaco from 'monaco-editor';
import loader from "@monaco-editor/loader";
import { initMonacoSQLTables } from "../../utils/sqlCompletion"
import StudioRightPanel from "./StudioRightPanel";

loader.config({
    monaco,
});

interface Props {
    projectId: string;
    activeTaskId?: string;
    openedTaskIds: string[];
    taskMap: Record<string, string>;
    onStateChange: (
        taskId: string,
        patch: Partial<{ dirty: boolean; saving: boolean }>
    ) => void;
}

export default function StudioEditorContainer({
    projectId,
    activeTaskId,
    openedTaskIds,
    taskMap,
    onStateChange
}: Props) {

    /** Editor实例 */
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    /** taskId -> model */
    const modelsRef = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
    /** 防竞态 */
    const loadTokenRef = useRef(0);
    /** TaskVO缓存 */
    const taskVOMapRef = useRef<Record<string, TaskVO>>({});
    // 用于设置监听保存
    const activeTaskIdRef = useRef<string | undefined>(activeTaskId);
    const changeTimerRef = useRef<NodeJS.Timeout>();
    // sql注册
    const sqlInitRef = useRef(false)
    const disposableRef = useRef<monaco.IDisposable | null>(null)

    // 20260313 panel的相关变量 激活的tab的相关信息
    const [panelType, setPanelType] = useState<"source" | "dim" | "result" | "env" | "detail" | null>(null);

    // ref → 逻辑 state → UI
    const [activeTaskVO, setActiveTaskVO] = useState<TaskVO | undefined>()

    // 保存任务
    const saveTask = async (taskId: string) => {
        const model = modelsRef.current.get(taskId);
        if (!model) return;

        const taskVO = taskVOMapRef.current[taskId];
        if (!taskVO) return;

        const content = model.getValue();
        onStateChange(taskId, { saving: true });

        try {
            const res = await updateTask({
                projectId,
                taskId,
                taskVersion: taskVO.taskVersion,
                taskSql: content,
                taskParam: taskVO.taskParam,
                taskSource: taskVO.taskSource,
                taskSide: taskVO.taskSide,
                taskSink: taskVO.taskSink
            });

            if (!res.data.success) {
                Message.error(res.data.msg || "保存失败");
                onStateChange(taskId, { saving: false });
                return;
            }

            Message.info('保存成功')
            const newTask = res.data.data;
            taskVOMapRef.current[taskId] = newTask;

            // 保存成功后，如果taskId是当前id
            if (taskId === activeTaskIdRef.current) {
                setActiveTaskVO(newTask);
            }

            onStateChange(taskId, { dirty: false, saving: false });

        } catch (err) {
            console.error("保存失败", err);
            Message.error("保存失败");
            onStateChange(taskId, { saving: false });
        }
    };

    // 加载 数据, 两个地方调用，taskId就是activeTaskId
    const loadModel = async (taskId: string) => {
        if (!editorRef.current) return;
        const token = ++loadTokenRef.current;
        const uri = monaco.Uri.parse(`task://aron.studio.com/${taskId}`);

        // 已经存在
        if (modelsRef.current.has(taskId)) {
            editorRef.current.setModel(modelsRef.current.get(taskId)!);

            if (activeTaskIdRef.current === taskId) {
                const task = taskVOMapRef.current[taskId];
                if (task) {
                    setActiveTaskVO(task);
                }
            }
            return;
        }

        const existingModel = monaco.editor.getModel(uri);
        if (existingModel) {
            modelsRef.current.set(taskId, existingModel);
            editorRef.current.setModel(existingModel);

            if (activeTaskIdRef.current === taskId) {
                const task = taskVOMapRef.current[taskId];
                if (task) {
                    setActiveTaskVO(task);
                }
            }
            return;
        }

        // 不存在获取
        const res = await getTask(projectId, taskId);

        // 双重校验防竟态
        if (activeTaskIdRef.current !== taskId) return;
        if (token !== loadTokenRef.current) return;

        if (!res.data.success) {
            Message.error(res.data.msg || "获取任务失败");
            return;
        }

        // 成功设置数据
        const task = res.data.data;
        const model = monaco.editor.createModel(task.taskSql ?? "", "sql", uri);
        modelsRef.current.set(taskId, model);
        taskVOMapRef.current[taskId] = task
        // 再次校验
        if (taskId === activeTaskIdRef.current) {
            setActiveTaskVO(task);
        }
        editorRef.current.setModel(model);
        onStateChange(taskId, { dirty: false });
    };

    // 监听taskId变化, 激活的任务都在这里设置
    useEffect(() => {
        if (!activeTaskId) {
            activeTaskIdRef.current = undefined;
            setActiveTaskVO(undefined);
            setPanelType(null);
            return;
        }

        // 注意这里不要设置  setActiveTaskVO, 它们在loadModel中设置
        activeTaskIdRef.current = activeTaskId
        loadModel(activeTaskId);
        setPanelType(null)
    }, [activeTaskId]);

    // tab 关闭清理
    useEffect(() => {
        modelsRef.current.forEach((model, taskId) => {
            if (!openedTaskIds.includes(taskId)) {
                /** 当前 editor 正在使用 */
                if (editorRef.current?.getModel() === model) {
                    editorRef.current.setModel(null);
                    // editorRef.current.setModel(undefined as any)
                }

                /** dispose model */
                model.dispose();
                modelsRef.current.delete(taskId);

                /** 删除 taskVO */
                delete taskVOMapRef.current[taskId]

                // 如果是 activeTaskId
                if (taskId === activeTaskId) {
                    activeTaskIdRef.current = undefined
                    setActiveTaskVO(undefined)
                }
            }
        });

    }, [openedTaskIds]);

    // 清理
    useEffect(() => {
        return () => {
            if (changeTimerRef.current) {
                clearTimeout(changeTimerRef.current);
            }

            modelsRef.current.forEach(m => m.dispose())
            modelsRef.current.clear()
            // editorRef.current?.dispose()
            disposableRef.current?.dispose()
        }
    }, [])

    // model 挂载
    const handleMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
        // 表名字补全
        if (!sqlInitRef.current) {
            initMonacoSQLTables(monaco);
            sqlInitRef.current = true
        }

        editorRef.current = editor;

        if (activeTaskId) {
            activeTaskIdRef.current = activeTaskId
            loadModel(activeTaskId);
        }

        // 注册监听器
        disposableRef.current = editor.onDidChangeModelContent(() => {
            const model = editor.getModel();
            if (!model) return;

            if (changeTimerRef.current) {
                clearTimeout(changeTimerRef.current);
            }

            changeTimerRef.current = setTimeout(() => {
                const taskId = model.uri.path.slice(1);
                onStateChange(taskId, { dirty: true })
            }, 300);
        });

        // ctrl + s 保存
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            const taskId = activeTaskIdRef.current;
            if (taskId) {
                saveTask(taskId);
            }
        });
    };

    const togglePanel = (type: "source" | "dim" | "result" | "env" | "detail") => {
        if (panelType === type) {
            setPanelType(null);
        } else {
            setPanelType(type);
        }
    };

    const updateTaskVOField = (patch: Partial<TaskVO>) => {
        const taskId = activeTaskIdRef.current;
        if (!taskId) return;

        const current = taskVOMapRef.current[taskId];
        if (!current) return
        const updated = {
            ...current,
            ...patch
        };

        taskVOMapRef.current[taskId] = updated;
        setActiveTaskVO(updated);
        onStateChange(taskId, { dirty: true });
    };

    return (
        <Layout style={{ height: "100%", width: '100%', borderTop: 0 }}>

            <Layout.Header
                style={{
                    display: "flex",
                    height: 30,
                    margin: 0, padding: 0, borderTop: 0

                }}
            >
                <Space>
                    <Button type='text' size='small' icon={<IconSave />}
                        style={{ color: '#4E5969' }}
                        onClick={() =>
                            activeTaskId && saveTask(activeTaskId)
                        }
                    >
                        保存
                    </Button>
                    <Button type='text' icon={<IconCheckSquare />} size='small'
                        style={{ color: '#4E5969' }}> 语法检查</Button>
                    <Button type='text' icon={<IconLaunch />} size='small'
                        style={{ color: '#4E5969' }}> 提交</Button>
                    <Button type='text' icon={<IconTool />} size='small'
                        style={{ color: '#4E5969' }}> 运维</Button>
                </Space>
            </Layout.Header>

            <Layout.Content

                style={{
                    display: "flex",
                    borderTop: "3px solid #165DFF",
                    paddingTop: 5,
                    position: "relative"
                }}
            >
                <div
                    style={{
                        flex: 1,
                        borderRight: "1px solid #eee",
                        minWidth: 0
                    }}
                >
                    <Editor
                        height="100%"
                        defaultLanguage="sql"
                        theme="light"
                        onMount={handleMount}
                        options={{
                            minimap: { enabled: true },
                            fontSize: 14,
                            automaticLayout: true,
                            // smoothScrolling:true,
                            // scrollBeyondLastLine:false,
                        }}

                    />
                </div>

                {panelType && activeTaskVO && (
                    <StudioRightPanel
                        taskVO={activeTaskVO}
                        panelType={panelType}
                        onChange={updateTaskVOField}
                    />
                )}

                <div
                    style={{
                        width: 28,              // 【建议宽度】稍微加宽一点，防止文字换行或图标太挤
                        padding: "12px 0",      // 上下留白，左右不留白以对齐
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,                // 按钮之间的垂直间距
                        alignItems: "center",    // 确保按钮在 div 内水平居中
                        backgroundColor: '#fafafa' // 加一点背景色区分
                    }}
                >
                    <Button
                        type="text" size="mini"
                        style={{
                            ...styles.buttonStyle,
                            ...(panelType === "detail" ? styles.activeButton : {})
                        }}
                        onClick={() => togglePanel("detail")}
                    >
                        任务详情
                    </Button>

                    {/* 源表 */}
                    <Button
                        type="text" size="mini"
                        style={{
                            ...styles.buttonStyle,
                            ...(panelType === "source" ? styles.activeButton : {})
                        }}
                        onClick={() => togglePanel("source")}
                    >
                        源表
                    </Button>

                    {/* 维表 */}
                    <Button
                        type="text" size="mini"
                        style={{
                            ...styles.buttonStyle,
                            ...(panelType === "dim" ? styles.activeButton : {})
                        }}
                        onClick={() => togglePanel("dim")}
                    >
                        维表
                    </Button>

                    {/* 结果表 */}
                    <Button
                        type="text" size="mini"
                        style={{
                            ...styles.buttonStyle,
                            ...(panelType === "result" ? styles.activeButton : {})
                        }}
                        onClick={() => togglePanel("result")}
                    >
                        结果表
                    </Button>

                    {/* 环境参数 */}
                    <Button
                        type="text" size="mini"
                        style={{
                            ...styles.buttonStyle,
                            ...(panelType === "env" ? styles.activeButton : {})
                        }}
                        onClick={() => togglePanel("env")}
                    >
                        环境参数
                    </Button>
                </div>

            </Layout.Content>
        </Layout >
    );
}

const styles: any = {
    buttonStyle: {
        color: '#4E5969',
        writingMode: 'vertical-rl',   // 关键：文字竖向排列
        textOrientation: 'upright',   // 关键：汉字保持正立，不旋转
        padding: '8px 2px',           // 调整内边距适应竖排
        height: 'auto',               // 高度自适应文字长度
        minWidth: 'unset',            // 移除默认最小宽度限制
        letterSpacing: '4px'
    },
    activeButton: {
        color: '#165DFF',
        // fontWeight: 600,
        backgroundColor: '#E8F3FF'
    }
}
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
    /** 侧边栏状态 */
    const [activePanel, setActivePanel] = useState<
        "source" | "dim" | "result" | "env" | "detail"
    >("source");

    // 
    const activeTaskIdRef = useRef<string | undefined>(activeTaskId);


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
                taskSql: content
            });

            if (!res.data.success) {
                Message.error(res.data.msg || "保存失败");
                onStateChange(taskId, { saving: false });
                return;
            }

            Message.info('保存成功')
            const newTask = res.data.data;
            taskVOMapRef.current[taskId] = newTask

            onStateChange(taskId, { dirty: false, saving: false });

        } catch (err) {
            console.error("保存失败", err);
            Message.error("保存失败");
            onStateChange(taskId, { saving: false });
        }
    };

    const loadModel = async (taskId: string) => {
        if (!editorRef.current) return;
        const token = ++loadTokenRef.current;
        const uri = monaco.Uri.parse(`task://aron.studio.com/${taskId}`);

        if (modelsRef.current.has(taskId)) {
            editorRef.current.setModel(modelsRef.current.get(taskId)!);
            return;
        }

        const existingModel = monaco.editor.getModel(uri);
        if (existingModel) {
            modelsRef.current.set(taskId, existingModel);
            editorRef.current.setModel(existingModel);
            return;
        }

        const currentTaskId = activeTaskId;
        const res = await getTask(projectId, taskId);
        if (currentTaskId !== taskId) return;

        if (token !== loadTokenRef.current) return;

        if (!res.data.success) {
            Message.error(res.data.msg || "获取任务失败");
            return;
        }

        const task = res.data.data;
        const model = monaco.editor.createModel(task.taskSql, "sql", uri);

        modelsRef.current.set(taskId, model);
        taskVOMapRef.current[taskId] = task
        editorRef.current.setModel(model);
        onStateChange(taskId, { dirty: false });
    };

    // 监听taskId变化
    useEffect(() => {
        if (!activeTaskId) return;
        activeTaskIdRef.current = activeTaskId
        loadModel(activeTaskId);
    }, [activeTaskId]);

    // tab 关闭清理
    useEffect(() => {
        modelsRef.current.forEach((model, taskId) => {
            if (!openedTaskIds.includes(taskId)) {
                /** 当前 editor 正在使用 */
                if (editorRef.current?.getModel() === model) {
                    editorRef.current.setModel(null);
                }

                /** dispose model */
                model.dispose();
                modelsRef.current.delete(taskId);

                /** 删除 taskVO */
                delete taskVOMapRef.current[taskId]
            }
        });

    }, [openedTaskIds]);

    // 清理
    useEffect(() => {
        return () => {
            modelsRef.current.forEach(m => m.dispose())
            modelsRef.current.clear()
        }
    }, [])

    // model 挂载
    const handleMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
        // 表名字补全
        initMonacoSQLTables(monaco);

        editorRef.current = editor;

        if (activeTaskId) {
            loadModel(activeTaskId);
        }

        // 注册监听器
        const disposable = editor.onDidChangeModelContent(() => {
            const model = editor.getModel();
            if (!model) return;

            const taskId = model.uri.path.replace("/", "");
            onStateChange(taskId, { dirty: true });
        });

        // ctrl + s 保存
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            const taskId = activeTaskIdRef.current;
            if (taskId) {
                saveTask(taskId);
            }
        });
    };


    return (
        <Layout style={{ height: "100%", width: '100%', borderTop:0}}>

            <Layout.Header
                style={{
                    display: "flex",
                    height: 30,
                    margin:0, padding:0, borderTop:0

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
                    // overflow: "hidden",
                    borderTop: "3px solid #165DFF",
                    paddingTop: 5
                }}
            >
                <div
                    style={{
                        flex: 1,
                        borderRight: "1px solid #eee",
                        minWidth: 0,
                        // overflow: 'hidden'
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
                            automaticLayout: true
                        }}

                    />
                </div>

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
                        style={styles.buttonStyle}
                        onClick={() => setActivePanel("detail")}
                    >
                        任务详情
                    </Button>

                    {/* 源表 */}
                    <Button
                        type="text" size="mini"
                        style={styles.buttonStyle}
                        onClick={() => setActivePanel("source")}
                    >
                        源表
                    </Button>

                    {/* 维表 */}
                    <Button
                        type="text" size="mini"
                        style={styles.buttonStyle}
                        onClick={() => setActivePanel("dim")}
                    >
                        维表
                    </Button>

                    {/* 结果表 */}
                    <Button
                        type="text" size="mini"
                        style={styles.buttonStyle}
                        onClick={() => setActivePanel("result")}
                    >
                        结果表
                    </Button>

                    {/* 环境参数 */}
                    <Button
                        type="text" size="mini"
                        style={styles.buttonStyle}
                        onClick={() => setActivePanel("env")}
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
    iconStyle: {

    }
}
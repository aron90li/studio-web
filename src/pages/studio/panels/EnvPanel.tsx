import { TaskVO } from "../../../types/task";
import { useState, useEffect } from "react";
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';
// 确保配置了 loader，如果主项目已配置可省略
loader.config({ monaco });
interface Props {
    taskVO: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function EnvPanel({
    taskVO,
    onChange
}: Props) {

    if (!taskVO) return null;

    return (
        < div style={{ height: "100%" }}>
            <style>
                {`
                    .monaco-editor .find-widget {
                        left: 0px !important;
                    }
                `}
            </style>
            <Editor
                height="100%"
                key={taskVO.taskId}
                defaultLanguage="sql"
                theme="light"
                defaultValue={taskVO.taskParam} // 初始值
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    padding: { top: 5 }
                }}
                onChange={v => { onChange({ taskParam: v }) }}
            />
        </div>
    )
}
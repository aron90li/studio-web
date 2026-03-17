import { TaskVO } from "../../../types/task";
import { Input, Typography, Message } from '@arco-design/web-react';
import { useState, useEffect } from "react";

const { Title } = Typography;

interface Props {
    taskVO: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function EnvPanel({
    taskVO,
    onChange
}: Props) {

    // 本地文本状态，避免直接修改 taskVO.taskParam
    const [text, setText] = useState(taskVO?.taskParam ?? "")

    // 初始化文本框内容
    useEffect(() => {
        setText(taskVO?.taskParam ?? "")
    }, [taskVO?.taskParam])

    // 文本变化时调用 onChange
    const handleChange = (value: string) => {
        setText(value);
        onChange({ taskParam: value });
    }

    return (
        <div style={{ padding: 6, height:'100%', overflow: 'auto'}}>
            <Title heading={6}>环境参数</Title>
            <Input.TextArea

                value={text}
                onChange={handleChange}
                placeholder="请输入 taskParam 文本"
                style={{ width: "100%", fontFamily: 'monospace' }}
            />
        </div>
    )
}
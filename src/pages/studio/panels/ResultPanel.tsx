import { TaskVO } from "../../../types/task"

interface Props {
    taskVO: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function ResultPanel({
    taskVO,
    onChange
}: Props) {

    return (
        <div style={{ padding: 16 }}>
            结果表配置
        </div>
    )
}
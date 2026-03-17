import { TaskVO } from "../../../types/task"

interface Props {
    taskVO: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function SourcePanel({
    taskVO,
    onChange
}: Props) {

    return (
        <div style={{ padding: 16 }}>
            源表配置
        </div>
    )
}
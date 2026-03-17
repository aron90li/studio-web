import { TaskVO } from "../../../types/task"

interface Props {
    taskVO: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function DimPanel({
    taskVO,
    onChange
}: Props) {

    return (
        <div style={{ padding: 16 }}>
            维表配置
        </div>
    )
}
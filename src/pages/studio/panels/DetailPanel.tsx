import { TaskVO } from "../../../types/task"


interface Props {
    taskVO: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function DetailPanel({
    taskVO,
    onChange
}: Props) {

    return (
        <div style={styles.container}>
            任务详情
            
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {

    container: {
        padding: 16
    }

}
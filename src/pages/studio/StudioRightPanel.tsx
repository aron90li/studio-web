import { TaskVO } from "../../types/task"
import SourcePanel from "./panels/SourcePanel"
import DimPanel from "./panels/DimPanel"
import ResultPanel from "./panels/ResultPanel"
import EnvPanel from "./panels/EnvPanel"
import DetailPanel from "./panels/DetailPanel"

interface Props {
    panelType: "source" | "dim" | "result" | "env" | "detail" | null
    taskVO?: TaskVO
    onChange: (patch: Partial<TaskVO>) => void
}

export default function StudioRightPanel({
    panelType,
    taskVO,
    onChange
}: Props) {

    if (!panelType || !taskVO) return null

    const renderPanel = () => {
        switch (panelType) {
            case "source":
                return <SourcePanel taskVO={taskVO} onChange={onChange} />

            case "dim":
                return <DimPanel taskVO={taskVO} onChange={onChange} />

            case "result":
                return <ResultPanel taskVO={taskVO} onChange={onChange} />

            case "env":
                return <EnvPanel taskVO={taskVO} onChange={onChange} />

            case "detail":
                return <DetailPanel taskVO={taskVO} onChange={onChange} />

            default:
                return null
        }
    }

    return (
        <div style={styles.container}>
            {renderPanel()}
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {

    container: {
        height: '100%',
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 28,             // 不覆盖侧边栏
        width: 420,
        background: "#fff",
        borderLeft: "2px solid #eee",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.06)",
        zIndex: 10,
        // overflow: "hidden"
    }

}
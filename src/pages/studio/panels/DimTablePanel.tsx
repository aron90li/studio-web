import { TaskVO } from '../../../types/task';

interface Props {
    taskVO?: TaskVO;
    onStateChange: (
        taskId: string,
        patch: Partial<{ dirty: boolean; saving: boolean }>
    ) => void;
}

export default function DimTablePanel({ taskVO }: Props) {
    if (!taskVO) {
        return <div style={{ color: '#86909C' }}>未选择任务</div>;
    }

    return (
        <div style={{ color: '#4E5969' }}>
            预留维表面板，可使用 taskVO 里的任意字段。
        </div>
    );
}

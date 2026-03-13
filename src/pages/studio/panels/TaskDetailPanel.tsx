import { TaskVO } from '../../../types/task';

interface Props {
    taskVO?: TaskVO;
    onStateChange: (
        taskId: string,
        patch: Partial<{ dirty: boolean; saving: boolean }>
    ) => void;
}

export default function TaskDetailPanel({ taskVO }: Props) {
    if (!taskVO) {
        return <div style={{ color: '#86909C' }}>未选择任务</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>任务名称：{taskVO.taskName || '-'}</div>
            <div>任务类型：{taskVO.taskType || '-'}</div>
            <div>任务ID：{taskVO.taskId}</div>
            <div>描述：{taskVO.description || '-'}</div>
        </div>
    );
}

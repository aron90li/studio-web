import { Tabs, Tooltip } from '@arco-design/web-react';
import '../../styles/StudioTab.css'

interface Props {
    projectId: string
    activeTaskId?: string
    openedTaskIds: string[]
    taskStateMap: Record<string, { dirty: boolean; saving: boolean }>
    taskMap: Record<string, string>
    onChange: (key: string) => void
    onDelete: (key: string) => void
}

export default function StudioTabs({
    activeTaskId,
    openedTaskIds,
    taskMap,
    taskStateMap,
    onChange,
    onDelete
}: Props) {

    // {taskStateMap[id]?.dirty ? ' *' : ''}

    return (
        <Tabs
            // className="custom-studio-tabs"
            type="card"
            activeTab={activeTaskId}
            editable addButton
            onChange={onChange}     // 传递给父组件，改变url
            onDeleteTab={onDelete}  // 传递给父组件，改变url
            style={{
                width: '100%', overflow: 'hidden',
                height: 35,
                flexShrink: 0,  
            }}

        >
            {openedTaskIds.filter(id => id in taskMap).map(id => {
                const isActive = id === activeTaskId
                return (
                    <Tabs.TabPane
                        key={id}
                        title=
                        {
                            <Tooltip content={taskMap[id]} position="top" mini>
                                <div
                                    style={{
                                        width: 120,
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',

                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'center',
                                        padding: '0 8px', // 可选：增加一点内边距更美观
                                        boxSizing: 'border-box',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {taskMap[id]}
                                    {taskStateMap[id]?.dirty && (
                                        <span style={{
                                            display: 'inline-block',  // 行内块，方便控制尺寸
                                            width: 6,                 // 红点直径
                                            height: 6,                // 红点直径
                                            borderRadius: '50%',      // 圆形
                                            backgroundColor: '#f53f3f', // 红色（Arco 危险色）
                                            marginLeft: 4,            // 和文字的间距
                                            verticalAlign: 'middle',  // 垂直居中对齐文字
                                            flexShrink: 0             // 防止挤压变形（关键）
                                        }} />
                                    )}
                                </div>
                            </Tooltip>
                        }

                    />
                )
            })}
        </Tabs>
    )
}
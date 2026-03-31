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
                                        justifyContent: 'flex-start',
                                        padding: '0 0px', // 可选：增加一点内边距更美观
                                        boxSizing: 'border-box',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                    }}
                                >

                                    {taskStateMap[id]?.dirty && (<span style={{ 
                                        color: '#f53f3f', 
                                        marginRight: 2
                                    }} >●</span>)}
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'left',
                                        minWidth: 0, // 非常关键！允许 flex 子项收缩到内容宽度以下
                                    }}>
                                        {taskMap[id]}
                                    </span>
                                </div>
                            </Tooltip>
                        }

                    />
                )
            })}
        </Tabs>
    )
}
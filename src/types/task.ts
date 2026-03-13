export interface TaskVO {
    taskId: string;
    taskName: string;
    projectId: string;
    description?: string;
    taskType?: string;
    taskParam?: string;
    taskSource?: string;
    taskSide?: string;
    taskSink?: string;
    taskSql?: string;
    taskVersion: number
}

export interface TreeNodeVO {
    nodeId: string;
    projectId: string;
    nodeName: string;
    nodeType: 'folder' | 'task';
    parentNodeId: string;
    taskId?: string;
}

// 右键使用
export interface TreeNodeVOExtend extends TreeNodeVO {
    hasChildren: boolean;
}

// 树节点数据
export interface TreeData extends TreeNodeVO {
    key: string;
    title: React.ReactNode;
    icon: React.ReactNode | null;
    children: TreeData[];
    isLeaf: boolean
}
export interface ProjectVO {
    projectId: string;
    projectName: string;
    projectIdentity: string;
    description: string;
    createUsername: string;
    createUserId: string;
    updateUsername: string;
    updateUserId: string;
    createTime: string;
    updateTime: string;
}

export interface ProjectDetailVO {
    projectId: string;
    detailType: string;
    detailValue: string;
}
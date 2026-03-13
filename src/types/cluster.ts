export interface ClusterVO {
    clusterId: string;
    clusterName: string;
    description: string;
    clusterType: string;
    flinkVersion: string;
    defaultConf: string;
    podTemplate: string;
    kubeconfig: string;
    createUsername: string;
    createUserId: string;
    updateUsername: string;
    updateUserId: string;
    createTime: string;
    updateTime: string;
}
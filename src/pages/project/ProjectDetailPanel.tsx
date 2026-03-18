import { useEffect, useState } from 'react';
import { Drawer, Descriptions, Spin, Message, Empty, Tag } from '@arco-design/web-react';
import { getProjectDetail } from '../../api/project';
import { ProjectVO } from '../../types/project';

interface ProjectDetailPanelProps {
    visible: boolean;
    projectId: string | null;
    onClose: () => void;
}

export default function ProjectDetailPanel({ visible, projectId, onClose }: ProjectDetailPanelProps) {
    const [loading, setLoading] = useState(false);
    const [evnTemplate, setEnvTemplate] = useState<string | null>(null);

    // 当面板打开且 projectId 存在时，加载数据
    useEffect(() => {
        if (visible && projectId) {
            // todo 
            fetchEnvTemplate(projectId);
        } else {
            setEnvTemplate(null);
        }
    }, [visible, projectId]);

    const fetchEnvTemplate = async (id: string) => {
        setLoading(true);
        try {
            const res = await getProjectDetail(id, 'env_template');
            

            if (res.data.success) {
                setEnvTemplate(res.data.data);
            } else {
                Message.error(res.data.msg || '获取详情失败');
                onClose();
            }
        } catch (err) {
            console.error('获取项目详情异常:', err);
            Message.error('网络异常，获取详情失败');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            title="项目详情"
            visible={visible}
            placement="right"
            width="50%" // 占据右边半个屏幕
            onCancel={onClose} // 点击遮罩或关闭图标触发
            footer={null}     // 不需要底部按钮
            closable={true}
        >
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Spin tip="加载中..." />
                </div>
            ) :
                <div>
                    我是panel
                </div>
            }
        </Drawer>
    );
}
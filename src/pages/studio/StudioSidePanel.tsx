import React from 'react';

interface StudioSidePanelProps {
    visible: boolean;
    title: string;
    width?: number;
    rightOffset?: number;
    children?: React.ReactNode;
}

export default function StudioSidePanel({
    visible,
    title,
    width = 360,
    rightOffset = 28,
    children
}: StudioSidePanelProps) {
    return (
        <>
            {visible && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: rightOffset,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.02)',
                        zIndex: 9
                    }}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: rightOffset,
                    bottom: 0,
                    width,
                    transform: visible ? 'translateX(0)' : `translateX(${width}px)`,
                    transition: 'transform 0.2s ease',
                    zIndex: 10,
                    pointerEvents: visible ? 'auto' : 'none'
                }}
            >
                <div
                    style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#fff',
                        borderLeft: '1px solid #eee',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                    }}
                >
                    <div
                        style={{
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            borderBottom: '1px solid #f2f3f5',
                            fontWeight: 600,
                            color: '#1D2129'
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'auto',
                            padding: 12
                        }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}

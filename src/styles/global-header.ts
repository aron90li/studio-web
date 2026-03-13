const globalHeaderStyles = {
    user: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer'
    },

    page_content: {
        padding: 6,
        background: '#f5f6f7',
        height: 'calc(100vh - 56px)' // 减去 header 高度，确保内容区满屏
    }
}

export default globalHeaderStyles
// 登录/注册页通用样式，抽离后所有页面复用
const globalLoginRegisterStyles: any = {
  wrapper: {
    height: '100vh',
    background: 'linear-gradient(135deg,#165DFF,#0FC6C2)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    width: 900,
    height: 480,
    display: 'flex',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,.2)'
  },
  left: {
    flex: 1,
    padding: 40,
    color: '#fff',
    background: 'linear-gradient(160deg,#165DFF,#0FC6C2)',
    display: 'flex',
    flexDirection: 'column'
  },
  card: {
    width: 420,
    padding: '40px 32px'
  },
  captcha: {
    height: 36,
    cursor: 'pointer',
    borderRadius: 4,
    marginLeft: 8,
    width: 80,
    objectFit: 'cover',
  }
}

export default globalLoginRegisterStyles
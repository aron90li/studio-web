import { useEffect, useState } from 'react'
import { UserContext } from './UserContext'
import { getCurrentUser } from '../api/user'
import { clearToken, getToken } from '../utils/auth'
import { UserVO } from '../types/user'
import { Message } from '@arco-design/web-react'

// 用户状态提供者组件，这里不要做跳转逻辑，只设置状态
export function UserProvider({ children }: { children: React.ReactNode }) {
    // 概念	        作用域	             归属层面	    核心用途
    // localStorage	同域名下所有页面共享  浏览器层面	 持久化保存 token（登录凭证）
    // loading	    整个React应用共享	 React全局状态	标识用户信息的加载状态
    // UserProvider	包裹所有组件	     React容器组件	管理并共享 user/loading

    // 因为 UserProvider 包裹了整个 RouterProvider（所有页面）
    // localStorage 是 “域名级全局存储”，用来持久化保存 token，确保页面刷新后还能读取到登录状态
    // user loading 是 “组件级全局状态”，用来存储当前用户信息，供整个应用访问

    const [user, setUser] = useState<UserVO | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const initUser = async () => {
            const token = getToken()
            // 没有 token，直接结束获取用户
            if (!token) {
                setLoading(false)
                return
            }

            try {
                // 有 token，请求用户信息
                const res = await getCurrentUser()
                if (res.data.success) {
                    setUser(res.data.data)
                } else {
                    clearToken()
                    setUser(null)
                    Message.error(res.data.msg || '获取用户失败')
                }
            } catch (err) {
                // 接口报错，有401,request已经弹窗处理，这里可以写处理 403 或者其他的逻辑
                console.error('获取用户失败：', err)
                clearToken()
                setUser(null)
            } finally {
                setLoading(false)
            }
        }

        initUser() // 执行初始化逻辑
    }, []) // 空依赖数组 [] 告诉 React 这个副作用不需要依赖任何状态 / 变量，只需要在组件挂载时执行一次。

    // 用户中心的退出登录功能
    const logout = () => {
        clearToken()
        setUser(null)
        Message.success('已退出登录')
    }

    return (
        <UserContext.Provider value={{ user, loading, setUser, logout }}>
            {children}
        </UserContext.Provider>
    )
}

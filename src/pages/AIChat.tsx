import { useState, useEffect, useRef, useCallback } from 'react'
import { Layout, Button, Avatar, Tag, Typography, Spin, Space, Popconfirm } from '@arco-design/web-react'
import { IconSend, IconPlus, IconDelete, IconRobot, IconUser, IconStop, IconBulb, IconTool } from '@arco-design/web-react/icon'
import { chatStream, getSessions, getSessionMessages, clearSession } from '../api/aiChat'
import type { SessionInfo, DisplayMessage, ChatEvent } from '../types/aiChat'
import { useUser } from '../context/useUser'

const { Sider, Content } = Layout
const { Text, Title } = Typography

// 动画 keyframes 注入（替代已删除的 CSS 文件）
const injectKeyframes = () => {
  if (document.getElementById('ai-chat-kf')) return
  const s = document.createElement('style'); s.id = 'ai-chat-kf'
  s.textContent = [
    '@keyframes dot-bounce{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}',
    '@keyframes event-pulse{0%,100%{background:rgba(77,107,254,.04)}50%{background:rgba(77,107,254,.08)}}',
    '@keyframes msg-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes type-blink{0%,50%{opacity:1}51%,100%{opacity:0}}',
    '.msg-in{animation:msg-enter .3s ease-out}',
    '.tc{display:inline-block;width:2px;height:16px;background:#4d6bfe;margin-left:2px;vertical-align:text-bottom;animation:type-blink .8s step-end infinite}',
    '.ld{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4d6bfe;animation:dot-bounce 1.4s ease-in-out infinite}',
    '.ld.d1{animation-delay:0s}.ld.d2{animation-delay:.2s}.ld.d3{animation-delay:.4s}',
  ].join('\n')
  document.head.appendChild(s)
}

// 加载动画点
const Dots = () => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>{[0, 1, 2].map(i => <span key={i} className={`ld d${i + 1}`} />)}</span>

// 消息事件卡片
const EventCards = ({ events, streaming }: { events: ChatEvent[]; streaming: boolean }) => {
  if (!events?.length) return null
  return <Space direction="vertical" size={4} style={{ marginBottom: 8, width: '100%' }}>
    {events.map((evt, i) => {
      const a = streaming && i === events.length - 1
      const isThink = evt.type === 'THINK', isTool = evt.type === 'TOOL_CALL'
      const c = isThink ? 'arcoblue' : isTool ? 'purple' : 'green'
      const label = isThink ? '思考中' : isTool ? '调用工具' : '工具结果'
      return <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${a ? '#4d6bfe30' : '#f0f0f2'}`, background: a ? '#4d6bfe08' : '#f8f9fb', animation: a ? 'event-pulse 2s ease-in-out infinite' : undefined }}>
        <Tag color={c} style={{ borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {isThink ? <IconBulb /> : isTool ? <IconTool /> : <IconRobot />}<span style={{ marginLeft: 4 }}>{label}</span>
        </Tag>
        <div style={{ flex: 1, minWidth: 0 }}>
          {evt.toolName && <Tag size="small" style={{ marginBottom: 2, fontSize: 11 }}>{evt.toolName}</Tag>}
          <Text style={{ fontSize: 13, color: '#86909c', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, display: 'block' }}>{evt.data}</Text>
        </div>
        {a && <Dots />}
      </div>
    })}
  </Space>
}

// 欢迎页
const Welcome = ({ onAsk }: { onAsk: (t: string) => void }) => {
  const q = ['帮我写一个 React Hook', '解释 Java Stream API', '如何优化 SQL 查询', 'Python 数据分析']
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #4d6bfe, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><IconRobot style={{ fontSize: 30, color: '#fff' }} /></div>
    <Title heading={4} style={{ marginBottom: 8 }}>有什么我可以帮助你的？</Title>
    <Text type="secondary" style={{ marginBottom: 28 }}>基于大语言模型的 AI 智能助手</Text>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
      {q.map((item, i) => <Button key={i} shape="round" size="large" onClick={() => onAsk(item)}>{item}</Button>)}
    </div>
  </div>
}

export default function AIChat() {
  const { user } = useUser()
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sid, setSid] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [hoverSid, setHoverSid] = useState<string | null>(null)

  // Per-session 状态隔离：每个 session 独立的消息、发送状态、abort controller
  const [messagesMap, setMessagesMap] = useState<Record<string, DisplayMessage[]>>({})
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({})
  const abortMapRef = useRef<Record<string, AbortController>>({})

  const endRef = useRef<HTMLDivElement>(null)
  const streamMsgIdRef = useRef<Record<string, string>>({}) // sessionId → 当前流式消息 id
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { injectKeyframes() }, [])
  const scroll = useCallback(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50), [])

  // 当前 session 的派生状态
  const messages = sid ? (messagesMap[sid] || []) : []
  const sending = sid ? (sendingMap[sid] || false) : false

  const focus = () => setTimeout(() => inputRef.current?.focus(), 100)

  // 更新指定 session 的消息列表
  const updateMessagesForSession = useCallback((sessionId: string, fn: (prev: DisplayMessage[]) => DisplayMessage[]) => {
    setMessagesMap(p => ({ ...p, [sessionId]: fn(p[sessionId] || []) }))
  }, [])

  const loadSessions = useCallback(async () => {
    try { const r = await getSessions(); if (r.data.success) setSessions(r.data.data) } catch { /* */ }
  }, [])

  const loadMsgs = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const r = await getSessionMessages(id)
      if (r.data.success) {
        const loaded = r.data.data
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({ id: crypto.randomUUID(), role: m.role as 'user' | 'assistant', content: m.content, timestamp: new Date(m.createTime).getTime() }))
        // 如果服务端返回了消息，但本地 map 中已有更新版本（流式进行中），则不再覆盖
        setMessagesMap(p => {
          const existing = p[id]
          // 如果本地有流式进行中的消息，保留本地版本
          if (existing && existing.some(m => m.isStreaming)) return p
          return { ...p, [id]: loaded }
        })
        scroll()
      }
    } catch { /* */ }
    setLoading(false)
  }, [scroll])

  const select = useCallback((id: string) => {
    if (sid === id) return
    // 不 abort，不重置 sending/messages — 每个 session 独立运行
    setSid(id); loadMsgs(id); focus()
  }, [sid, loadMsgs])

  const newChat = useCallback(() => {
    setSid(undefined); setInput(''); focus()
  }, [])

  const del = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await clearSession(id)
      // 清理该 session 的本地状态
      abortMapRef.current[id]?.abort()
      delete abortMapRef.current[id]
      delete streamMsgIdRef.current[id]
      setMessagesMap(p => { const n = { ...p }; delete n[id]; return n })
      setSendingMap(p => { const n = { ...p }; delete n[id]; return n })
      await loadSessions()
      if (sid === id) newChat()
    } catch { /* */ }
  }, [sid, loadSessions, newChat])

  const stop = useCallback(() => {
    const key = sid || '__new__'
    abortMapRef.current[key]?.abort()
    delete abortMapRef.current[key]
    setSendingMap(p => ({ ...p, [key]: false }))
    updateMessagesForSession(key, prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
  }, [sid, updateMessagesForSession])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    const sessionId: string = sid || crypto.randomUUID()
    if (!sid) {
      setSid(sessionId)
      setSessions(p => [{ sessionId, title: text, messageCount: 0, lastActiveTime: new Date().toISOString() }, ...p])
    }

    setSendingMap(p => ({ ...p, [sessionId]: true }))

    const um: DisplayMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() }
    const am: DisplayMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true, events: [] }
    streamMsgIdRef.current[sessionId] = am.id

    updateMessagesForSession(sessionId, prev => [...prev, um, am])
    if (sessionId === sid) scroll()

    const abort = new AbortController()
    abortMapRef.current[sessionId] = abort
    const events: ChatEvent[] = []

    // upd 始终更新 sessionId 对应的 messagesMap，不管当前是否选中
    const upd = (fn: (m: DisplayMessage) => Partial<DisplayMessage>) => {
      const targetMsgId = streamMsgIdRef.current[sessionId]
      if (!targetMsgId) return
      updateMessagesForSession(sessionId, prev => prev.map(m => m.id === targetMsgId ? { ...m, ...fn(m) } : m))
    }

    chatStream(
      { message: text, sessionId },
      (e) => {
        if (e.type === 'ANSWER') {
          upd(m => ({ content: (m.content || '') + e.data }))
          // 只有当前选中的 session 才自动滚动
          if (sessionId === sid) scroll()
        } else if (['THINK', 'TOOL_CALL', 'TOOL_RESULT'].includes(e.type)) {
          events.push({ type: e.type as ChatEvent['type'], data: e.data, toolName: e.toolName })
          upd(() => ({ events: [...events] }))
        }
      },
      () => {
        setSendingMap(p => ({ ...p, [sessionId]: false }))
        upd(m => ({ content: m.content || '请求失败', isStreaming: false }))
      },
      () => {
        setSendingMap(p => ({ ...p, [sessionId]: false }))
        upd(() => ({ isStreaming: false }))
        loadSessions()
      },
      abort.signal,
    )
  }, [input, sending, sid, loadSessions, scroll, updateMessagesForSession])

  useEffect(() => { loadSessions() }, [loadSessions])

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const fmtTitle = (t: string) => {
    if (!t) return ''
    const d = new Date(t)
    return Date.now() - d.getTime() < 86400000
      ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <Layout style={{ height: '100vh', background: '#f2f3f5' }}>
      <Sider width={280} style={{ background: '#fafafa', borderRight: '1px solid #f0f0f2' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ padding: '20px 16px 14px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4d6bfe, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconRobot style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <Title heading={6} style={{ margin: 0, fontSize: 16 }}>AI Studio</Title>
            </div>
            <Button type="primary" long icon={<IconPlus />} onClick={newChat} style={{ borderRadius: 10 }}>新建对话</Button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <IconRobot style={{ fontSize: 32, color: '#c9cdd4', marginBottom: 10 }} />
                <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>暂无历史对话</Text>
              </div>
            ) : sessions.map(s => (
              <div
                key={s.sessionId}
                onClick={() => select(s.sessionId)}
                onMouseEnter={() => setHoverSid(s.sessionId)}
                onMouseLeave={() => setHoverSid(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: sid === s.sessionId ? '#e8f0fe' : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text ellipsis style={{ fontSize: 13, fontWeight: sid === s.sessionId ? 600 : 400, display: 'block' }}>
                    {s.title || '新对话'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{s.messageCount} 条 · {fmtTitle(s.lastActiveTime)}</Text>
                </div>
                <Popconfirm title="确定删除该对话？" onOk={() => del(s.sessionId)} onCancel={(e: any) => e?.stopPropagation()} position="right">
                  <Button
                    size="mini" type="text" icon={<IconDelete />}
                    style={{ opacity: hoverSid === s.sessionId ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
                    onClick={(e: any) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))}

          </div>
        </div>
      </Sider>
      <Content style={{ display: 'flex', flexDirection: 'column', background: '#f2f3f5' }}>
        {/* 用户信息 - 右上角 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px', flexShrink: 0 }}>
          <Space>
            <Avatar size={32} style={{ background: 'linear-gradient(135deg, #4d6bfe, #8b5cf6)' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <Text style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>{user?.username || '未登录'}</Text>
            </div>
          </Space>
        </div>

        {/* 消息区域 */}
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 8 }}>
          {messages.length === 0 && !loading ? (
            <Welcome onAsk={(t) => { setInput(t); focus() }} />
          ) : (
            <>
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 16 }}>
                  <Spin size={28} />
                  <Text type="secondary" style={{ fontSize: 13 }}>加载消息中...</Text>
                </div>
              )}
              {messages.map((msg, idx) => {
                const u = msg.role === 'user'
                const last = idx === messages.length - 1
                return (
                  <div key={msg.id} className={last ? 'msg-in' : ''} style={{ display: 'flex', gap: 12, padding: '16px 24px', maxWidth: 820, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexDirection: u ? 'row-reverse' : 'row' }}>
                    <Avatar size={34} style={{ flexShrink: 0, marginTop: 2, background: u ? 'linear-gradient(135deg, #4d6bfe, #3b5de7)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                      {u ? <IconUser /> : <IconRobot />}
                    </Avatar>
                    <div style={{ maxWidth: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column', alignItems: u ? 'flex-end' : 'flex-start' }}>
                      {!u && msg.events && msg.events.length > 0 && <EventCards events={msg.events} streaming={msg.isStreaming || false} />}
                      {msg.content ? (
                        <div style={{ padding: '12px 16px', borderRadius: u ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: u ? '#4d6bfe' : '#ffffff', color: u ? '#fff' : '#1d2129', border: u ? 'none' : '1px solid #f0f0f2', lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}{msg.isStreaming && <span className="tc" />}
                        </div>
                      ) : msg.isStreaming ? (
                        <div style={{ padding: '12px 24px', borderRadius: '14px 14px 14px 4px', background: '#fff', border: '1px solid #f0f0f2' }}><Dots /></div>
                      ) : null}
                      <Text type="secondary" style={{ fontSize: 11, marginTop: 4, padding: '0 4px' }}>{fmtTime(msg.timestamp)}</Text>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} style={{ height: 1 }} />
            </>
          )}
        </div>

        {/* 输入框 */}
        <div style={{ padding: '0 24px 20px', flexShrink: 0 }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fff', borderRadius: 16, padding: '8px 8px 8px 18px', border: `2px solid ${input.trim() ? '#4d6bfe' : '#e5e6eb'}` }}>
            <textarea
              ref={inputRef}
              placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: 14, lineHeight: 1.6, color: '#1d2129', padding: '4px 0', fontFamily: 'inherit', maxHeight: 180 }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 180) + 'px' }}
            />
            {sending ? (
              <Button icon={<IconStop />} shape="circle" onClick={stop} style={{ flexShrink: 0, color: '#f53f3f' }} />
            ) : (
              <Button type="primary" icon={<IconSend />} shape="circle" onClick={send} style={{ flexShrink: 0 }} disabled={!input.trim()} />
            )}
          </div>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 11, marginTop: 10 }}>
            AI 回复仅供参考，请验证重要信息的准确性
          </Text>
        </div>
      </Content>
    </Layout>
  )
}
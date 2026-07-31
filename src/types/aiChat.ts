/** AI Agent 聊天请求 */
export interface AgentChatRequest {
  message: string
  sessionId?: string
}

/** SSE 流式事件 */
export interface AgentChatEvent {
  type: 'THINK' | 'TOOL_CALL' | 'TOOL_RESULT' | 'ANSWER' | 'ERROR' | 'DONE'
  data: string
  sessionId: string
  toolName?: string
}

/** 阻塞聊天响应 */
export interface AgentChatResponse {
  answer: string
  sessionId: string
  thoughtProcess: ThoughtStep[]
  finished: boolean
}

export interface ThoughtStep {
  type: string
  content: string
  toolName?: string
}

/** 会话概要信息 */
export interface SessionInfo {
  sessionId: string
  title: string
  messageCount: number
  lastActiveTime: string
}

/** 聊天消息 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  createTime: string
}

/** 通用 API 响应 */
export interface ApiResponse<T> {
  data: T
  success: boolean
  msg: string
  code: number
}

/** 中间事件 */
export interface ChatEvent {
  type: 'THINK' | 'TOOL_CALL' | 'TOOL_RESULT' | 'DONE'
  data: string
  toolName?: string
}

/** 前端展示用的消息 */
export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
  events?: ChatEvent[]
}
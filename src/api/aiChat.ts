import request from '../utils/request'
import type { AgentChatRequest, AgentChatResponse, SessionInfo, ChatMessage, ApiResponse } from '../types/aiChat'
import type { AxiosResponse } from 'axios'
import { API_BASE } from '../utils/constants'

const BASE_URL = '/api/ai/v2'

/**
 * SSE 流式对话
 * 使用 fetch 读取 EventStream，直接指向后端地址
 */
export function chatStream(
  data: AgentChatRequest,
  onEvent: (event: { type: string; data: string; sessionId: string; toolName?: string }) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
  signal?: AbortSignal
): void {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  fetch(`${API_BASE}${BASE_URL}/chatStream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            onEvent(event)

            if (event.type === 'DONE') {
              onComplete()
              return
            }
            if (event.type === 'ERROR') {
              onError(new Error(event.data || 'AI 响应异常'))
              return
            }
          } catch {
            // 非 JSON 数据忽略
            console.warn('Failed to parse SSE event:', jsonStr)
          }
        }
      }
    }
    onComplete()
  }).catch((err) => {
    if (err.name === 'AbortError') return
    onError(err)
  })
}

/**
 * 阻塞聊天（降级备选）
 */
export function chat(data: AgentChatRequest): Promise<AxiosResponse<ApiResponse<AgentChatResponse>>> {
  return request.post(`${BASE_URL}/chat`, data)
}

/**
 * 获取当前用户的会话列表
 */
export function getSessions(): Promise<AxiosResponse<ApiResponse<SessionInfo[]>>> {
  return request.get(`${BASE_URL}/sessions`)
}

/**
 * 获取某个会话的完整历史消息
 */
export function getSessionMessages(sessionId: string): Promise<AxiosResponse<ApiResponse<ChatMessage[]>>> {
  return request.get(`${BASE_URL}/sessions/${sessionId}`)
}

/**
 * 清空某个会话历史
 */
export function clearSession(sessionId: string): Promise<AxiosResponse<ApiResponse<null>>> {
  return request.delete(`${BASE_URL}/sessions/${sessionId}`)
}
import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Send, RefreshCw, Settings, ChevronDown, X, Check, User, Sparkles, ChevronRight, ThumbsUp, ThumbsDown, Copy, Square, ArrowUp } from 'lucide-react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'

import nginx from 'highlight.js/lib/languages/nginx'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import csharp from 'highlight.js/lib/languages/csharp'
import cpp from 'highlight.js/lib/languages/cpp'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  thoughts?: string
  showThoughts?: boolean
  isThinking?: boolean
}

interface ApiConfig {
  id: string
  name: string
  endpoint: string
  apiKey: string
  isActive: boolean
}

type PendingAction =
  | { type: 'pageSummary'; content: { title: string; url: string; content: string } }
  | { type: 'summary' | 'chat' | 'translate'; text: string }

function splitThoughtAndAnswer(text: string) {
  const thinkStart = '<think>'
  const thinkEnd = '</think>'

  let thoughts = ''
  let answer = text
  let isThinking = false
  let hasOpenThink = false
  let hasCloseThink = false

  const startIndex = text.indexOf(thinkStart)
  const endIndex = text.indexOf(thinkEnd)

  if (startIndex !== -1) {
    hasOpenThink = true
    if (endIndex !== -1) {
      hasCloseThink = true
      thoughts = text.substring(startIndex + thinkStart.length, endIndex)
      answer = text.substring(0, startIndex) + text.substring(endIndex + thinkEnd.length)
    } else {
      isThinking = true
      thoughts = text.substring(startIndex + thinkStart.length)
      answer = text.substring(0, startIndex)
    }
  }

  return { thoughts, answer, isThinking, hasOpenThink, hasCloseThink }
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean
  className?: string
  children?: React.ReactNode
  node?: any
}

function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false)

  const getNodeText = (node: React.ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') {
      return node.toString()
    }
    if (Array.isArray(node)) {
      return node.map(getNodeText).join('')
    }
    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<{ children?: React.ReactNode }>
      if (element.props.children) {
        return getNodeText(element.props.children)
      }
    }
    return ''
  }

  const isBlock = /language-/.test(className || '')

  if (!isBlock) {
    return <code className={`md-code ${className || ''}`} {...props}>{children}</code>
  }

  const match = /language-(\w+)/.exec(className || '')
  const lang = match ? match[1] : 'text'
  const codeText = getNodeText(children)

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <button onClick={handleCopy} className="code-copy-btn">
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          {isCopied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className={`md-pre`}>
        <code className={className} {...props}>{children}</code>
      </pre>
    </div>
  )
}

interface MessageItemProps {
  message: Message
  onToggleThoughts?: (id: string) => void
  setMagnifiedImage: (src: string | null) => void
}

function MessageItem({ message, onToggleThoughts, setMagnifiedImage }: MessageItemProps) {
  const isUser = message.role === 'user'

  const components: Components = {
    code: CodeBlock,
    pre: ({ children }) => <>{children}</>,
    a: ({ node, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer" className="md-link" />
    ),
    p: ({ children }) => (
      <p className="md-p">{children}</p>
    ),
    h1: ({ children }) => <h1 className="md-h">{children}</h1>,
    h2: ({ children }) => <h2 className="md-h">{children}</h2>,
    h3: ({ children }) => <h3 className="md-h">{children}</h3>,
    h4: ({ children }) => <h4 className="md-h">{children}</h4>,
    h5: ({ children }) => <h5 className="md-h">{children}</h5>,
    h6: ({ children }) => <h6 className="md-h">{children}</h6>,
    img: ({ node, src, alt, ...props }) => (
      <img
        src={src}
        alt={alt}
        {...props}
        onClick={() => src && setMagnifiedImage(src)}
      />
    )
  }

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>

      <div className="message-content">
        {!isUser && (message.thoughts || message.isThinking) && (
          <div className="thinking-section">
            <div
              className="thinking-header"
              onClick={() => onToggleThoughts && onToggleThoughts(message.id)}
            >
              {message.showThoughts ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>深度思考过程</span>
              {message.isThinking && <span className="thinking-indicator">思考中...</span>}
            </div>

            {message.showThoughts && (
              <div className="thinking-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[
                    rehypeRaw,
                    rehypeKatex,
                    [rehypeHighlight as any, {
                      languages: {
                        nginx, json, bash, python, javascript, typescript,
                        xml, css, sql, yaml, dockerfile, go, java, csharp, cpp
                      },
                      ignoreMissing: true
                    }]
                  ]}
                  components={components}
                >
                  {message.thoughts || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        <div className="message-text">
          {isUser ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[
                rehypeRaw,
                rehypeKatex,
                [rehypeHighlight as any, {
                  languages: {
                    nginx, json, bash, python, javascript, typescript,
                    xml, css, sql, yaml, dockerfile, go, java, csharp, cpp
                  },
                  ignoreMissing: true
                }]
              ]}
              components={components}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <div className="assistant-bubble">
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[
                    rehypeRaw,
                    rehypeKatex,
                    [rehypeHighlight as any, {
                      languages: {
                        nginx, json, bash, python, javascript, typescript,
                        xml, css, sql, yaml, dockerfile, go, java, csharp, cpp
                      },
                      ignoreMissing: true
                    }]
                  ]}
                  components={components}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <div className="loading-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>

        {!isUser && !message.isThinking && message.content && (
          <div className="message-actions">
            <button className="action-btn" title="复制">
              <Copy size={14} onClick={() => navigator.clipboard.writeText(message.content)} />
            </button>
            <button className="action-btn" title="赞">
              <ThumbsUp size={14} />
            </button>
            <button className="action-btn" title="踩">
              <ThumbsDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SidePanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [currentApi, setCurrentApi] = useState<ApiConfig | null>(null)
  const [showApiSelector, setShowApiSelector] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [magnifiedImage, setMagnifiedImage] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamMessageMap = useRef<Record<string, string>>({})
  const streamBufferMap = useRef<Record<string, string>>({})
  const shouldScrollToBottom = useRef(true)
  const apiSelectorRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return

    const cs = getComputedStyle(el)
    const lineHeight = parseFloat(cs.lineHeight || '20') || 20
    const padTop = parseFloat(cs.paddingTop || '0') || 0
    const padBottom = parseFloat(cs.paddingBottom || '0') || 0
    const borderWidth = parseFloat(cs.borderTopWidth || '0') + parseFloat(cs.borderBottomWidth || '0') || 2

    const min = padTop + padBottom + lineHeight
    const max = padTop + padBottom + borderWidth + lineHeight * 8

    el.style.height = `${min}px`
    const contentHeight = el.scrollHeight

    const next = Math.min(Math.max(contentHeight, min), max)
    el.style.height = `${next}px`

    const overflow = contentHeight > max ? 'auto' : 'hidden'
    el.style.overflowY = overflow

    if (overflow === 'auto') {
      el.scrollTop = el.scrollHeight
    }
  }

  const resetHeight = () => {
    const el = textareaRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.height = '40px'
      el.scrollTop = 0
      el.offsetHeight
      el.style.transition = ''
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [inputText])

  useEffect(() => {
    const handleFocus = () => setTimeout(resetHeight, 100)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          resetHeight()
          if (textareaRef.current) adjustHeight()
        }, 100)
      }
    }
    const handleBeforeUnload = () => resetHeight()

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    resetHeight()

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const loadApiConfigs = async () => {
    try {
      const configs = await chrome.runtime.sendMessage({ action: 'getApiConfigs' })
      setApiConfigs(configs || [])
    } catch (error) {
      console.error('Failed to load API configs:', error)
    }
  }

  const loadCurrentApi = async () => {
    try {
      const [configs, settings] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'getApiConfigs' }),
        chrome.runtime.sendMessage({ action: 'getSettings' })
      ])

      const activeApi = configs?.find((api: ApiConfig) => api.id === settings?.currentApiId)
      setCurrentApi(activeApi || null)
    } catch (error) {
      console.error('Failed to load current API:', error)
    }
  }

  const switchApi = async (apiId: string) => {
    try {
      const settings = await chrome.runtime.sendMessage({ action: 'getSettings' })
      const newSettings = { ...settings, currentApiId: apiId }

      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      })

      await loadCurrentApi()
      setShowApiSelector(false)
    } catch (error) {
      console.error('Failed to switch API:', error)
    }
  }

  useEffect(() => {
    loadApiConfigs()
    loadCurrentApi()

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'sync') {
        if (changes.apiConfigs) {
          loadApiConfigs()
          loadCurrentApi()
        }
        if (changes.settings) {
          loadCurrentApi()
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      scrollToBottom()
    }
    shouldScrollToBottom.current = false
  }, [messages])

  const clearMessages = () => {
    setMessages([])
    setPendingAction(null)
  }

  const startStreaming = async (message: string, assistantMessageId: string) => {
    if (!currentApi) return
    
    // Create a new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)
    
    const streamId = Date.now().toString() + Math.random().toString(36).slice(2, 8)
    streamMessageMap.current[streamId] = assistantMessageId
    streamBufferMap.current[streamId] = ''

    try {
      await chrome.runtime.sendMessage({
        action: 'callDifyAPIStream',
        endpoint: currentApi.endpoint,
        apiKey: currentApi.apiKey,
        message,
        streamId
      })
    } catch (error: any) {
      // Check if the error is due to aborting
      if (error.name === 'AbortError') {
        console.log('Request was aborted')
        setIsLoading(false)
        setAbortController(null)
        return
      }
      
      console.error('Failed to start streaming:', error)
      setIsLoading(false)
      setAbortController(null)
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: 'Failed to start request.' }
          : m
      ))
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentApi) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    }

    shouldScrollToBottom.current = true
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      thoughts: '',
      showThoughts: true
    }

    shouldScrollToBottom.current = true
    setMessages(prev => [...prev, assistantMessage])

    await startStreaming(content, assistantMessage.id)
  }

  const processPendingAction = async () => {
    if (!pendingAction || !currentApi) return

    const needStreaming = pendingAction.type !== 'pageSummary'
    if (needStreaming) setIsLoading(true)

    try {
      if (pendingAction.type === 'pageSummary') {
        const { title, url, content } = pendingAction.content
        const summaryPrompt = `请总结以下网页内容：\n标题：${title}\n网址：${url}\n内容：${content}\n\n请提供一个简洁的摘要，突出主要观点和关键信息。`
        const userContent = `总结内容\n网址：${url}`

        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: userContent,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          thoughts: '',
          showThoughts: true
        }
        shouldScrollToBottom.current = true
        setMessages(prev => [...prev, assistantMessage])
        await startStreaming(summaryPrompt, assistantMessage.id)

      } else {
        const { type, text } = pendingAction
        let prompt = ''
        const labelMap: Record<string, string> = {
          summary: 'AI解读',
          chat: '对话',
          translate: '翻译'
        }

        switch (type) {
          case 'summary':
            prompt = `请总结以下文本：\n\n${text}`
            break
          case 'chat':
            prompt = `基于以下文本进行交流并提出关键洞见：\n\n${text}`
            break
          case 'translate':
            prompt = `请将以下文本翻译成中文：\n\n${text}`
            break
        }

        const shown = text.length > 800 ? text.slice(0, 800) + '…' : text
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `${labelMap[type] || '处理文本'}\n${shown}`,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          thoughts: '',
          showThoughts: true
        }
        shouldScrollToBottom.current = true
        setMessages(prev => [...prev, assistantMessage])
        await startStreaming(prompt, assistantMessage.id)
      }
    } catch (error) {
      console.error('Failed to process pending action:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了错误。请检查API配置是否正确。',
        timestamp: Date.now()
      }
      shouldScrollToBottom.current = true
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setPendingAction(null)
    }
  }

  useEffect(() => {
    if (pendingAction && currentApi) {
      processPendingAction()
    }
  }, [pendingAction, currentApi])

  useEffect(() => {
    const handleMessage = (request: any, sender: any, sendResponse: any) => {
      switch (request.action) {
        case 'processPageSummary':
          if (request.data && typeof request.data === 'object') {
            setPendingAction({ type: 'pageSummary', content: request.data })
          }
          sendResponse({ success: true })
          break

        case 'processSelectedText':
          if (request.data && typeof request.data === 'object') {
            setPendingAction(request.data as PendingAction)
          }
          sendResponse({ success: true })
          break

        case 'streamChunk': {
          const id = streamMessageMap.current[request.streamId]
          if (id) {
            const buf = (streamBufferMap.current[request.streamId] || '') + request.text
            streamBufferMap.current[request.streamId] = buf

            const { thoughts, answer, isThinking, hasOpenThink, hasCloseThink } = splitThoughtAndAnswer(buf)
            const thinkEnded = hasCloseThink && !hasOpenThink

            setMessages(prev => prev.map(m => {
              if (m.id === id) {
                const shouldShowThoughts = thoughts.length > 0 || isThinking || hasOpenThink
                return {
                  ...m,
                  content: answer,
                  thoughts,
                  showThoughts: shouldShowThoughts && !thinkEnded,
                  isThinking
                }
              }
              return m
            }))
          }
          sendResponse({ success: true })
          break
        }

        case 'streamDone': {
          const id = streamMessageMap.current[request.streamId]
          if (id) {
            setMessages(prev => prev.map(m => {
              if (m.id === id) {
                return { ...m, showThoughts: false, isThinking: false }
              }
              return m
            }))
            delete streamMessageMap.current[request.streamId]
            delete streamBufferMap.current[request.streamId]
          }
          // Always set isLoading to false when stream is done
          setIsLoading(false)
          setAbortController(null)
          sendResponse({ success: true })
          break
        }

        case 'streamError': {
          const id = streamMessageMap.current[request.streamId]
          if (id) {
            setMessages(prev => prev.map(m => 
              m.id === id ? { 
                ...m, 
                content: m.content || '', 
                isThinking: false,
                showThoughts: false
              } : m
            ))
            delete streamMessageMap.current[request.streamId]
            delete streamBufferMap.current[request.streamId]
          }
          // Always set isLoading to false when stream has an error
          setIsLoading(false)
          setAbortController(null)
          sendResponse({ success: true })
          break
        }
      }
      return true
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  useEffect(() => {
    const loadInitialData = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const dataParam = urlParams.get('data')

        if (dataParam) {
          const data = JSON.parse(decodeURIComponent(dataParam))
          if (data && typeof data === 'object' && 'type' in data) {
            setPendingAction(data as PendingAction)
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }
    loadInitialData()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading || !currentApi) return
    sendMessage(inputText.trim())
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const onToggleThoughts = (id: string) => {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, showThoughts: !m.showThoughts } : m
    ))
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = !!apiSelectorRef.current && apiSelectorRef.current.contains(target)
      const inDropdown = !!dropdownRef.current && dropdownRef.current.contains(target)
      if (!inTrigger && !inDropdown) setShowApiSelector(false)
    }

    if (showApiSelector) {
      document.addEventListener('click', handler)
    }

    return () => document.removeEventListener('click', handler)
  }, [showApiSelector])

  return (
    <div className="sidepanel-container">
      <div className="sidepanel-header">
        <div className="header-left">
          <div>
            <div className="header-subtitle-container" ref={apiSelectorRef}>
              <button
                className="switch-api-btn"
                onClick={() => setShowApiSelector(!showApiSelector)}
                title="应用"
                aria-expanded={showApiSelector}
              >
                {currentApi ? currentApi.name : '未配置应用'}
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="header-btn"
            onClick={clearMessages}
            title="清空对话"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="header-btn"
            onClick={() => chrome.runtime.openOptionsPage()}
            title="设置"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {showApiSelector && (
        <div className="api-selector-dropdown" ref={dropdownRef}>
          <div className="api-selector-header">
            <h3>应用</h3>
            <button
              className="close-selector-btn"
              onClick={() => setShowApiSelector(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="api-list">
            {apiConfigs.map((api) => (
              <div
                key={api.id}
                className={`api-item ${api.id === currentApi?.id ? 'active' : ''}`}
                onClick={() => switchApi(api.id)}
              >
                <div className="api-item-info">
                  <div className="api-item-name">{api.name}</div>
                  <div className="api-item-endpoint">{api.endpoint}</div>
                </div>
                {api.id === currentApi?.id && (
                  <Check size={16} className="api-item-check" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👋</div>
            <h3>你好！我是你的 AI 助手</h3>
            <p>我可以帮你总结网页、解答问题、翻译文本等。</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onToggleThoughts={onToggleThoughts}
                setMagnifiedImage={setMagnifiedImage}
              />
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="input-field"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!currentApi ? "请先配置应用..." : "输入消息..."}
              disabled={!currentApi || isLoading}
              rows={1}
            />
            {isLoading ? (
              <button
                type="button"
                className="abort-btn pulse"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (abortController) {
                    abortController.abort();
                    setIsLoading(false);
                    setAbortController(null);
                    
                    // Also clear any pending stream data
                    const streamIds = Object.keys(streamMessageMap.current);
                    for (const streamId of streamIds) {
                      // Notify background to cancel the stream
                      chrome.runtime.sendMessage({ 
                        action: 'cancelStream', 
                        streamId 
                      });
                      delete streamMessageMap.current[streamId];
                      delete streamBufferMap.current[streamId];
                    }
                  }
                }}
              >
                <div className="stop-icon" />
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn"
                disabled={!inputText.trim() || !currentApi}
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {magnifiedImage && (
        <div
          className="image-magnifier-overlay"
          onClick={() => setMagnifiedImage(null)}
        >
          <img src={magnifiedImage} alt="Magnified" />
          <button className="close-magnifier">
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  )
}

export default SidePanel

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>,
)

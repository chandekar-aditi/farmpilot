import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import client from '../../../api/client'
import useProjectStore from '../../../store/projectStore'

const SUGGESTED_PROMPTS = [
  'What should I check today?',
  'How do I mix nutrients for this phase?',
  'My leaves are yellowing, what\'s wrong?',
  'When do I harvest?',
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-base">
        🌿
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-green-400 block"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SourceChips({ sources }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map((src, i) => (
        <span
          key={i}
          className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100"
        >
          {typeof src === 'string' ? src : src.title ?? src.name ?? JSON.stringify(src)}
        </span>
      ))}
    </div>
  )
}

function WordReveal({ text, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const words = useRef(text.split(' '))
  const idx = useRef(0)

  useEffect(() => {
    idx.current = 0
    setDisplayed('')
    words.current = text.split(' ')
    const interval = setInterval(() => {
      if (idx.current >= words.current.length) {
        clearInterval(interval)
        onDone?.()
        return
      }
      setDisplayed((prev) => (prev ? prev + ' ' + words.current[idx.current] : words.current[idx.current]))
      idx.current += 1
    }, 40)
    return () => clearInterval(interval)
  }, [text])

  return <span>{displayed}</span>
}

function BotMessage({ msg, isLatest }) {
  const [revealed, setRevealed] = useState(!isLatest)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-end gap-3 mb-4"
    >
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-base self-start mt-1">
        🌿
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-[75%]">
        <p className="text-sm text-gray-800 leading-relaxed">
          {isLatest && !revealed ? (
            <WordReveal text={msg.content} onDone={() => setRevealed(true)} />
          ) : (
            msg.content
          )}
        </p>
        <SourceChips sources={msg.sources} />
        <span className="text-xs text-gray-400 mt-1 block">
          {new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

function UserMessage({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-end mb-4"
    >
      <div className="bg-green-700 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm max-w-[75%]">
        <p className="text-sm leading-relaxed">{msg.content}</p>
        <span className="text-xs text-green-200 mt-1 block text-right">
          {new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

function ContextStrip({ project, collapsed, onToggle }) {
  if (!project) return null

  const chips = [
    project.crop_name && { label: `🌱 ${project.crop_name}` },
    project.environment && { label: `🏠 ${project.environment}` },
    project.kit_count != null && { label: `📦 ${project.kit_count} kits` },
    project.current_day != null && { label: `📅 Day ${project.current_day}` },
  ].filter(Boolean)

  return (
    <div className="bg-green-50 border border-green-100 rounded-2xl overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-100 transition-colors"
      >
        <span>Project Context</span>
        <span className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1 rounded-full font-medium"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ChatBot() {
  const { activeProject } = useProjectStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [typing, setTyping] = useState(false)
  const [contextCollapsed, setContextCollapsed] = useState(false)
  const [latestBotIndex, setLatestBotIndex] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!activeProject?.id) return
    client.get(`/chat?project_id=${activeProject.id}`)
      .then((res) => {
        const history = res.data?.messages ?? res.data ?? []
        setMessages(history)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeProject?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = useCallback(async (text) => {
    const msgText = (text ?? input).trim()
    if (!msgText) return

    const userMsg = {
      role: 'user',
      content: msgText,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setTyping(true)

    try {
      const res = await client.post('/chat', {
        message: msgText,
        project_id: activeProject?.id,
      })
      const botMsg = {
        role: 'assistant',
        content: res.data?.reply ?? res.data?.message ?? res.data?.content ?? '',
        sources: res.data?.sources ?? [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => {
        const next = [...prev, botMsg]
        setLatestBotIndex(next.length - 1)
        return next
      })
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        sources: [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setTyping(false)
    }
  }, [input, activeProject?.id])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const showSuggestions = messages.length === 0 && !loading

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Context Strip */}
      <ContextStrip
        project={activeProject}
        collapsed={contextCollapsed}
        onToggle={() => setContextCollapsed((c) => !c)}
      />

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading conversation…</span>
          </div>
        ) : (
          <>
            {/* Suggested Prompts */}
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 py-8 px-4"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-2">
                  🌿
                </div>
                <p className="text-gray-600 font-medium text-center">
                  Hi! I'm your FarmBot. Ask me anything about your grow.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      className="text-sm bg-white border border-green-200 text-green-700 px-4 py-2 rounded-xl hover:bg-green-50 transition-colors shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <UserMessage key={i} msg={msg} />
              ) : (
                <BotMessage key={i} msg={msg} isLatest={i === latestBotIndex} />
              )
            )}

            {/* Typing Indicator */}
            {typing && <TypingIndicator />}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-gray-200 bg-white pt-3 pb-1">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400 focus-within:border-transparent transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your grow…"
            disabled={typing}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="w-9 h-9 rounded-xl bg-green-700 hover:bg-green-800 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

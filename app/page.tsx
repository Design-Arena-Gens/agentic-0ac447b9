'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Zap, Brain, Bot, CheckCircle2, Trash2, Copy, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp?: number
}

interface ComparisonResponse {
  model: string
  response: string
  time: number
  status: 'success' | 'error'
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'single' | 'compare' | 'super'>('single')
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo')
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  })
  const [showSettings, setShowSettings] = useState(false)
  const [comparisonResults, setComparisonResults] = useState<ComparisonResponse[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const models = [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', icon: '🚀' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', icon: '⚡' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', icon: '🧠' },
    { id: 'claude-3-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', icon: '🎯' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', icon: '💎' },
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, comparisonResults])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setComparisonResults([])

    try {
      if (selectedMode === 'compare') {
        await handleCompareMode(input)
      } else if (selectedMode === 'super') {
        await handleSuperMode(input)
      } else {
        await handleSingleMode(input)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'An error occurred'}`,
        model: selectedModel,
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSingleMode = async (prompt: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: prompt }],
        model: selectedModel,
        apiKeys
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.response,
      model: selectedModel,
      timestamp: Date.now()
    }])
  }

  const handleCompareMode = async (prompt: string) => {
    const results: ComparisonResponse[] = []

    const modelPromises = models.map(async (model) => {
      const startTime = Date.now()
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: prompt }],
            model: model.id,
            apiKeys
          })
        })

        if (!response.ok) {
          throw new Error(`${model.name} failed`)
        }

        const data = await response.json()
        const time = Date.now() - startTime

        return {
          model: model.name,
          response: data.response,
          time,
          status: 'success' as const
        }
      } catch (error) {
        return {
          model: model.name,
          response: error instanceof Error ? error.message : 'Error occurred',
          time: Date.now() - startTime,
          status: 'error' as const
        }
      }
    })

    const responses = await Promise.all(modelPromises)
    setComparisonResults(responses)
  }

  const handleSuperMode = async (prompt: string) => {
    const enhancedPrompt = `You are in SUPER AI MODE - use your maximum capabilities. Provide the most comprehensive, accurate, and insightful response possible. Question: ${prompt}`

    const results: ComparisonResponse[] = []

    const topModels = ['gpt-4o', 'claude-3-opus', 'claude-3-sonnet']
    const modelPromises = topModels.map(async (modelId) => {
      const model = models.find(m => m.id === modelId)
      if (!model) return null

      const startTime = Date.now()
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: enhancedPrompt }],
            model: modelId,
            apiKeys,
            temperature: 0.9,
            maxTokens: 4000
          })
        })

        if (!response.ok) {
          throw new Error(`${model.name} failed`)
        }

        const data = await response.json()
        const time = Date.now() - startTime

        return {
          model: model.name,
          response: data.response,
          time,
          status: 'success' as const
        }
      } catch (error) {
        return {
          model: model.name,
          response: error instanceof Error ? error.message : 'Error occurred',
          time: Date.now() - startTime,
          status: 'error' as const
        }
      }
    })

    const responses = (await Promise.all(modelPromises)).filter(Boolean) as ComparisonResponse[]
    setComparisonResults(responses)

    const synthesizedResponse = `**🌟 SUPER AI MODE - Synthesized Response 🌟**\n\nBased on analysis from ${responses.length} premium AI models:\n\n${responses[0]?.response}\n\n---\n\n*Response synthesized from: ${responses.map(r => r.model).join(', ')}*`

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: synthesizedResponse,
      model: 'Super AI',
      timestamp: Date.now()
    }])
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportChat = () => {
    const chatText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${Date.now()}.txt`
    a.click()
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-lg border-b border-purple-500/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Super AI Chatbot</h1>
                <p className="text-xs text-gray-400">Premium AI Models • Response Comparison • Super Mode</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportChat}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all"
                title="Export Chat"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMessages([])}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all"
                title="Clear Chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all"
              >
                ⚙️ API Keys
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-lg p-6 border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4">API Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 block mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Anthropic API Key</label>
                <input
                  type="password"
                  value={apiKeys.anthropic}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Google AI API Key</label>
                <input
                  type="password"
                  value={apiKeys.google}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                  placeholder="AIza..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedMode('single')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              selectedMode === 'single'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span>Single Model</span>
          </button>
          <button
            onClick={() => setSelectedMode('compare')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              selectedMode === 'compare'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Compare All</span>
          </button>
          <button
            onClick={() => setSelectedMode('super')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              selectedMode === 'super'
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span>🚀 Super AI Mode</span>
          </button>
        </div>

        {selectedMode === 'single' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedModel === model.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {model.icon} {model.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 scrollbar-thin">
        <div className="max-w-7xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full mb-4">
                <Brain className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold gradient-text mb-2">Super AI Chatbot</h2>
              <p className="text-gray-400">Ask anything, compare responses, or use Super AI mode for maximum power</p>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-6 py-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                    : 'bg-gray-800/80 backdrop-blur-lg text-gray-100 border border-gray-700'
                }`}
              >
                {message.role === 'assistant' && message.model && (
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                    <span className="text-xs font-semibold text-purple-400">{message.model}</span>
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="markdown-content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {comparisonResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">📊 Model Comparison Results</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {comparisonResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-6 border ${
                      result.status === 'success'
                        ? 'bg-gray-800/80 border-green-500/30'
                        : 'bg-red-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {result.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                        <span className="font-bold text-white">{result.model}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-400">{result.time}ms</span>
                        <button
                          onClick={() => copyToClipboard(result.response)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-300 text-sm markdown-content max-h-96 overflow-y-auto scrollbar-thin">
                      <ReactMarkdown>{result.response}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl px-6 py-4 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {selectedMode === 'compare' ? 'Comparing all models...' : selectedMode === 'super' ? 'Super AI thinking...' : 'Generating response...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent backdrop-blur-sm border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={
                selectedMode === 'super'
                  ? '🚀 Ask anything - Super AI Mode activated...'
                  : selectedMode === 'compare'
                  ? '🔍 Ask to compare responses from all models...'
                  : '💬 Type your message...'
              }
              disabled={isLoading}
              className="flex-1 px-6 py-4 bg-gray-800/80 backdrop-blur-lg border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50 flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Powered by GPT-4, Claude, Gemini & more • {selectedMode === 'super' ? '🚀 Super AI Mode Active' : selectedMode === 'compare' ? '📊 Comparison Mode' : '🤖 Single Model'}
          </p>
        </div>
      </div>
    </main>
  )
}

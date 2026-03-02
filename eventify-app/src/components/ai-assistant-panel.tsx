"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, User, Send, Eraser } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hi! I'm your Eventify assistant. I can help with event ideas, venues, budgets, or planning. What would you like to know?",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function AIAssistantPanel({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getToken = () => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsLoading(true)

    try {
      const token = getToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/api/chat/ask`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: currentInput }),
      })

      const data = await res.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || data.error || "I couldn't process that. Try rephrasing?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch {
      toast.error("Connection issue. Please try again.")
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Connection lost. Please check your network and try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">AI Assistant</h2>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Eventify</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMessages(initialMessages)}
          className="text-slate-500 hover:text-slate-700"
        >
          <Eraser className="h-3.5 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex items-start gap-3", { "flex-row-reverse": msg.role === "user" })}
          >
            <div
              className={cn("shrink-0 p-1.5 rounded-lg border", {
                "bg-indigo-600 border-indigo-500": msg.role === "user",
                "bg-slate-100 border-slate-200": msg.role === "assistant",
              })}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-3.5 w-3.5 text-indigo-600" />
              ) : (
                <User className="h-3.5 w-3.5 text-white" />
              )}
            </div>
            <div className={cn("flex flex-col gap-0.5 max-w-[85%]", { "items-end": msg.role === "user" })}>
              <div
                className={cn("px-3 py-2 rounded-xl text-sm", {
                  "bg-slate-900 text-white rounded-tr-none": msg.role === "user",
                  "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none": msg.role === "assistant",
                })}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="shrink-0 p-1.5 bg-slate-100 rounded-lg border border-slate-200">
              <Bot className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl rounded-tl-none flex gap-1">
              <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.6s]" />
              <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]" />
              <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="relative flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about events, venues, budget..."
            className="flex-1 rounded-xl border-slate-200 bg-white pr-12"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-1 h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

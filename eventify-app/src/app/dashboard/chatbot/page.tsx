"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Brain, Bot, User, ArrowRight, Eraser } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DashboardLayout } from "@/components/dashboard-layout"
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
    content: "Greetings! I'm your Eventify Intelligence partner. I can help you optimize your budget, find the perfect vendors, or suggest themes for your upcoming events. What's on your mind today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
]

export default function ChatbotPage() {
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("http://localhost:5000/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      })

      const data = await res.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || data.error || "I encountered a slight anomaly while processing your request. Could you rephrase that?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      toast.error("Neural link interrupted. Check your connection.")
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Connection to the Eventify Core was lost. Please ensure the backend is active.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-14rem)] max-w-5xl mx-auto">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Strategist</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse border border-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active • GPT-4 Advanced</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessages(initialMessages)}
            className="rounded-xl border-slate-200 text-slate-500 hover:text-purple-600 font-bold uppercase tracking-tighter text-[11px]"
          >
            <Eraser className="h-3 w-3 mr-2" />
            Clear Session
          </Button>
        </div>

        {/* Chat Interface Container */}
        <div className="flex-1 bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
          {/* Scrollable Message Area */}
          <div className="flex-1 overflow-y-auto px-6 py-10 space-y-8 scrollbar-hide">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300", {
                  "flex-row-reverse": msg.role === "user",
                })}
              >
                <div className={cn("shrink-0 p-1.5 rounded-xl border", {
                  "bg-purple-600 border-purple-500": msg.role === "user",
                  "bg-slate-50 border-slate-100": msg.role === "assistant"
                })}>
                  {msg.role === "assistant" ? (
                    <Bot className="h-4.5 w-4.5 text-purple-600" />
                  ) : (
                    <User className="h-4.5 w-4.5 text-white" />
                  )}
                </div>

                <div className={cn("flex flex-col gap-1.5 max-w-[75%]", {
                  "items-end": msg.role === "user"
                })}>
                  <div className={cn("px-5 py-3.5 rounded-[24px] shadow-sm", {
                    "bg-[#09090b] text-white rounded-tr-none": msg.role === "user",
                    "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none": msg.role === "assistant"
                  })}>
                    <p className="text-[14px] leading-[1.6] font-medium">{msg.content}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-4 animate-pulse">
                <div className="shrink-0 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Bot className="h-4.5 w-4.5 text-purple-600" />
                </div>
                <div className="bg-slate-50/50 border border-slate-100 px-5 py-4 rounded-[24px] rounded-tl-none">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-duration:0.6s]" />
                    <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]" />
                    <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Premium Input Bar */}
          <div className="p-8 border-t border-slate-50 bg-slate-50/20 backdrop-blur-md">
            <div className="relative flex items-center gap-3">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-[28px] opacity-0 group-focus-within:opacity-10 blur-xl transition-opacity duration-500" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Suggest a high-end venue for a tech conference in Dubai..."
                  className="relative h-16 w-full bg-white border-slate-100 focus:border-purple-200 rounded-[28px] text-slate-900 font-medium pl-8 pr-20 shadow-sm transition-all outline-none ring-0 placeholder:text-slate-300"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 h-12 w-12 bg-[#09090b] hover:bg-black text-white rounded-[22px] transition-all flex items-center justify-center p-0 hover:scale-105 active:scale-95 disabled:hover:scale-100"
              >
                <Send className="h-5 w-5 rotate-45 -translate-y-0.5" />
              </Button>
            </div>

            <div className="flex justify-center gap-6 mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Press Enter to send • shift + enter for new line</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


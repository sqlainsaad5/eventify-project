"use client"

import { useState, useEffect, useRef } from "react"
import { VendorLayout } from "@/components/vendor-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Send, MessageCircle, Search, Calendar, User, Loader2, Check, CheckCheck, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

// ✅ UPDATE: New Conversation interface (without event_id)
interface Conversation {
  organizer_id: number
  organizer_name: string
  organizer_email: string
  last_message: string
  last_message_time: string
  unread_count: number
  assigned_events: { event_id: number; event_name: string }[]
  organizer_image?: string
}

// ✅ UPDATE: New ChatMessage interface (without event_id)
interface ChatMessage {
  id: number
  sender_id: number
  sender_name: string
  receiver_id: number
  receiver_name: string
  message: string
  is_read: boolean
  created_at: string
  timestamp: string
}

export default function VendorMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // ✅ Refs with proper typing
  const selectedConversationRef = useRef<Conversation | null>(null)
  const vendorIdRef = useRef<number | null>(null)
  const tokenRef = useRef<string | null>(null)

  // Get vendorId from localStorage
  const getVendorId = (): number | null => {
    if (typeof window === "undefined") return null
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        return user.id || user._id
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }
    return null
  }

  // ✅ Fix token type - explicitly handle undefined
  const getToken = (): string | null => {
    if (typeof window === "undefined") return null
    const storedToken = localStorage.getItem("token")
    if (!storedToken) return null
    
    try {
      // Remove quotes and trim
      return storedToken.replace(/['"]+/g, "").trim()
    } catch (e) {
      console.error("Error processing token:", e)
      return null
    }
  }

  const token = getToken()
  const vendorId = getVendorId()

  // ✅ Update refs when values change
  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

  useEffect(() => {
    vendorIdRef.current = vendorId
    tokenRef.current = token
  }, [vendorId, token])

  // ✅ UPDATED: Fetch conversations (now organizer-based, not event-based)
  const fetchConversations = async () => {
    const currentVendorId = vendorIdRef.current
    const currentToken = tokenRef.current
    
    if (!currentVendorId || !currentToken) {
      console.warn("Missing vendorId or token")
      setLoading(false)
      return
    }

    try {
      setIsRefreshing(true)
      const res = await fetch("http://localhost:5000/api/chat/vendor/conversations", {
        headers: {
          "Authorization": `Bearer ${currentToken}`,
        },
        cache: 'no-store'
      })

      if (res.ok) {
        const data = await res.json()
        console.log("✅ Vendor conversations loaded:", data.conversations?.length || 0)
        setConversations(data.conversations || [])
        
        // ✅ Auto-select first conversation only on initial load
        if (data.conversations && data.conversations.length > 0 && !selectedConversationRef.current && !loading) {
          const firstConv = data.conversations[0]
          setSelectedConversation(firstConv)
          fetchChatMessages(firstConv.organizer_id) // ✅ Changed to organizer_id
        }
      } else {
        console.error("Failed to fetch conversations:", res.status)
        if (res.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please login again",
            variant: "destructive",
          })
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err)
      toast({
        title: "Connection Error",
        description: "Failed to load conversations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // ✅ UPDATED: Fetch chat messages for organizer (not event)
  const fetchChatMessages = async (organizerId: number) => {
    const currentVendorId = vendorIdRef.current
    const currentToken = tokenRef.current
    if (!currentVendorId || !currentToken || !organizerId) {
      console.warn("Missing data for fetching messages")
      setChatLoading(false)
      return
    }

    setChatLoading(true)
    try {
      // ✅ CHANGE: Use new endpoint for user conversation
      const res = await fetch(`http://localhost:5000/api/chat/conversation/user/${organizerId}?_=${Date.now()}`, {
        headers: {
          "Authorization": `Bearer ${currentToken}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        
        const transformedMessages = (data.messages || []).map((msg: any) => ({
          ...msg,
          sender_name: msg.sender_id === currentVendorId ? "You" : msg.sender_name
        }))
        
        setChatMessages(transformedMessages)

        // ✅ CHANGE: Mark messages as read for this ORGANIZER (not event)
        try {
          await fetch("http://localhost:5000/api/chat/mark-read-vendor", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ vendor_id: organizerId }) // ✅ Changed parameter name
          })
        } catch (readError) {
          console.error("Error marking messages as read:", readError)
        }
      } else {
        console.error("Failed to fetch messages:", res.status)
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err)
    } finally {
      setChatLoading(false)
    }
  }

  // ✅ UPDATED: Manual refresh function
  const handleManualRefresh = async () => {
    await fetchConversations()
    if (selectedConversationRef.current) {
      await fetchChatMessages(selectedConversationRef.current.organizer_id) // ✅ Changed to organizer_id
    }
    toast({
      title: "Refreshed",
      description: "Messages refreshed successfully",
    })
  }

  // ✅ UPDATED: Send message function (no event_id needed)
  const sendMessage = async () => {
    const currentVendorId = vendorIdRef.current
    const currentToken = tokenRef.current
    const currentSelectedConv = selectedConversationRef.current
    
    if (!newMessage.trim()) {
      toast({
        title: "Empty Message",
        description: "Please type a message first",
        variant: "destructive",
      })
      return
    }
    
    if (!currentSelectedConv || !currentVendorId || !currentToken) {
      toast({
        title: "Connection Error",
        description: "Please refresh and try again",
        variant: "destructive",
      })
      return
    }

    try {
      // ✅ CHANGE: Remove event_id from request
      const res = await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          receiver_id: currentSelectedConv.organizer_id, // ✅ Only receiver_id needed
          message: newMessage.trim()
        }),
      })

      if (res.ok) {
        const data = await res.json()
        
        const newChatMessage = {
          ...data.chat_message,
          sender_name: "You"
        }
        
        setChatMessages(prev => [...prev, newChatMessage])
        setNewMessage("")

        // Refresh conversations list after sending message
        setTimeout(() => {
          fetchConversations()
        }, 500)

        toast({
          title: "Message Sent",
          description: "Your message has been delivered",
        })
      } else {
        const errorData = await res.json()
        toast({
          title: "Failed to send message",
          description: errorData.error || "Please try again",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error sending message:", err)
      toast({
        title: "Failed to send message",
        description: "Network error. Please check your connection.",
        variant: "destructive",
      })
    }
  }

  // ✅ UPDATED: Select conversation
  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    fetchChatMessages(conversation.organizer_id) // ✅ Changed to organizer_id
  }

  // ✅ Filter conversations
  const filteredConversations = conversations.filter(conv =>
    conv.organizer_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeConversations = filteredConversations

  // ✅ UPDATED: Initialize with new endpoints
  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout | null = null

    const init = async () => {
      if (mounted) {
        await fetchConversations()
        
        // ✅ Set interval only for messages refresh
        intervalId = setInterval(async () => {
          if (mounted && selectedConversationRef.current) {
            // Only refresh chat messages, not conversations
            await fetchChatMessages(selectedConversationRef.current.organizer_id) // ✅ Changed to organizer_id
          }
        }, 30000) // Every 30 seconds
      }
    }

    init()

    return () => {
      mounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, []) // ✅ Empty dependency array - should run only once

  // ✅ Format time
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return "Just now"
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return "Just now"
    }
  }

  // ✅ Format date for conversation list
  const formatConversationTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return "Just now"
      }
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      
      return date.toLocaleDateString()
    } catch (e) {
      return "Just now"
    }
  }

  // ✅ Get total assigned events count for a conversation
  const getTotalAssignedEvents = (conversation: Conversation) => {
    return conversation.assigned_events?.length || 0
  }

  // ✅ Get event names for display
  const getEventNames = (conversation: Conversation) => {
    if (!conversation.assigned_events || conversation.assigned_events.length === 0) {
      return "No events"
    }
    
    if (conversation.assigned_events.length === 1) {
      return conversation.assigned_events[0].event_name
    }
    
    return `${conversation.assigned_events.length} events`
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
            <p className="text-muted-foreground">Chat with organizers about bookings, updates, or requests</p>
          </div>
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Conversations List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="active" className="w-full">
              <div className="flex justify-between items-center mb-2">
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
                <span className="text-sm text-gray-500">
                  {filteredConversations.length} conversations
                </span>
              </div>
              
              <TabsContent value="active" className="mt-4">
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="animate-spin w-6 h-6" />
                  </div>
                ) : activeConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a chat from an event or booking</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {activeConversations.map((conversation) => (
                      <Card
                        key={conversation.organizer_id} // ✅ Use organizer_id as key
                        className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                          selectedConversation?.organizer_id === conversation.organizer_id
                            ? 'border-purple-500 bg-purple-50 shadow-sm'
                            : 'border-gray-200'
                        }`}
                        onClick={() => selectConversation(conversation)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage 
                                src={conversation.organizer_image || 
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.organizer_name}`} 
                              />
                              <AvatarFallback>
                                {conversation.organizer_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-gray-900 truncate text-sm">
                                  {conversation.organizer_name}
                                </h3>
                                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-2">
                                  {formatConversationTime(conversation.last_message_time)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {getEventNames(conversation)} {/* ✅ Show event info */}
                              </p>
                              <p className="text-sm text-gray-500 truncate mt-1">
                                {conversation.last_message || "No messages yet"}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {getTotalAssignedEvents(conversation)} event(s)
                                </span>
                                {conversation.unread_count > 0 && (
                                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                                    {conversation.unread_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="archived" className="mt-4">
                <div className="text-center py-8 text-gray-500">
                  <p>No archived conversations</p>
                  <p className="text-sm">Archive conversations you no longer need</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Side - Chat Area */}
          <div className="lg:col-span-2">
            <Card className="border border-gray-200 h-[calc(100vh-200px)]">
              {selectedConversation ? (
                <>
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConversation.organizer_name}`} 
                        />
                        <AvatarFallback>{selectedConversation.organizer_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-gray-900">{selectedConversation.organizer_name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getTotalAssignedEvents(selectedConversation)} event(s) assigned
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-purple-600" />
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 flex flex-col h-[calc(100%-120px)]">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
                      {chatLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <Loader2 className="animate-spin w-6 h-6" />
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="font-medium">No messages yet</p>
                          <p className="text-sm mt-1">Start the conversation by sending a message!</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_name === "You" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                                msg.sender_name === "You"
                                  ? "bg-purple-600 text-white rounded-br-none"
                                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                              }`}
                            >
                              <p className="break-words">{msg.message}</p>
                              <div className={`text-[10px] mt-1 flex items-center justify-between ${
                                msg.sender_name === "You" ? "text-purple-200" : "text-gray-500"
                              }`}>
                                <span>{formatTime(msg.created_at)}</span>
                                <span className="ml-2 font-medium">
                                  {msg.sender_name}
                                </span>
                                {msg.sender_name === "You" && (
                                  <span className="ml-2">
                                    {msg.is_read ? 
                                      <CheckCheck className="w-3 h-3" /> : 
                                      <Check className="w-3 h-3" />
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="flex items-center gap-2 border-t bg-white p-4">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={sendMessage} 
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!newMessage.trim() || chatLoading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                  <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-sm text-center">
                    Choose a conversation from the list to start chatting with organizers
                  </p>
                  {conversations.length === 0 && !loading && (
                    <Button 
                      onClick={handleManualRefresh} 
                      variant="outline" 
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Conversations
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </VendorLayout>
  )
}
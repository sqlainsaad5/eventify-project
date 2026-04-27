"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { EventifyChatbotPanel } from "@/components/eventify-chatbot-panel"

export default function ChatbotPage() {
  return (
    <DashboardLayout>
      <EventifyChatbotPanel />
    </DashboardLayout>
  )
}

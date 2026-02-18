"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const feedbackLogs = [
  { id: 1, user: "Ali", feedback: "Chatbot helped me find vendors!", rating: 5 },
  { id: 2, user: "Sara", feedback: "Response delay observed.", rating: 3 },
  { id: 3, user: "Bilal", feedback: "Very accurate suggestions!", rating: 4 },
]

export default function FeedbackPage() {
  return (
    <AdminLayout>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>AI Chatbot Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-3">User</th>
                <th className="p-3">Feedback</th>
                <th className="p-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {feedbackLogs.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{f.user}</td>
                  <td className="p-3">{f.feedback}</td>
                  <td className="p-3">{f.rating}⭐</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}

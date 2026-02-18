"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, DollarSign, BarChart3, TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const systemStats = [
  { label: "Total Organizers", value: 126, icon: Users, color: "text-blue-600" },
  { label: "Total Vendors", value: 94, icon: BarChart3, color: "text-purple-600" },
  { label: "Active Events", value: 47, icon: Calendar, color: "text-green-600" },
  { label: "Total Revenue", value: "$248,000", icon: DollarSign, color: "text-orange-600" },
]

const monthlyRevenueData = [
  { month: "Jan", revenue: 32000 },
  { month: "Feb", revenue: 28000 },
  { month: "Mar", revenue: 35000 },
  { month: "Apr", revenue: 41000 },
  { month: "May", revenue: 38000 },
  { month: "Jun", revenue: 46000 },
]

const userGrowthData = [
  { month: "Jan", organizers: 45, vendors: 35 },
  { month: "Feb", organizers: 50, vendors: 38 },
  { month: "Mar", organizers: 56, vendors: 41 },
  { month: "Apr", organizers: 62, vendors: 45 },
  { month: "May", organizers: 70, vendors: 49 },
  { month: "Jun", organizers: 78, vendors: 52 },
]

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor system stats, revenue, and user growth</p>
        </div>

        {/* System Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {systemStats.map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-muted-foreground">Updated just now</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">Overall system revenue trends</p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <p className="text-sm text-muted-foreground">Organizers vs Vendors (last 6 months)</p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  organizers: { label: "Organizers", color: "hsl(var(--chart-2))" },
                  vendors: { label: "Vendors", color: "hsl(var(--chart-3))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="organizers"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendors"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              The platform has shown consistent growth in both vendors and organizers during the past
              six months. Event frequency and overall revenue are increasing steadily. Admins can
              monitor detailed analytics from the analytics section for deeper insights.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

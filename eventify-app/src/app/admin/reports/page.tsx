"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { CreditCard, Users, Calendar } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

interface OverviewData {
  users: { total: number; organizers: number; vendors: number; clients: number };
  events: { total: number; pending_organizer?: number; total_budget: number };
  payments: {
    total: number;
    total_revenue: number;
    pending_requests: number;
    pending_organizer_requests?: number;
    by_lane?: { vendor_settlement: number; platform_or_host: number };
  };
}

interface AnalyticsData {
  signups_by_date: { date: string; count: number }[];
  revenue_by_date: { date: string; total: number }[];
}

export default function AdminReportsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [oRes, aRes] = await Promise.all([
          fetch(`${getApiBase()}/api/admin/overview`, { headers }),
          fetch(`${getApiBase()}/api/admin/analytics?days=90`, { headers }),
        ]);
        if (oRes.ok) setOverview(await oRes.json());
        if (aRes.ok) setAnalytics(await aRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Reports
        </h1>
        <CardDescription>
          Live figures from the admin API (last 90 days for charts).
        </CardDescription>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total revenue (payments table)
            </CardTitle>
            <CreditCard className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs {(overview?.payments?.total_revenue ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.payments?.total ?? 0} payment rows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Events
            </CardTitle>
            <Calendar className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.events?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Budget sum Rs {(overview?.events?.total_budget ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Users
            </CardTitle>
            <Users className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.users?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Org {overview?.users?.organizers ?? 0} · Ven{" "}
              {overview?.users?.vendors ?? 0} · Clients{" "}
              {overview?.users?.clients ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signups (90 days)</CardTitle>
            <CardDescription>From admin analytics</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.signups_by_date?.length ? (
              <ChartContainer
                config={{ count: { label: "Signups", color: "hsl(var(--chart-1))" } }}
                className="h-[280px] w-full"
              >
                <AreaChart data={analytics.signups_by_date}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1) / 0.2)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No signup series data.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by day (90 days)</CardTitle>
            <CardDescription>Sum of payment amounts by created date</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.revenue_by_date?.length ? (
              <ChartContainer
                config={{ total: { label: "Revenue", color: "hsl(var(--chart-2))" } }}
                className="h-[280px] w-full"
              >
                <LineChart data={analytics.revenue_by_date}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-2))" dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No revenue series data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment pipeline</CardTitle>
          <CardDescription>Outstanding work items</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Vendor payment requests (pending): {overview?.payments?.pending_requests ?? 0}</p>
          <p>
            Organizer payment requests (pending):{" "}
            {overview?.payments?.pending_organizer_requests ?? 0}
          </p>
          {overview?.payments?.by_lane && (
            <p>
              Payment rows by lane — vendor settlement:{" "}
              {overview.payments.by_lane.vendor_settlement}, host/platform:{" "}
              {overview.payments.by_lane.platform_or_host}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

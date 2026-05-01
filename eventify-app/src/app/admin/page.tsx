"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBase } from "@/lib/api-base";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
  Zap,
  UserPlus,
} from "lucide-react";

interface OverviewData {
  users: {
    total: number;
    organizers: number;
    vendors: number;
    clients: number;
  };
  events: {
    total: number;
    pending_organizer?: number;
    total_budget: number;
  };
  payments: {
    total: number;
    total_revenue: number;
    pending_requests: number;
    pending_organizer_requests?: number;
    organizer_requests_paid?: number;
    by_lane?: { vendor_settlement: number; platform_or_host: number };
  };
}

interface AnalyticsData {
  signups_by_date: { date: string; count: number }[];
  revenue_by_date: { date: string; total: number }[];
  recent_users: { id: number; name: string; email: string; role: string; created_at: string | null }[];
  recent_payments: {
    id: number;
    amount: number;
    created_at: string | null;
    event_name?: string;
    lane?: string;
    host_name?: string | null;
    organizer_name?: string | null;
  }[];
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")?.replace(/['"]+/g, "").trim()
        : null;
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [overviewRes, analyticsRes] = await Promise.all([
          fetch(`${getApiBase()}/api/admin/overview`, { headers }),
          fetch(`${getApiBase()}/api/admin/analytics?days=30`, {
            headers,
          }),
        ]);
        if (overviewRes.ok) {
          const data = await overviewRes.json();
          setOverview(data);
        }
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Platform Overview
        </h1>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl border-border shadow-sm">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Platform Overview
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/events?organizer_status=pending">
              <Zap className="mr-2 size-4" />
              Pending events
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/payments">
              <CreditCard className="mr-2 size-4" />
              Payments
            </Link>
          </Button>
          {(overview?.payments?.pending_organizer_requests ?? 0) > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/payments?tab=organizer-requests">
                <CreditCard className="mr-2 size-4" />
                Organizer requests
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Users
            </CardTitle>
            <Users className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-foreground">
              {overview?.users?.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Organizers: {overview?.users?.organizers ?? 0} · Vendors:{" "}
              {overview?.users?.vendors ?? 0} · Clients:{" "}
              {overview?.users?.clients ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Events
            </CardTitle>
            <Calendar className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-foreground">
              {overview?.events?.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total budget: Rs {(overview?.events?.total_budget ?? 0).toFixed(2)}
              {(overview?.events?.pending_organizer ?? 0) > 0 && (
                <> · Pending: {overview.events.pending_organizer}</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Payments
            </CardTitle>
            <CreditCard className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-foreground">
              Rs {(overview?.payments?.total_revenue ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total payments: {overview?.payments?.total ?? 0} · Vendor
              requests (pending): {overview?.payments?.pending_requests ?? 0}
              {(overview?.payments?.pending_organizer_requests ?? 0) > 0 && (
                <>
                  {" "}
                  · Organizer requests (pending):{" "}
                  {overview?.payments?.pending_organizer_requests}
                </>
              )}
              {overview?.payments?.by_lane && (
                <>
                  {" "}
                  · Lanes: vendor {overview.payments.by_lane.vendor_settlement},
                  host/platform {overview.payments.by_lane.platform_or_host}
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Signups (last 30 days)
            </CardTitle>
            <CardDescription>New user registrations by date</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.signups_by_date?.length ? (
              <ChartContainer
                config={{
                  count: { label: "Signups", color: "hsl(var(--chart-1))" },
                }}
                className="h-[280px] w-full"
              >
                <AreaChart data={analytics.signups_by_date}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                No signup data for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-sm font-bold">Rs</span>
              Revenue (last 30 days)
            </CardTitle>
            <CardDescription>Payment revenue by date</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.revenue_by_date?.length ? (
              <ChartContainer
                config={{
                  total: { label: "Revenue", color: "hsl(var(--chart-2))" },
                }}
                className="h-[280px] w-full"
              >
                <LineChart data={analytics.revenue_by_date}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                No revenue data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Recent users
            </CardTitle>
            <CardDescription>Latest registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.recent_users?.length ? (
              <ul className="space-y-3">
                {analytics.recent_users.slice(0, 5).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        {u.name || u.email}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {u.role}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent users
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Recent payments
            </CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.recent_payments?.length ? (
              <ul className="space-y-3">
                {analytics.recent_payments.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        Rs {Number(p.amount).toFixed(2)}
                      </span>
                      {p.event_name && (
                        <span className="ml-2 text-muted-foreground">
                          {p.event_name}
                        </span>
                      )}
                      {p.lane && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({p.lane === "vendor_settlement" ? "Vendor" : "Host"})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent payments
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

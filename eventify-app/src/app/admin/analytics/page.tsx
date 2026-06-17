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

interface AnalyticsSeries {
  signups_by_date: { date: string; count: number }[];
  revenue_by_date: { date: string; total: number }[];
}

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [series, setSeries] = useState<AnalyticsSeries | null>(null);
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
        if (aRes.ok) setSeries(await aRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Analytics
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signups (90 days)</CardTitle>
            <CardDescription>New user registrations by date</CardDescription>
          </CardHeader>
          <CardContent>
            {series?.signups_by_date?.length ? (
              <ChartContainer
                config={{ count: { label: "Signups", color: "hsl(var(--chart-1))" } }}
                className="h-[280px] w-full"
              >
                <AreaChart data={series.signups_by_date}>
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
            {series?.revenue_by_date?.length ? (
              <ChartContainer
                config={{ total: { label: "Revenue", color: "hsl(var(--chart-2))" } }}
                className="h-[280px] w-full"
              >
                <LineChart data={series.revenue_by_date}>
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

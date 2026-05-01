"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

interface SummaryPayload {
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    city?: string | null;
    phone?: string | null;
    category?: string | null;
    is_verified?: boolean;
    is_active?: boolean;
    created_at?: string | null;
  };
  counts: {
    events_created: number;
    events_organized: number;
    vendor_event_links: number;
  };
  recent_payments: Record<string, unknown>[];
  recent_organizer_payment_requests: Record<string, unknown>[];
  recent_vendor_payment_requests: Record<string, unknown>[];
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${getApiBase()}/api/admin/users/${id}/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Failed to load user");
        setData(null);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load user");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 size-4" />
            Back to users
          </Link>
        </Button>
        <p className="text-destructive">{error || "Not found"}</p>
      </div>
    );
  }

  const { user, counts } = data;
  const role = user.role || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 size-4" />
            Users
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {user.name || user.email}
        </h1>
        <Badge variant="secondary">{role}</Badge>
        {user.is_active === false && (
          <Badge variant="destructive">Blocked</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Identity and status</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="font-medium">{user.phone || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">City</span>
            <p className="font-medium">{user.city || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Category</span>
            <p className="font-medium">{user.category || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Joined</span>
            <p className="font-medium">
              {user.created_at
                ? new Date(user.created_at).toLocaleString()
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity counts</CardTitle>
          <CardDescription>How this account touches the platform</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Events created (host)</p>
            <p className="text-2xl font-semibold">{counts.events_created}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Events organized</p>
            <p className="text-2xl font-semibold">{counts.events_organized}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Vendor event links</p>
            <p className="text-2xl font-semibold">{counts.vendor_event_links}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
          <CardDescription>
            Payments on events where this user is host, organizer, or vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lane</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_payments.map((p) => (
                  <TableRow key={String(p.id)}>
                    <TableCell className="text-muted-foreground text-xs">
                      {String(p.lane || "—")}
                    </TableCell>
                    <TableCell>{String(p.event_name || p.event_id || "—")}</TableCell>
                    <TableCell>
                      {String(p.currency || "PKR")}{" "}
                      {Number(p.amount as number).toFixed(2)}
                    </TableCell>
                    <TableCell>{String(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(role === "organizer" || counts.events_organized > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Organizer payment requests</CardTitle>
            <CardDescription>Fees requested from event hosts</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_organizer_payment_requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_organizer_payment_requests.map((r) => (
                    <TableRow key={String(r.id)}>
                      <TableCell>{String(r.event_name || r.event_id)}</TableCell>
                      <TableCell>
                        {Number(r.amount as number).toFixed(2)}
                      </TableCell>
                      <TableCell>{String(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {(role === "vendor" || counts.vendor_event_links > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor payment requests</CardTitle>
            <CardDescription>Payout requests after work verification</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_vendor_payment_requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_vendor_payment_requests.map((r) => (
                    <TableRow key={String(r.id)}>
                      <TableCell>{String(r.event_name || r.event_id)}</TableCell>
                      <TableCell>
                        {Number(r.amount as number).toFixed(2)}
                      </TableCell>
                      <TableCell>{String(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { getApiBase } from "@/lib/api-base";

interface ChatRow {
  id: number;
  sender_id: number;
  sender_name: string;
  receiver_id: number;
  receiver_name: string;
  event_id: number;
  event_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

export default function AdminMessagesPage() {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [eventIdInput, setEventIdInput] = useState("");
  const [eventId, setEventId] = useState<number | null>(null);
  const [days, setDays] = useState<number>(30);

  const fetchMessages = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (eventId != null) params.set("event_id", String(eventId));
      params.set("days", String(days));
      const res = await fetch(
        `${getApiBase()}/api/admin/chat-messages?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        toast.error("Failed to load messages");
        return;
      }
      const data = await res.json();
      setRows(data.messages ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, eventId, days]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const applyEventFilter = () => {
    const v = eventIdInput.trim();
    if (!v) {
      setEventId(null);
      setPage(1);
      return;
    }
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) {
      toast.error("Event ID must be a number");
      return;
    }
    setEventId(n);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Messages
        </h1>
        <p className="text-muted-foreground text-sm">
          In-app chat between users (moderation / support). Respects the same
          retention as your database.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Event ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="Optional"
                value={eventIdInput}
                onChange={(e) => setEventIdInput(e.target.value)}
                className="w-32"
              />
              <Button type="button" variant="secondary" onClick={applyEventFilter}>
                Apply
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Last N days</label>
            <Select
              value={String(days)}
              onValueChange={(v) => {
                setDays(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="90">90</SelectItem>
                <SelectItem value="365">365</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Per page</label>
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPerPage(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Read</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No messages found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="max-w-[140px] truncate font-medium">
                          {m.event_name}
                        </TableCell>
                        <TableCell className="text-sm">{m.sender_name}</TableCell>
                        <TableCell className="text-sm">{m.receiver_name}</TableCell>
                        <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                          {m.message}
                        </TableCell>
                        <TableCell>{m.is_read ? "Yes" : "No"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {m.created_at}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          className={
                            page <= 1 ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#" isActive>
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < totalPages) setPage(page + 1);
                          }}
                          className={
                            page >= totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

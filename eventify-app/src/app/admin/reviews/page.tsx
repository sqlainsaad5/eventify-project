"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Badge } from "@/components/ui/badge";
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

interface ReviewRow {
  id: number;
  event_id: number;
  event_name?: string;
  author_id: number;
  author_name?: string;
  subject_id: number;
  review_type: string;
  rating: number;
  comment?: string | null;
  status: string;
  created_at?: string | null;
}

interface EventOption {
  id: number;
  name: string;
  date?: string;
  venue?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventSearch, setEventSearch] = useState("");
  const debouncedEventSearch = useDebounce(eventSearch, 350);
  const [reviewType, setReviewType] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const fetchEventOptions = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setEventsLoading(false);
      return;
    }
    setEventsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("per_page", "100");
      if (debouncedEventSearch.trim()) {
        params.set("q", debouncedEventSearch.trim());
      }
      const res = await fetch(`${getApiBase()}/api/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setEventOptions(
        (data.events ?? []).map((e: EventOption) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          venue: e.venue,
        }))
      );
    } catch {
      /* non-blocking */
    } finally {
      setEventsLoading(false);
    }
  }, [debouncedEventSearch]);

  useEffect(() => {
    fetchEventOptions();
  }, [fetchEventOptions]);

  const fetchReviews = useCallback(async () => {
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
      if (reviewType) params.set("review_type", reviewType);
      if (status) params.set("status", status);
      const res = await fetch(`${getApiBase()}/api/admin/reviews?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Failed to load reviews");
        return;
      }
      const data = await res.json();
      setRows(data.reviews ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, eventId, reviewType, status]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const eventSelectValue = eventId != null ? String(eventId) : "__all__";
  const eventSelectOptions =
    selectedEvent && !eventOptions.some((e) => e.id === selectedEvent.id)
      ? [selectedEvent, ...eventOptions]
      : eventOptions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Reviews
        </h1>
        <p className="text-muted-foreground text-sm">
          Event-scoped ratings (read-only oversight).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Event</label>
            <Input
              placeholder="Search events by name or venue"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-[280px]"
            />
            <Select
              value={eventSelectValue}
              onValueChange={(v) => {
                if (v === "__all__") {
                  setEventId(null);
                  setSelectedEvent(null);
                } else {
                  const id = Number(v);
                  const picked =
                    eventOptions.find((e) => e.id === id) ??
                    selectedEvent ??
                    ({ id, name: `Event #${id}` } satisfies EventOption);
                  setEventId(id);
                  setSelectedEvent(picked);
                }
                setPage(1);
              }}
              disabled={eventsLoading}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue
                  placeholder={eventsLoading ? "Loading events…" : "All events"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All events</SelectItem>
                {eventSelectOptions.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                    {e.date ? ` · ${e.date}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Type</label>
            <Select
              value={reviewType || "__all__"}
              onValueChange={(v) => {
                setReviewType(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="user_to_organizer">User to organizer</SelectItem>
                <SelectItem value="organizer_to_vendor">Organizer to vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Status</label>
            <Select
              value={status || "__all__"}
              onValueChange={(v) => {
                setStatus(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="published">Published</SelectItem>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No reviews found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.event_name || `#${r.event_id}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {r.review_type}
                        </TableCell>
                        <TableCell>{r.author_name || `#${r.author_id}`}</TableCell>
                        <TableCell>#{r.subject_id}</TableCell>
                        <TableCell>{r.rating}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : "—"}
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

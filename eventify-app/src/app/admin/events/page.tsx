"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
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
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle } from "lucide-react";

interface AdminEvent {
  id: number;
  name: string;
  date: string;
  venue: string;
  budget: number;
  vendor_category: string;
  organizer_name?: string | null;
  organizer_id?: number | null;
  organizer_status?: string | null;
  assigned_vendors?: string[];
}

const API_BASE = "http://localhost:5000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

export default function AdminEventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [organizerId, setOrganizerId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const id = searchParams.get("organizer_id");
    const num = id ? parseInt(id, 10) : NaN;
    setOrganizerId(Number.isNaN(num) ? null : num);
    setPage(1);
  }, [searchParams]);

  const fetchEvents = useCallback(async () => {
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
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter !== "all") params.set("organizer_status", statusFilter);
      if (organizerId != null && !isNaN(organizerId))
        params.set("organizer_id", String(organizerId));
      const res = await fetch(`${API_BASE}/api/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Failed to load events");
        return;
      }
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, statusFilter, organizerId]);

  useEffect(() => {
    const initialStatus = searchParams.get("organizer_status");
    if (initialStatus) setStatusFilter(initialStatus);
  }, [searchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setOrganizerStatus = async (eventId: number, organizer_status: "accepted" | "rejected") => {
    const token = getToken();
    if (!token) return;
    setUpdatingId(eventId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizer_status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Failed to update event");
        return;
      }
      toast.success(organizer_status === "accepted" ? "Event approved" : "Event rejected");
      fetchEvents();
    } catch {
      toast.error("Failed to update event");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Events
        </h1>
        <CardDescription>
          View and approve or reject events (organizer status).
        </CardDescription>
      </div>

      <Card className="rounded-2xl border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or venue..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Organizer status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
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
        </CardHeader>
        <CardContent>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No events found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {e.venue}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.date
                            ? new Date(e.date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>${Number(e.budget).toFixed(2)}</TableCell>
                        <TableCell>{e.organizer_name || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.organizer_status === "accepted"
                                ? "default"
                                : e.organizer_status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {e.organizer_status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {e.organizer_status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                disabled={updatingId === e.id}
                                onClick={() =>
                                  setOrganizerStatus(e.id, "accepted")
                                }
                              >
                                <CheckCircle className="mr-1 size-4" />
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={updatingId === e.id}
                                onClick={() =>
                                  setOrganizerStatus(e.id, "rejected")
                                }
                              >
                                <XCircle className="mr-1 size-4" />
                                Reject
                              </Button>
                            </div>
                          )}
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
                          aria-disabled={page <= 1}
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
                          aria-disabled={page >= totalPages}
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

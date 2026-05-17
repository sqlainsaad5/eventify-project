"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getApiBase } from "@/lib/api-base";
import { Ban, CheckCircle, ExternalLink, Eye, Loader2 } from "lucide-react";

interface ComplaintRow {
  id: number;
  event_id: number;
  event_name?: string;
  complainant_id: number;
  complainant_name?: string;
  complainant_role?: string;
  subject_id: number;
  subject_name?: string;
  subject_role?: string;
  complaint_type: string;
  category: string;
  description: string;
  attachment_urls?: string[];
  status: string;
  admin_notes?: string | null;
  resolution_action?: string | null;
  subject_is_active?: boolean;
  created_at?: string | null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "open":
      return "default" as const;
    case "under_review":
      return "secondary" as const;
    case "resolved":
      return "outline" as const;
    case "dismissed":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "open":
      return "bg-amber-500/90 hover:bg-amber-500/90";
    case "under_review":
      return "bg-blue-600/90 hover:bg-blue-600/90 text-white";
    case "resolved":
      return "bg-green-600/90 hover:bg-green-600/90 text-white border-0";
    case "dismissed":
      return "";
    default:
      return "";
  }
}

function formatType(t: string) {
  return t.replace(/_/g, " ");
}

function attachmentFullUrl(path: string) {
  if (path.startsWith("http")) return path;
  const base = getApiBase().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function AdminComplaintsPage() {
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [eventIdInput, setEventIdInput] = useState("");
  const [eventId, setEventId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [complaintType, setComplaintType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [detail, setDetail] = useState<ComplaintRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [detailStatus, setDetailStatus] = useState("open");
  const [saving, setSaving] = useState(false);
  const [blockTarget, setBlockTarget] = useState<ComplaintRow | null>(null);
  const [unblockTarget, setUnblockTarget] = useState<ComplaintRow | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState(false);

  const fetchComplaints = useCallback(async () => {
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
      if (complaintType) params.set("complaint_type", complaintType);
      if (status) params.set("status", status);
      if (searchQ) params.set("q", searchQ);
      const res = await fetch(`${getApiBase()}/api/admin/complaints?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Failed to load complaints");
        return;
      }
      const data = await res.json();
      setRows(data.complaints ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, eventId, complaintType, status, searchQ]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

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

  const applySearch = () => {
    setSearchQ(searchInput.trim());
    setPage(1);
  };

  const openDetail = (row: ComplaintRow) => {
    setDetail(row);
    setAdminNotes(row.admin_notes ?? "");
    setDetailStatus(row.status);
  };

  const patchComplaint = async (
    id: number,
    body: Record<string, unknown>
  ): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${getApiBase()}/api/admin/complaints/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Update failed");
      return false;
    }
    return true;
  };

  const saveDetail = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const ok = await patchComplaint(detail.id, {
        status: detailStatus,
        admin_notes: adminNotes,
      });
      if (ok) {
        toast.success("Complaint updated");
        setDetail(null);
        fetchComplaints();
      }
    } finally {
      setSaving(false);
    }
  };

  const setSubjectActive = async (
    subjectId: number,
    isActive: boolean
  ): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${getApiBase()}/api/admin/users/${subjectId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || `Failed to ${isActive ? "unblock" : "block"} user`);
      return false;
    }
    return true;
  };

  const handleBlockSubject = async () => {
    if (!blockTarget) return;
    setBlocking(true);
    try {
      const okUser = await setSubjectActive(blockTarget.subject_id, false);
      if (!okUser) return;
      const ok = await patchComplaint(blockTarget.id, {
        status: "resolved",
        resolution_action: "user_blocked",
        admin_notes: adminNotes || blockTarget.admin_notes || "Account blocked by admin.",
      });
      if (ok) {
        toast.success("User blocked and complaint resolved");
        setBlockTarget(null);
        setDetail(null);
        fetchComplaints();
      }
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockSubject = async () => {
    if (!unblockTarget) return;
    setUnblocking(true);
    try {
      const okUser = await setSubjectActive(unblockTarget.subject_id, true);
      if (!okUser) return;
      const note =
        (adminNotes || unblockTarget.admin_notes || "").trim() ||
        "Account unblocked by admin.";
      const appendedNote = unblockTarget.admin_notes
        ? `${unblockTarget.admin_notes}\n${note}`
        : note;
      await patchComplaint(unblockTarget.id, {
        admin_notes: appendedNote,
        resolution_action: "none",
      });
      toast.success("User unblocked");
      setUnblockTarget(null);
      if (detail?.id === unblockTarget.id) {
        setDetail((d) =>
          d
            ? {
                ...d,
                subject_is_active: true,
                resolution_action: "none",
                admin_notes: appendedNote,
              }
            : d
        );
      }
      fetchComplaints();
    } finally {
      setUnblocking(false);
    }
  };

  const isSubjectBlocked = (row: ComplaintRow) =>
    row.subject_is_active === false || row.resolution_action === "user_blocked";

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Complaints
        </h1>
        <p className="text-muted-foreground text-sm">
          Review user reports and take action (warn, resolve, or block).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Search</label>
            <div className="flex gap-2">
              <Input
                placeholder="Description or event name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-48"
              />
              <Button type="button" variant="secondary" onClick={applySearch}>
                Apply
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Event ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 12"
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
            <label className="text-sm text-muted-foreground">Type</label>
            <Select
              value={complaintType || "__all__"}
              onValueChange={(v) => {
                setComplaintType(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="user_to_organizer">User → Organizer</SelectItem>
                <SelectItem value="organizer_to_user">Organizer → Host</SelectItem>
                <SelectItem value="organizer_to_vendor">Organizer → Vendor</SelectItem>
                <SelectItem value="vendor_to_organizer">Vendor → Organizer</SelectItem>
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Against</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No complaints found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.event_name || `#${r.event_id}`}
                        </TableCell>
                        <TableCell>
                          {r.complainant_name || `#${r.complainant_id}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{r.subject_name || `#${r.subject_id}`}</span>
                            {isSubjectBlocked(r) && (
                              <Badge variant="destructive" className="w-fit text-[10px]">
                                Blocked
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatType(r.complaint_type)}
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {r.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(r.status)}
                            className={statusBadgeClass(r.status)}
                          >
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetail(r)}
                            >
                              <Eye className="mr-1 size-4" />
                              View
                            </Button>
                            {isSubjectBlocked(r) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => {
                                  setUnblockTarget(r);
                                  setAdminNotes(r.admin_notes ?? "");
                                }}
                              >
                                <CheckCircle className="mr-1 size-4" />
                                Unblock
                              </Button>
                            ) : (
                              r.status !== "resolved" &&
                              r.status !== "dismissed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => {
                                    setBlockTarget(r);
                                    setAdminNotes(r.admin_notes ?? "");
                                  }}
                                >
                                  <Ban className="mr-1 size-4" />
                                  Block
                                </Button>
                              )
                            )}
                          </div>
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Complaint #{detail.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Event</p>
                    <p className="font-medium">
                      {detail.event_name || `#${detail.event_id}`}
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link href={`/admin/events`}>View events</Link>
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type / Category</p>
                    <p className="font-medium capitalize">
                      {formatType(detail.complaint_type)} ·{" "}
                      {detail.category.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">From</p>
                    <p className="font-medium">
                      {detail.complainant_name} ({detail.complainant_role})
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link href={`/admin/users/${detail.complainant_id}`}>
                        Profile
                      </Link>
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Against</p>
                    <p className="font-medium">
                      {detail.subject_name} ({detail.subject_role})
                    </p>
                    {isSubjectBlocked(detail) && (
                      <Badge variant="destructive" className="mt-1">
                        Account blocked
                      </Badge>
                    )}
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link href={`/admin/users/${detail.subject_id}`}>
                        Profile
                      </Link>
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Description</p>
                  <p className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap">
                    {detail.description}
                  </p>
                </div>

                {(detail.attachment_urls?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Proof</p>
                    <div className="flex flex-wrap gap-3">
                      {detail.attachment_urls!.map((url, i) => {
                        const full = attachmentFullUrl(url);
                        const isPdf = url.toLowerCase().endsWith(".pdf");
                        return isPdf ? (
                          <a
                            key={i}
                            href={full}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline text-sm"
                          >
                            PDF {i + 1}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <a
                            key={i}
                            href={full}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={full}
                              alt={`Proof ${i + 1}`}
                              className="h-24 w-24 rounded-md border object-cover"
                            />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/admin/messages?event_id=${detail.event_id}`}
                  >
                    View event messages
                  </Link>
                </Button>

                <div className="space-y-2">
                  <label className="text-muted-foreground">Status</label>
                  <Select value={detailStatus} onValueChange={setDetailStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="under_review">Under review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-muted-foreground">Admin notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes…"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
                {detail && isSubjectBlocked(detail) ? (
                  <Button
                    variant="outline"
                    className="text-green-600 border-green-600/40"
                    onClick={() => setUnblockTarget(detail)}
                  >
                    <CheckCircle className="mr-2 size-4" />
                    Unblock subject
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setBlockTarget(detail)}
                  >
                    <Ban className="mr-2 size-4" />
                    Block subject
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button onClick={saveDetail} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(o) => !o && setBlockTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block reported user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable{" "}
              <strong>
                {blockTarget?.subject_name || `user #${blockTarget?.subject_id}`}
              </strong>
              &apos;s account and mark this complaint as resolved with action
              &quot;user blocked&quot;. They will not be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBlockSubject();
              }}
              disabled={blocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {blocking ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Block account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!unblockTarget}
        onOpenChange={(o) => !o && setUnblockTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock reported user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-enable{" "}
              <strong>
                {unblockTarget?.subject_name ||
                  `user #${unblockTarget?.subject_id}`}
              </strong>
              &apos;s account. They will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unblocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUnblockSubject();
              }}
              disabled={unblocking}
              className="bg-green-600 text-white hover:bg-green-600/90"
            >
              {unblocking ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Unblock account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

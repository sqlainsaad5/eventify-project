"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, FileText, CheckCircle, XCircle, UserCog } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

interface AdminPayment {
  id: number;
  event_id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_type?: string | null;
  payment_date?: string | null;
  created_at?: string | null;
  event_name?: string | null;
  host_id?: number | null;
  host_name?: string | null;
  organizer_id?: number | null;
  organizer_name?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  lane?: string;
}

interface PaymentRequest {
  id: number;
  event_id: number;
  vendor_id: number;
  amount: number;
  status: string;
  description?: string | null;
  created_at?: string | null;
  event_name?: string | null;
  vendor_name?: string | null;
}

interface OrganizerPaymentRequestRow {
  id: number;
  event_id: number;
  event_name?: string | null;
  organizer_id: number;
  organizer_name?: string | null;
  host_id?: number | null;
  host_name?: string | null;
  amount: number;
  currency?: string;
  status: string;
  description?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  payment_id?: number | null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

function tabFromParam(tabParam: string | null): string {
  if (tabParam === "requests") return "requests";
  if (tabParam === "organizer-requests") return "organizer-requests";
  return "payments";
}

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(() => tabFromParam(tabParam));

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPerPage, setPaymentsPerPage] = useState(20);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [laneFilter, setLaneFilter] = useState<string>("all");

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPerPage, setRequestsPerPage] = useState(20);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [updatingReqId, setUpdatingReqId] = useState<number | null>(null);

  const [orgRequests, setOrgRequests] = useState<OrganizerPaymentRequestRow[]>([]);
  const [orgRequestsTotal, setOrgRequestsTotal] = useState(0);
  const [orgRequestsPage, setOrgRequestsPage] = useState(1);
  const [orgRequestsPerPage, setOrgRequestsPerPage] = useState(20);
  const [orgRequestsLoading, setOrgRequestsLoading] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [updatingOrgId, setUpdatingOrgId] = useState<number | null>(null);

  useEffect(() => {
    setActiveTab(tabFromParam(tabParam));
  }, [tabParam]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "payments") params.delete("tab");
    else params.set("tab", tab === "requests" ? "requests" : "organizer-requests");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const fetchPayments = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(paymentsPage));
      params.set("per_page", String(paymentsPerPage));
      const status = searchParams.get("payment_status");
      if (status) params.set("status", status);
      if (laneFilter !== "all") params.set("lane", laneFilter);
      const res = await fetch(`${getApiBase()}/api/admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Failed to load payments");
        return;
      }
      const data = await res.json();
      setPayments(data.payments ?? []);
      setPaymentsTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentsPage, paymentsPerPage, searchParams, laneFilter]);

  const fetchRequests = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(requestsPage));
      params.set("per_page", String(requestsPerPage));
      const status = searchParams.get("request_status");
      if (status) params.set("status", status);
      const res = await fetch(
        `${getApiBase()}/api/admin/payment-requests?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        toast.error("Failed to load payment requests");
        return;
      }
      const data = await res.json();
      setRequests(data.payment_requests ?? []);
      setRequestsTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load payment requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [requestsPage, requestsPerPage, searchParams]);

  const fetchOrgRequests = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setOrgRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(orgRequestsPage));
      params.set("per_page", String(orgRequestsPerPage));
      const status = searchParams.get("org_request_status");
      if (status) params.set("status", status);
      if (orgSearch.trim()) params.set("q", orgSearch.trim());
      const res = await fetch(
        `${getApiBase()}/api/admin/organizer-payment-requests?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        toast.error("Failed to load organizer payment requests");
        return;
      }
      const data = await res.json();
      setOrgRequests(data.organizer_payment_requests ?? []);
      setOrgRequestsTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load organizer payment requests");
    } finally {
      setOrgRequestsLoading(false);
    }
  }, [orgRequestsPage, orgRequestsPerPage, searchParams, orgSearch]);

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
  }, [activeTab, fetchPayments]);

  useEffect(() => {
    if (activeTab === "requests") fetchRequests();
  }, [activeTab, fetchRequests]);

  useEffect(() => {
    if (activeTab === "organizer-requests") fetchOrgRequests();
  }, [activeTab, fetchOrgRequests]);

  const updateRequestStatus = async (
    reqId: number,
    status: "approved" | "rejected" | "paid"
  ) => {
    const token = getToken();
    if (!token) return;
    setUpdatingReqId(reqId);
    try {
      const res = await fetch(
        `${getApiBase()}/api/admin/payment-requests/${reqId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        toast.error("Failed to update request");
        return;
      }
      toast.success("Request updated");
      fetchRequests();
    } catch {
      toast.error("Failed to update request");
    } finally {
      setUpdatingReqId(null);
    }
  };

  const updateOrganizerRequest = async (
    reqId: number,
    status: "paid" | "rejected"
  ) => {
    const token = getToken();
    if (!token) return;
    setUpdatingOrgId(reqId);
    try {
      const res = await fetch(
        `${getApiBase()}/api/admin/organizer-payment-requests/${reqId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errBody?.error || "Failed to update organizer request");
        return;
      }
      toast.success("Organizer request updated");
      fetchOrgRequests();
    } catch {
      toast.error("Failed to update organizer request");
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const paymentsTotalPages = Math.max(
    1,
    Math.ceil(paymentsTotal / paymentsPerPage)
  );
  const requestsTotalPages = Math.max(
    1,
    Math.ceil(requestsTotal / requestsPerPage)
  );
  const orgTotalPages = Math.max(
    1,
    Math.ceil(orgRequestsTotal / orgRequestsPerPage)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Payments
        </h1>
        <CardDescription>
          Platform payments (host or vendor settlements), vendor payout requests,
          and organizer fee requests from assigned professionals.
        </CardDescription>
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-3 gap-1">
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="size-4 shrink-0" />
            <span className="truncate">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">Vendor requests</span>
          </TabsTrigger>
          <TabsTrigger value="organizer-requests" className="gap-2">
            <UserCog className="size-4 shrink-0" />
            <span className="truncate">Organizer requests</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <Card className="rounded-2xl border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <Select
                  value={laneFilter}
                  onValueChange={(v) => {
                    setLaneFilter(v);
                    setPaymentsPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Lane" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All lanes</SelectItem>
                    <SelectItem value="vendor_settlement">Vendor settlement</SelectItem>
                    <SelectItem value="platform_or_host">Host / platform (card)</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(paymentsPerPage)}
                  onValueChange={(v) => {
                    setPaymentsPerPage(Number(v));
                    setPaymentsPage(1);
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
              {paymentsLoading ? (
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
                        <TableHead>Lane</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Organizer</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No payments found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-normal">
                                {p.lane === "vendor_settlement"
                                  ? "Vendor settlement"
                                  : "Host / platform"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {p.event_name || `Event #${p.event_id}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {p.host_name || (p.host_id != null ? `#${p.host_id}` : "—")}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {p.organizer_name ||
                                (p.organizer_id != null ? `#${p.organizer_id}` : "—")}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {p.vendor_name ||
                                (p.vendor_id != null ? `#${p.vendor_id}` : "—")}
                            </TableCell>
                            <TableCell>
                              {p.currency} {Number(p.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {p.payment_type
                                ? `${p.payment_method} (${p.payment_type})`
                                : p.payment_method}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.status === "completed"
                                    ? "default"
                                    : p.status === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {p.created_at
                                ? new Date(p.created_at).toLocaleDateString()
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {paymentsTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {paymentsPage} of {paymentsTotalPages} (
                        {paymentsTotal} total)
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (paymentsPage > 1)
                                  setPaymentsPage(paymentsPage - 1);
                              }}
                              className={
                                paymentsPage <= 1
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink href="#" isActive>
                              {paymentsPage}
                            </PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (paymentsPage < paymentsTotalPages)
                                  setPaymentsPage(paymentsPage + 1);
                              }}
                              className={
                                paymentsPage >= paymentsTotalPages
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
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <Card className="rounded-2xl border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Select
                  value={String(requestsPerPage)}
                  onValueChange={(v) => {
                    setRequestsPerPage(Number(v));
                    setRequestsPage(1);
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
              {requestsLoading ? (
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
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No payment requests found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        requests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.event_name || `Event #${r.event_id}`}
                            </TableCell>
                            <TableCell>{r.vendor_name || `#${r.vendor_id}`}</TableCell>
                            <TableCell>
                              Rs {Number(r.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "paid"
                                    ? "default"
                                    : r.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.created_at
                                ? new Date(r.created_at).toLocaleDateString()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.status === "pending" && (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    disabled={updatingReqId === r.id}
                                    onClick={() =>
                                      updateRequestStatus(r.id, "approved")
                                    }
                                  >
                                    <CheckCircle className="mr-1 size-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    disabled={updatingReqId === r.id}
                                    onClick={() =>
                                      updateRequestStatus(r.id, "rejected")
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
                  {requestsTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {requestsPage} of {requestsTotalPages} (
                        {requestsTotal} total)
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (requestsPage > 1)
                                  setRequestsPage(requestsPage - 1);
                              }}
                              className={
                                requestsPage <= 1
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink href="#" isActive>
                              {requestsPage}
                            </PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (requestsPage < requestsTotalPages)
                                  setRequestsPage(requestsPage + 1);
                              }}
                              className={
                                requestsPage >= requestsTotalPages
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
        </TabsContent>

        <TabsContent value="organizer-requests" className="mt-6">
          <Card className="rounded-2xl border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  placeholder="Search event or organizer…"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setOrgRequestsPage(1);
                    fetchOrgRequests();
                  }}
                >
                  Search
                </Button>
                <Select
                  value={String(orgRequestsPerPage)}
                  onValueChange={(v) => {
                    setOrgRequestsPerPage(Number(v));
                    setOrgRequestsPage(1);
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
              {orgRequestsLoading ? (
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
                        <TableHead>Organizer</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment #</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgRequests.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No organizer payment requests found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        orgRequests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.event_name || `Event #${r.event_id}`}
                            </TableCell>
                            <TableCell>
                              {r.organizer_name || `#${r.organizer_id}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {r.host_name || (r.host_id != null ? `#${r.host_id}` : "—")}
                            </TableCell>
                            <TableCell>
                              {r.currency || "PKR"} {Number(r.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "paid"
                                    ? "default"
                                    : r.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {r.payment_id != null ? `#${r.payment_id}` : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.status === "pending" && (
                                <div className="flex flex-wrap justify-end gap-1">
                                  {r.payment_id != null && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600"
                                      disabled={updatingOrgId === r.id}
                                      onClick={() =>
                                        updateOrganizerRequest(r.id, "paid")
                                      }
                                    >
                                      <CheckCircle className="mr-1 size-4" />
                                      Mark paid
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    disabled={updatingOrgId === r.id}
                                    onClick={() =>
                                      updateOrganizerRequest(r.id, "rejected")
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
                  {orgTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {orgRequestsPage} of {orgTotalPages} (
                        {orgRequestsTotal} total)
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (orgRequestsPage > 1)
                                  setOrgRequestsPage(orgRequestsPage - 1);
                              }}
                              className={
                                orgRequestsPage <= 1
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink href="#" isActive>
                              {orgRequestsPage}
                            </PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (orgRequestsPage < orgTotalPages)
                                  setOrgRequestsPage(orgRequestsPage + 1);
                              }}
                              className={
                                orgRequestsPage >= orgTotalPages
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

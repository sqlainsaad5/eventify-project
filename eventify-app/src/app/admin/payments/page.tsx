"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import { CreditCard, FileText, CheckCircle, XCircle } from "lucide-react";

interface AdminPayment {
  id: number;
  event_id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_date?: string | null;
  created_at?: string | null;
  event_name?: string | null;
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

const API_BASE = "http://localhost:5000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(
    tabParam === "requests" ? "requests" : "payments"
  );

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPerPage, setPaymentsPerPage] = useState(20);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPerPage, setRequestsPerPage] = useState(20);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [updatingReqId, setUpdatingReqId] = useState<number | null>(null);

  useEffect(() => {
    if (tabParam === "requests") setActiveTab("requests");
  }, [tabParam]);

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
      const res = await fetch(`${API_BASE}/api/admin/payments?${params}`, {
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
  }, [paymentsPage, paymentsPerPage, searchParams]);

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
        `${API_BASE}/api/admin/payment-requests?${params}`,
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

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
  }, [activeTab, fetchPayments]);

  useEffect(() => {
    if (activeTab === "requests") fetchRequests();
  }, [activeTab, fetchRequests]);

  const updateRequestStatus = async (
    reqId: number,
    status: "approved" | "rejected" | "paid"
  ) => {
    const token = getToken();
    if (!token) return;
    setUpdatingReqId(reqId);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/payment-requests/${reqId}`,
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

  const paymentsTotalPages = Math.max(
    1,
    Math.ceil(paymentsTotal / paymentsPerPage)
  );
  const requestsTotalPages = Math.max(
    1,
    Math.ceil(requestsTotal / requestsPerPage)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Payments
        </h1>
        <CardDescription>
          View payments and vendor payment requests. Update request status as
          needed.
        </CardDescription>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-[320px] grid-cols-2">
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="size-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="size-4" />
            Payment requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <Card className="rounded-2xl border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
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
                        <TableHead>Event</TableHead>
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
                            colSpan={5}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No payments found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.event_name || `Event #${p.event_id}`}
                            </TableCell>
                            <TableCell>
                              {p.currency} {Number(p.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>{p.payment_method}</TableCell>
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
                              ${Number(r.amount).toFixed(2)}
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
      </Tabs>
    </div>
  );
}

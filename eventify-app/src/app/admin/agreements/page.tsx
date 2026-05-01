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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

export default function AdminAgreementsPage() {
  const [tab, setTab] = useState("vendor");
  const [eventIdInput, setEventIdInput] = useState("");
  const [eventId, setEventId] = useState<number | null>(null);

  const [agreements, setAgreements] = useState<Record<string, unknown>[]>([]);
  const [agTotal, setAgTotal] = useState(0);
  const [agPage, setAgPage] = useState(1);
  const [agPerPage, setAgPerPage] = useState(20);
  const [agLoading, setAgLoading] = useState(true);

  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [itTotal, setItTotal] = useState(0);
  const [itPage, setItPage] = useState(1);
  const [itPerPage, setItPerPage] = useState(20);
  const [itLoading, setItLoading] = useState(true);

  const fetchAgreements = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAgLoading(false);
      return;
    }
    setAgLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(agPage));
      params.set("per_page", String(agPerPage));
      if (eventId != null) params.set("event_id", String(eventId));
      const res = await fetch(
        `${getApiBase()}/api/admin/vendor-agreements?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        toast.error("Failed to load vendor agreements");
        return;
      }
      const data = await res.json();
      setAgreements(data.agreements ?? []);
      setAgTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load vendor agreements");
    } finally {
      setAgLoading(false);
    }
  }, [agPage, agPerPage, eventId]);

  const fetchBudget = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setItLoading(false);
      return;
    }
    setItLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(itPage));
      params.set("per_page", String(itPerPage));
      if (eventId != null) params.set("event_id", String(eventId));
      const res = await fetch(
        `${getApiBase()}/api/admin/budget-plan-items?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        toast.error("Failed to load budget lines");
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
      setItTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load budget lines");
    } finally {
      setItLoading(false);
    }
  }, [itPage, itPerPage, eventId]);

  useEffect(() => {
    if (tab === "vendor") fetchAgreements();
  }, [tab, fetchAgreements]);

  useEffect(() => {
    if (tab === "budget") fetchBudget();
  }, [tab, fetchBudget]);

  const applyEventFilter = () => {
    const v = eventIdInput.trim();
    if (!v) {
      setEventId(null);
      setAgPage(1);
      setItPage(1);
      return;
    }
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) {
      toast.error("Event ID must be a number");
      return;
    }
    setEventId(n);
    setAgPage(1);
    setItPage(1);
  };

  const agPages = Math.max(1, Math.ceil(agTotal / agPerPage));
  const itPages = Math.max(1, Math.ceil(itTotal / itPerPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Agreements and budgets
        </h1>
        <p className="text-muted-foreground text-sm">
          Vendor agreed prices per event and host budget plan lines.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Event ID filter</label>
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
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vendor">Vendor agreements</TabsTrigger>
          <TabsTrigger value="budget">Budget plan items</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={String(agPerPage)}
              onValueChange={(v) => {
                setAgPerPage(Number(v));
                setAgPage(1);
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
          <Card>
            <CardContent className="pt-6">
              {agLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Agreed</TableHead>
                        <TableHead>Payment status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agreements.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No agreements found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        agreements.map((a) => (
                          <TableRow key={String(a.id)}>
                            <TableCell>#{String(a.event_id)}</TableCell>
                            <TableCell>
                              {String(a.vendor_name || a.vendor_id)}
                            </TableCell>
                            <TableCell>{String(a.service_type)}</TableCell>
                            <TableCell>
                              Rs {Number(a.agreed_price as number).toFixed(2)}
                            </TableCell>
                            <TableCell>{String(a.payment_status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {agPages > 1 && (
                    <div className="mt-4 flex justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {agPage} / {agPages}
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (agPage > 1) setAgPage(agPage - 1);
                              }}
                              className={
                                agPage <= 1 ? "pointer-events-none opacity-50" : ""
                              }
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink href="#" isActive>
                              {agPage}
                            </PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (agPage < agPages) setAgPage(agPage + 1);
                              }}
                              className={
                                agPage >= agPages
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

        <TabsContent value="budget" className="mt-6 space-y-4">
          <Select
            value={String(itPerPage)}
            onValueChange={(v) => {
              setItPerPage(Number(v));
              setItPage(1);
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
          <Card>
            <CardContent className="pt-6">
              {itLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No budget lines found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((i) => (
                          <TableRow key={String(i.id)}>
                            <TableCell>#{String(i.event_id)}</TableCell>
                            <TableCell>{String(i.label)}</TableCell>
                            <TableCell>
                              Rs {Number(i.allocated_amount as number).toFixed(2)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                              {String(i.notes || "—")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {itPages > 1 && (
                    <div className="mt-4 flex justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {itPage} / {itPages}
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (itPage > 1) setItPage(itPage - 1);
                              }}
                              className={
                                itPage <= 1 ? "pointer-events-none opacity-50" : ""
                              }
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink href="#" isActive>
                              {itPage}
                            </PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (itPage < itPages) setItPage(itPage + 1);
                              }}
                              className={
                                itPage >= itPages
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

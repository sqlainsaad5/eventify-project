"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { getApiBase } from "@/lib/api-base";

type ComplaintRole = "user" | "organizer" | "vendor";

interface AgainstOption {
  id: number;
  name: string;
  complaintType: string;
  roleLabel: string;
}

interface EventOption {
  id: number;
  name: string;
  against: AgainstOption[];
}

const CATEGORIES = [
  { value: "conduct", label: "Conduct / behavior" },
  { value: "service_quality", label: "Service quality" },
  { value: "payment", label: "Payment issue" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
] as const;

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_DESC = 20;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token")?.replace(/['"]+/g, "").trim() ?? null;
}

function getUserId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.id != null ? Number(user.id) : null;
  } catch {
    return null;
  }
}

function buildUserEvents(created: Record<string, unknown>[]): EventOption[] {
  return created
    .filter((e) => e.organizer_id != null)
    .map((e) => ({
      id: Number(e.id),
      name: String(e.name || `Event #${e.id}`),
      against: [
        {
          id: Number(e.organizer_id),
          name: String(e.organizer_name || `Organizer #${e.organizer_id}`),
          complaintType: "user_to_organizer",
          roleLabel: "Organizer",
        },
      ],
    }));
}

function buildOrganizerEvents(assigned: Record<string, unknown>[]): EventOption[] {
  return assigned.map((e) => {
    const against: AgainstOption[] = [];
    if (e.user_id != null) {
      against.push({
        id: Number(e.user_id),
        name: String(e.host_name || `Host #${e.user_id}`),
        complaintType: "organizer_to_user",
        roleLabel: "Host",
      });
    }
    const vendors = (e.completed_vendors as { id: number; name: string }[]) ?? [];
    const assignedIds = (e.assigned_vendor_ids as number[]) ?? [];
    const assignedNames = (e.assigned_vendors as string[]) ?? [];
    const seen = new Set<number>();
    vendors.forEach((v) => {
      if (v?.id != null && !seen.has(v.id)) {
        seen.add(v.id);
        against.push({
          id: v.id,
          name: v.name || `Vendor #${v.id}`,
          complaintType: "organizer_to_vendor",
          roleLabel: "Vendor",
        });
      }
    });
    assignedIds.forEach((vid, i) => {
      if (vid != null && !seen.has(vid)) {
        seen.add(vid);
        against.push({
          id: vid,
          name: assignedNames[i] || `Vendor #${vid}`,
          complaintType: "organizer_to_vendor",
          roleLabel: "Vendor",
        });
      }
    });
    return {
      id: Number(e.id),
      name: String(e.name || `Event #${e.id}`),
      against,
    };
  });
}

function buildVendorEvents(events: Record<string, unknown>[]): EventOption[] {
  return events
    .filter((e) => e.organizer_id != null)
    .map((e) => ({
      id: Number(e.id),
      name: String(e.name || `Event #${e.id}`),
      against: [
        {
          id: Number(e.organizer_id),
          name: String(e.organizer_name || `Organizer #${e.organizer_id}`),
          complaintType: "vendor_to_organizer",
          roleLabel: "Organizer",
        },
      ],
    }));
}

type ComplaintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ComplaintRole;
};

export function ComplaintDialog({ open, onOpenChange, role }: ComplaintDialogProps) {
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [againstKey, setAgainstKey] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedEvent = useMemo(
    () => events.find((e) => String(e.id) === eventId),
    [events, eventId]
  );

  const againstOptions = selectedEvent?.against ?? [];

  const selectedAgainst = useMemo(() => {
    if (!againstKey) return null;
    const [type, id] = againstKey.split(":");
    return againstOptions.find(
      (a) => a.complaintType === type && String(a.id) === id
    );
  }, [againstKey, againstOptions]);

  const resetForm = useCallback(() => {
    setEventId("");
    setAgainstKey("");
    setCategory("");
    setDescription("");
    setFiles([]);
    setSubmitting(false);
  }, []);

  const fetchEvents = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoadingEvents(true);
    try {
      if (role === "vendor") {
        const vendorId = getUserId();
        if (!vendorId) {
          toast.error("Could not load your profile");
          return;
        }
        const res = await fetch(
          `${getApiBase()}/api/vendors/assigned_events/${vendorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          toast.error("Failed to load events");
          return;
        }
        const data = await res.json();
        setEvents(buildVendorEvents(data.assigned_events ?? []));
      } else {
        const res = await fetch(`${getApiBase()}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error("Failed to load events");
          return;
        }
        const data = await res.json();
        if (role === "user") {
          setEvents(buildUserEvents(data.created ?? []));
        } else {
          setEvents(buildOrganizerEvents(data.assigned ?? []));
        }
      }
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }, [role]);

  useEffect(() => {
    if (open) {
      fetchEvents();
    } else {
      resetForm();
    }
  }, [open, fetchEvents, resetForm]);

  useEffect(() => {
    if (!selectedEvent) {
      setAgainstKey("");
      return;
    }
    if (selectedEvent.against.length === 1) {
      const a = selectedEvent.against[0];
      setAgainstKey(`${a.complaintType}:${a.id}`);
    } else {
      setAgainstKey("");
    }
  }, [selectedEvent]);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const next: File[] = [...files];
    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i];
      const mime = f.type || "";
      if (!mime.startsWith("image/") && mime !== "application/pdf") {
        toast.error(`${f.name}: only images or PDF allowed`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: max 5MB`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit =
    !!selectedEvent &&
    !!selectedAgainst &&
    !!category &&
    description.trim().length >= MIN_DESC &&
    files.length >= 1 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedEvent || !selectedAgainst) return;
    const token = getToken();
    if (!token) {
      toast.error("Please log in again");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("complaint_type", selectedAgainst.complaintType);
      form.append("subject_id", String(selectedAgainst.id));
      form.append("category", category);
      form.append("description", description.trim());
      files.forEach((f) => form.append("files", f));

      const res = await fetch(
        `${getApiBase()}/api/events/${selectedEvent.id}/complaints`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to submit complaint");
        return;
      }
      toast.success("Complaint submitted. Admin will review.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-5 text-destructive" />
            Report a problem
          </DialogTitle>
          <DialogDescription>
            Submit a complaint to Eventify admin with proof. At least one image or
            PDF is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Event *</Label>
            <Select
              value={eventId}
              onValueChange={setEventId}
              disabled={loadingEvents}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingEvents ? "Loading…" : "Select event"}
                />
              </SelectTrigger>
              <SelectContent>
                {events.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No eligible events
                  </SelectItem>
                ) : (
                  events.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Against *</Label>
            <Select
              value={againstKey}
              onValueChange={setAgainstKey}
              disabled={!selectedEvent || againstOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {againstOptions.map((a) => (
                  <SelectItem
                    key={`${a.complaintType}:${a.id}`}
                    value={`${a.complaintType}:${a.id}`}
                  >
                    {a.name} ({a.roleLabel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe what happened (min 20 characters)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {description.trim().length}/{MIN_DESC} min characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Proof * (1–3 files, image or PDF, max 5MB each)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_FILES}
            >
              <Paperclip className="size-4" />
              Add file
            </Button>
            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit complaint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComplaintReportButton({
  role,
}: {
  role: ComplaintRole;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 hidden sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Flag className="size-4" />
        Report
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-9 sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Report a problem"
      >
        <Flag className="size-4" />
      </Button>
      <ComplaintDialog open={open} onOpenChange={setOpen} role={role} />
    </>
  );
}

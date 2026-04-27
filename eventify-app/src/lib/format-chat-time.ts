/**
 * Formats an ISO 8601 instant (e.g. with `Z` from the API) in the user's locale/timezone.
 * Today: local time; older: short date (month + day).
 */
export function formatChatMessageTime(
  ts: string | null | undefined
): string {
  if (!ts || ts === "No messages yet") return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

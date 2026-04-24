"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarRange, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  fromValue: string
  toValue: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onClear: () => void
  className?: string
  /** Show secondary line of helper copy (e.g. on sub-pages) */
  description?: string
  /** Tighter padding for inline toolbars */
  compact?: boolean
  /** Prefix for input ids (avoid duplicates when more than one filter exists on a page) */
  idPrefix?: string
}

export function AssignedEventDateRangeFilter({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  onClear,
  className,
  description,
  compact = false,
  idPrefix = "ev-date",
}: Props) {
  const idFrom = `${idPrefix}-from`
  const idTo = `${idPrefix}-to`
  const hasRange = Boolean(fromValue || toValue)
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-violet-50/30 p-[1px] shadow-sm",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl border border-slate-100/80 bg-white/90 backdrop-blur-sm",
          compact ? "px-3 py-2.5 sm:px-4" : "px-4 py-3.5 sm:px-5 sm:py-4"
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <div
              className={cn(
                "flex shrink-0 items-start gap-3",
                !description && "sm:items-center"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100/90 to-purple-100/50 text-purple-700 ring-1 ring-purple-200/50 shadow-inner">
                <CalendarRange className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-slate-900">Event date range</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed max-w-md">
                  {description ??
                    "Uses each project’s event day—applies to approval queues, activations, and the completed list below."}
                </p>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex w-full flex-col flex-wrap items-stretch gap-3 min-[500px]:flex-row min-[500px]:items-end lg:w-auto",
              "lg:justify-end"
            )}
          >
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 min-[400px]:gap-3 min-[500px]:flex min-[500px]:flex-initial min-[500px]:gap-3">
              <div className="min-w-0 min-[500px]:w-[8.5rem]">
                <Label
                  htmlFor={idFrom}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block"
                >
                  From
                </Label>
                <Input
                  id={idFrom}
                  type="date"
                  value={fromValue}
                  onChange={(e) => onFromChange(e.target.value)}
                  className="h-10 rounded-xl border-slate-200/90 bg-slate-50/50 text-sm font-medium text-slate-800 shadow-sm transition focus-visible:border-purple-300 focus-visible:ring-2 focus-visible:ring-purple-200/50"
                />
              </div>
              <div className="min-w-0 min-[500px]:w-[8.5rem]">
                <Label
                  htmlFor={idTo}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block"
                >
                  To
                </Label>
                <Input
                  id={idTo}
                  type="date"
                  value={toValue}
                  onChange={(e) => onToChange(e.target.value)}
                  className="h-10 rounded-xl border-slate-200/90 bg-slate-50/50 text-sm font-medium text-slate-800 shadow-sm transition focus-visible:border-purple-300 focus-visible:ring-2 focus-visible:ring-purple-200/50"
                />
              </div>
            </div>
            {hasRange && (
              <Button
                type="button"
                variant="outline"
                onClick={onClear}
                className="h-10 shrink-0 gap-1.5 rounded-xl border-slate-200/90 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Clear date range"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
        {hasRange && (
          <p className="mt-3.5 border-t border-slate-100 pt-3 text-center text-xs font-medium text-slate-500 min-[500px]:text-left">
            <span className="text-slate-400">Showing events scheduled</span>{" "}
            <span className="font-semibold text-slate-700">
              {fromValue || "…"} → {toValue || "…"}
            </span>
            <span className="text-slate-400"> (inclusive)</span>
          </p>
        )}
      </div>
    </div>
  )
}

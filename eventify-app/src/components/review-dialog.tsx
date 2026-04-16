"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type ReviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Polished layout for post-settlement vendor ratings */
  variant?: "default" | "professional"
  onSubmit: (rating: number, comment: string) => Promise<void>
}

export function ReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  onSubmit,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setRating(0)
      setComment("")
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (rating < 1) return
    setSubmitting(true)
    try {
      await onSubmit(rating, comment.trim())
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const prof = variant === "professional"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md overflow-hidden p-0 gap-0",
          prof
            ? "rounded-[28px] border-0 shadow-2xl shadow-indigo-200/50 ring-1 ring-slate-200/80"
            : "rounded-3xl border-slate-100"
        )}
      >
        {prof ? (
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 px-6 pt-8 pb-6 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40 pointer-events-none" />
            <div className="relative flex items-center gap-2 text-indigo-200 mb-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Professional feedback</span>
            </div>
            <DialogHeader className="space-y-2 text-left p-0">
              <DialogTitle className="text-2xl font-black tracking-tight text-white border-0">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-indigo-100/90 font-medium text-sm leading-relaxed">
                  {description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
          </div>
        ) : (
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="text-slate-600 font-medium">{description}</DialogDescription>
              ) : null}
            </DialogHeader>
          </div>
        )}

        <div className={cn("px-6", prof ? "py-6 bg-white" : "")}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-3", prof ? "text-slate-400" : "sr-only")}>
            Overall rating
          </p>
          <div className="flex justify-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={cn(
                  "p-1 rounded-xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                  prof && "p-1.5"
                )}
                aria-label={`${n} stars`}
              >
                <Star
                  className={cn(
                    prof ? "h-11 w-11" : "h-10 w-10",
                    n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Optional private note to the vendor (max 2000 characters)"
            value={comment}
            maxLength={2000}
            onChange={(e) => setComment(e.target.value)}
            className={cn(
              "min-h-[100px] rounded-2xl font-medium mt-4",
              prof ? "border-slate-200 bg-slate-50/80 focus-visible:ring-indigo-500/20" : "border-slate-200"
            )}
          />
        </div>

        <DialogFooter
          className={cn(
            "px-6 pb-6 pt-2 gap-2 sm:gap-0 border-t",
            prof ? "bg-slate-50/90 border-slate-100" : ""
          )}
        >
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {prof ? "Later" : "Cancel"}
          </Button>
          <Button
            type="button"
            className={cn(
              "rounded-xl font-black shadow-lg",
              prof
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-200/50"
                : "bg-indigo-600 hover:bg-indigo-700"
            )}
            disabled={rating < 1 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : prof ? (
              "Submit professional review"
            ) : (
              "Submit review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

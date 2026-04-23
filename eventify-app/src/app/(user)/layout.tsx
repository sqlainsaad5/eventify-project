import type { ReactNode } from "react"
import { UserLayout } from "@/components/user-layout"

export default function UserSegmentLayout({
  children,
}: {
  children: ReactNode
}) {
  return <UserLayout>{children}</UserLayout>
}

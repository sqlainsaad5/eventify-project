"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Feedback
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Structured feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Event and peer reviews live under{" "}
            <Link href="/admin/reviews" className="text-primary underline">
              Reviews
            </Link>
            . There is no separate AI chatbot feedback store in the API yet.
          </p>
          <Button variant="outline" asChild>
            <Link href="/admin/reviews">Open reviews</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

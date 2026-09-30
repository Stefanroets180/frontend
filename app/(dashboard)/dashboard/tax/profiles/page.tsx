"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function TaxProfilesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the correct tax profile management page
    router.replace("/dashboard/tax-summary");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Page Moved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Tax profile management has moved to the Tax Summary page.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

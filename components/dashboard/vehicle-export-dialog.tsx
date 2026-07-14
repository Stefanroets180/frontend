"use client";

import { useState } from "react";
import {
  Download,
  Mail,
  Share2,
  FileText,
  FileSpreadsheet,
  FileCode,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { getSATaxYear } from "@/lib/types/database";
import { toast } from "sonner";

export type ExportFormat = "pdf" | "html" | "xls";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface VehicleExportDialogProps {
  vehicleId: string;
  vehicleLabel: string;
  disabled?: boolean;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}

async function downloadExport(
  vehicleId: string,
  format: ExportFormat,
  taxYear: number,
): Promise<void> {
  // Map frontend format to backend format
  const backendFormat = format === "xls" ? "EXCEL" : format.toUpperCase();

  const res = await apiFetch("/exports/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleId,
      format: backendFormat,
      taxYear,
      includeTrips: true,
      includeExpenses: true,
      includeFuelLogs: true,
      includeSummary: true,
    }),
  });

  if (res.status === 404) {
    throw new Error(
      "Export API not found. Restart the Spring Boot backend (mvn spring-boot:run -Dspring-boot.run.profiles=dev).",
    );
  }
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let filename = `vehicle-export.${format === "xls" ? "xlsx" : format}`;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function VehicleExportDialog({
  vehicleId,
  vehicleLabel,
  disabled,
  triggerLabel = "Export all data",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "gap-2",
}: VehicleExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [taxYear, setTaxYear] = useState(String(getSATaxYear()));
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"download" | "email" | "share" | null>(
    null,
  );

  const handleDownload = async () => {
    setLoading("download");
    try {
      await downloadExport(vehicleId, format, Number(taxYear));
      toast.success("Export downloaded");
      setOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to generate export. Is the backend running?",
      );
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async () => {
    const recipient = email.trim();
    if (!recipient) {
      toast.error("Enter an email address");
      return;
    }
    setLoading("email");
    try {
      // Map frontend format to backend format
      const backendFormat = format === "xls" ? "EXCEL" : format.toUpperCase();

      const res = await apiFetch("/exports/sars-logbook/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          format: backendFormat,
          email: recipient,
          taxYear: Number(taxYear),
          includeTrips: true,
          includeExpenses: true,
          includeFuelLogs: true,
          includeSummary: true,
        }),
      });
      if (res.status === 404) {
        throw new Error(
          "Export API not found. Restart the Spring Boot backend (mvn spring-boot:run -Dspring-boot.run.profiles=dev).",
        );
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message ?? "Email failed",
        );
      }
      toast.success(`Export sent to ${recipient}`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) {
      toast.message("Use Download, then share the file from your device");
      return;
    }
    setLoading("share");
    try {
      // Map frontend format to backend format
      const backendFormat = format === "xls" ? "EXCEL" : format.toUpperCase();

      const res = await apiFetch("/exports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          format: backendFormat,
          taxYear: Number(taxYear),
          includeTrips: true,
          includeExpenses: true,
          includeFuelLogs: true,
          includeSummary: true,
        }),
      });

      if (res.status === 404) {
        throw new Error(
          "Export API not found. Restart the Spring Boot backend.",
        );
      }
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const ext = format === "xls" ? "xlsx" : format;
      const file = new File(
        [blob],
        `vehicle-export-${vehicleLabel.replace(/\s+/g, "-")}.${ext}`,
        { type: blob.type },
      );
      await navigator.share({
        title: `Vehicle Export — ${vehicleLabel}`,
        text: `Tax year ${taxYear}/${Number(taxYear) + 1} vehicle data export`,
        files: [file],
      });
      setOpen(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Share not available — try Download instead");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          disabled={disabled}
        >
          <Download className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export complete vehicle data</DialogTitle>
          <DialogDescription>
            This is the full export for{" "}
            <span className="font-medium text-foreground">{vehicleLabel}</span>:
            trips, expenses, fuel logs, summaries and compliance records for the
            selected tax year
            {format !== "xls" && ", plus captured invoices in PDF or HTML"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              name="format"
            >
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> PDF (with invoices)
                  </span>
                </SelectItem>
                <SelectItem value="html">
                  <span className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" /> HTML (with invoices)
                  </span>
                </SelectItem>
                <SelectItem value="xls">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Excel (data only)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {format === "xls" && (
              <p className="text-xs text-muted-foreground">
                Excel exports include receipt URLs but not embedded images.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-tax-year">Tax year (starts March)</Label>
            <Select value={taxYear} onValueChange={setTaxYear} name="taxYear">
              <SelectTrigger id="export-tax-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2].map((offset) => {
                  const y = getSATaxYear() - offset;
                  return (
                    <SelectItem key={y} value={String(y)}>
                      {y}/{y + 1}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-email">Email to (optional)</Label>
            <Input
              id="export-email"
              name="exportEmail"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full gap-2"
            onClick={handleDownload}
            disabled={loading !== null}
          >
            {loading === "download" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
          </Button>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleEmail}
              disabled={loading !== null || !email.trim()}
            >
              {loading === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Email
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleShare}
              disabled={loading !== null}
            >
              {loading === "share" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  XCircle,
  Camera,
  MapPin,
  Clock,
  Car,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Upload,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OdometerReadingType,
  getTaxYearReadingWindow,
  getSATaxYear,
} from "@/lib/types/database";
import type { EntryImage } from "@/lib/types/database";
import { api, API_URL, apiForm } from "@/lib/api/client";

interface OdometerVerificationRecord {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  taxYear: number;
  readingType: OdometerReadingType;
  odometerValue: number;
  imageUrlAvif: string;
  capturedAt: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  createdAt: string;
  // Lock fields
  isLocked?: boolean;
  lockedAt?: Date;
  lockedByName?: string;
  lockedReason?: string;
}

interface TaxReadinessAuditProps {
  className?: string;
}

/**
 * Tax Readiness Audit View
 *
 * Displays the time-stamped opening and closing odometer photos for each tax year.
 * Provides a visual audit trail for SARS compliance with edit, delete, and lock capabilities.
 */
export function TaxReadinessAudit({ className }: TaxReadinessAuditProps) {
  const [selectedYear, setSelectedYear] = useState<number>(getSATaxYear());
  const [verifications, setVerifications] = useState<
    OdometerVerificationRecord[]
  >([]);
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; registrationNumber: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isOpeningWindow, isClosingWindow } = getTaxYearReadingWindow();

  // Generate available tax years (last 5 years)
  const currentYear = getSATaxYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all vehicles
        const { data: vehiclesData } = await api.get("/vehicles");
        const vehicleList = Array.isArray(vehiclesData) ? vehiclesData : [];
        setVehicles(
          vehicleList.map((v: any) => ({
            id: String(v.id),
            registrationNumber: String(v.registrationNumber ?? ""),
          })),
        );

        // Fetch verifications
        const { data } = await api.get(
          `/compliance/odometer?taxYear=${selectedYear}`,
        );
        const rows = Array.isArray(data) ? data : [];

        const mapped: OdometerVerificationRecord[] = rows.map((v: any) => {
          const id = String(v.id);

          let lockedAt: Date | undefined;
          if (v.lockedAt) {
            const d = new Date(String(v.lockedAt));
            if (!Number.isNaN(d.getTime())) {
              lockedAt = d;
            }
          }

          return {
            id,
            vehicleId: String(v.vehicleId),
            vehicleReg: String(v.vehicleReg ?? ""),
            taxYear: Number(v.taxYear),
            readingType: v.readingType as OdometerReadingType,
            odometerValue: Number(v.odometerValue),
            imageUrlAvif: String(v.imageUrl ?? ""),
            capturedAt: String(v.capturedAt ?? ""),
            createdAt: String(v.capturedAt ?? ""),
            isLocked: typeof v.isLocked === "boolean" ? v.isLocked : undefined,
            lockedAt,
            lockedByName: v.lockedByName ? String(v.lockedByName) : undefined,
            lockedReason: v.lockedReason ? String(v.lockedReason) : undefined,
          };
        });

        setVerifications(mapped);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Group verifications by vehicle and include all vehicles
  const vehicleVerifications = vehicles.reduce(
    (acc, v) => {
      acc[v.id] = {
        vehicleReg: v.registrationNumber,
        opening: undefined,
        closing: undefined,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        vehicleReg: string;
        opening?: OdometerVerificationRecord;
        closing?: OdometerVerificationRecord;
      }
    >,
  );

  // Merge verifications into vehicle map
  verifications.forEach((v) => {
    if (!vehicleVerifications[v.vehicleId]) {
      vehicleVerifications[v.vehicleId] = {
        vehicleReg: v.vehicleReg,
        opening: undefined,
        closing: undefined,
      };
    }
    if (v.readingType === OdometerReadingType.OPENING) {
      vehicleVerifications[v.vehicleId].opening = v;
    } else {
      vehicleVerifications[v.vehicleId].closing = v;
    }
  });

  const displayVehicles = Object.entries(vehicleVerifications);

  const handleDeleteVerification = async (verificationId: string) => {
    try {
      await api.delete(`/odometer-verifications/${verificationId}`);
      setVerifications((prev) => prev.filter((v) => v.id !== verificationId));
    } catch (error) {
      console.error("Failed to delete verification:", error);
      throw error;
    }
  };

  const handleLockVerification = async (
    verificationId: string,
    reason?: string,
  ) => {
    try {
      const { data } = await api.post(
        `/odometer-verifications/${verificationId}/lock?reason=${encodeURIComponent(reason ?? "")}`,
        {},
      );
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === String((data as any).id)
            ? {
                ...v,
                isLocked: Boolean((data as any).isLocked ?? true),
                lockedAt: (data as any).lockedAt
                  ? new Date(String((data as any).lockedAt))
                  : undefined,
                lockedReason: (data as any).lockedReason
                  ? String((data as any).lockedReason)
                  : undefined,
                lockedByName: (data as any).lockedByName
                  ? String((data as any).lockedByName)
                  : v.lockedByName,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to lock verification:", err);
      throw err;
    }
  };

  const handleUnlockVerification = async (verificationId: string) => {
    try {
      const { data } = await api.post(
        `/odometer-verifications/${verificationId}/unlock`,
        {},
      );
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === String((data as any).id)
            ? {
                ...v,
                isLocked: false,
                lockedAt: undefined,
                lockedReason: undefined,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to unlock verification:", err);
      throw err;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tax Readiness Audit
            </CardTitle>
            <CardDescription>
              Review your SARS-compliant odometer verification photos
            </CardDescription>
          </div>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}/{year + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="font-medium text-sm">
            Important for SARS tax completion
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Make sure your{" "}
            <span className="font-medium text-foreground">OPENING Reading</span>{" "}
            has both the odometer image and the actual odometer reading. If
            everything is correct, lock it so it moves from pending to a
            confirmed opening record for the tax year. Then add the{" "}
            <span className="font-medium text-foreground">CLOSING Reading</span>{" "}
            odometer reading and image at the end of the tax year to complete
            your SARS tax records.
          </p>
        </div>

        {/* Current Window Status */}
        {(isOpeningWindow || isClosingWindow) && (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg",
              isOpeningWindow
                ? "bg-blue-500/10 text-blue-600"
                : "bg-orange-500/10 text-orange-600",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">
                {isOpeningWindow
                  ? "Opening Reading Window Active"
                  : "Closing Reading Window Active"}
              </p>
              <p className="text-sm opacity-80">
                {isOpeningWindow
                  ? "Submit your opening odometer reading for the new tax year in March."
                  : "Submit your closing odometer reading for the current tax year in February."}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {displayVehicles.map(([vehicleId, data]) => (
              <VehicleVerificationCard
                key={vehicleId}
                vehicleId={vehicleId as string}
                vehicleReg={data.vehicleReg}
                opening={data.opening}
                closing={data.closing}
                taxYear={selectedYear}
                onDelete={handleDeleteVerification}
                onLock={handleLockVerification}
                onUnlock={handleUnlockVerification}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="border-t pt-4 mt-6">
          <p className="text-xs text-muted-foreground mb-2">Reading status:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-3 w-3" /> Needs confirmation
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <XCircle className="h-3 w-3" /> Missing
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <Lock className="h-3 w-3" /> Confirmed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface VehicleVerificationCardProps {
  vehicleId: string;
  vehicleReg: string;
  opening?: OdometerVerificationRecord;
  closing?: OdometerVerificationRecord;
  taxYear: number;
  onDelete: (id: string) => Promise<void>;
  onLock: (id: string, reason?: string) => Promise<void>;
  onUnlock: (id: string) => Promise<void>;
}

function VehicleVerificationCard({
  vehicleId,
  vehicleReg,
  opening,
  closing,
  taxYear,
  onDelete,
  onLock,
  onUnlock,
}: VehicleVerificationCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Vehicle Header */}
      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{vehicleReg}</span>
        </div>
        <Badge variant={opening && closing ? "default" : "secondary"}>
          {opening && closing
            ? "Both readings added"
            : opening || closing
              ? "One reading added"
              : "No readings yet"}
        </Badge>
      </div>

      {/* Readings Grid */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
        <ReadingCard
          type="OPENING"
          vehicleId={vehicleId}
          record={opening}
          taxYear={taxYear}
          onDelete={onDelete}
          onLock={onLock}
          onUnlock={onUnlock}
        />
        <ReadingCard
          type="CLOSING"
          vehicleId={vehicleId}
          record={closing}
          taxYear={taxYear}
          onDelete={onDelete}
          onLock={onLock}
          onUnlock={onUnlock}
        />
      </div>
    </div>
  );
}

interface ReadingCardProps {
  type: "OPENING" | "CLOSING";
  vehicleId: string;
  record?: OdometerVerificationRecord;
  taxYear: number;
  onDelete: (id: string) => Promise<void>;
  onLock: (id: string, reason?: string) => Promise<void>;
  onUnlock: (id: string) => Promise<void>;
}

function ReadingCard({
  type,
  vehicleId,
  record,
  taxYear,
  onDelete,
  onLock,
  onUnlock,
}: ReadingCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOdometerValue, setEditOdometerValue] = useState<string>("");
  const [editCapturedAtLocal, setEditCapturedAtLocal] = useState<string>("");
  const router = useRouter();

  const isOpening = type === "OPENING";
  const expectedMonth = isOpening ? "March" : "February";
  const expectedYear = isOpening ? taxYear : taxYear + 1;
  const isLocked = record?.isLocked ?? false;

  useEffect(() => {
    if (record && showEditDialog) {
      setEditOdometerValue(
        typeof record.odometerValue === "number" &&
          !Number.isNaN(record.odometerValue)
          ? String(record.odometerValue)
          : "",
      );

      if (record.capturedAt) {
        const d = new Date(record.capturedAt);
        if (!Number.isNaN(d.getTime())) {
          const tzOffsetMs = d.getTimezoneOffset() * 60000;
          const local = new Date(d.getTime() - tzOffsetMs)
            .toISOString()
            .slice(0, 16);
          setEditCapturedAtLocal(local);
        } else {
          setEditCapturedAtLocal("");
        }
      } else {
        setEditCapturedAtLocal("");
      }
    }
  }, [record, showEditDialog]);

  const handleDelete = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      await onDelete(record.id);
      setShowDeleteDialog(false);
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLock = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      await onLock(record.id, lockReason || undefined);
      setShowLockDialog(false);
      setLockReason("");
    } catch (err) {
      console.error("Failed to lock:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      await onUnlock(record.id);
      setShowUnlockDialog(false);
    } catch (err) {
      console.error("Failed to unlock:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("photo", selectedFile);

        const { data } = await apiForm.post(
          `/compliance/odometer/${record.id}/photo`,
          formData,
        );

        (record as any).imageUrlAvif = String(
          (data as any)?.imageUrl ?? record.imageUrlAvif,
        );
        if ((data as any)?.capturedAt) {
          (record as any).capturedAt = String((data as any).capturedAt);
        }
      }

      const payload: Record<string, unknown> = {};

      const trimmedOdo = editOdometerValue.trim();
      if (trimmedOdo.length > 0) {
        const numericOdo = Number(trimmedOdo.replace(/,/g, ""));
        if (!Number.isNaN(numericOdo)) {
          payload.odometerValue = numericOdo;
        }
      }

      if (editCapturedAtLocal) {
        const localDate = new Date(editCapturedAtLocal);
        if (!Number.isNaN(localDate.getTime())) {
          payload.capturedAt = localDate.toISOString();
        }
      }

      if (Object.keys(payload).length > 0) {
        const { data: updated } = await api.patch(
          `/compliance/odometer/${record.id}`,
          payload,
        );

        if ((updated as any)?.odometerValue != null) {
          (record as any).odometerValue = Number(
            (updated as any).odometerValue,
          );
        }
        if ((updated as any)?.capturedAt) {
          (record as any).capturedAt = String((updated as any).capturedAt);
        }
      }

      setShowEditDialog(false);
      setSelectedFile(null);
    } catch (err) {
      console.error("Failed to save odometer changes:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              record ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {type} Reading
          </span>
          {record ? (
            isLocked ? (
              <Lock className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {expectedMonth} {expectedYear}
        </span>
      </div>

      {record ? (
        <div className="space-y-3">
          {/* Photo Thumbnail */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative group">
            <img
              src={record.imageUrlAvif}
              alt={`${type} odometer reading`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback for missing images in demo
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"%3E%3Crect fill="%23374151" width="100" height="60"/%3E%3Ctext x="50" y="35" text-anchor="middle" fill="%239CA3AF" font-size="8"%3EOdometer Photo%3C/text%3E%3C/svg%3E';
              }}
            />

            {/* Lock indicator on image */}
            {isLocked && (
              <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1.5">
                <Lock className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Action buttons overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(record.imageUrlAvif, "_blank")}
                title="View full image"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              {!isLocked && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowEditDialog(true)}
                  title="Edit reading / Replace photo"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {!isLocked && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Delete reading"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  isLocked ? setShowUnlockDialog(true) : setShowLockDialog(true)
                }
                title={
                  isLocked ? "Re-open record for editing" : "Confirm record"
                }
              >
                {isLocked ? (
                  <Unlock className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Reading Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Odometer:</span>
              <span className="font-mono font-medium">
                {record.odometerValue.toLocaleString()} km
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Captured:
              </span>
              <span className="text-xs">
                {new Date(record.capturedAt).toLocaleString("en-ZA")}
              </span>
            </div>
            {record.gpsLatitude && record.gpsLongitude && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location:
                </span>
                <a
                  href={`https://maps.google.com/?q=${record.gpsLatitude},${record.gpsLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View on Map
                </a>
              </div>
            )}
            {isLocked && record.lockedReason && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Confirmation note:
                </span>
                <span className="text-xs text-amber-600">
                  {record.lockedReason}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons below image */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {!isLocked && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1",
                isLocked && "text-amber-600 hover:text-amber-700",
              )}
              onClick={() =>
                isLocked ? setShowUnlockDialog(true) : setShowLockDialog(true)
              }
            >
              {isLocked ? (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Re-open for editing
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Confirm record
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-sm">No reading submitted</span>
          <span className="text-xs mt-1">
            Expected: {expectedMonth} {expectedYear}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              const readingType = isOpening
                ? OdometerReadingType.OPENING
                : OdometerReadingType.CLOSING;
              router.push(
                `/dashboard/odometer-verification?vehicleId=${vehicleId}&type=${readingType}`,
              );
            }}
          >
            <Upload className="h-3 w-3 mr-1" />
            Take Photo
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {type} Reading
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this odometer verification? This
              action cannot be undone and may affect your SARS compliance
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirm {type} Reading
            </DialogTitle>
            <DialogDescription>
              Confirming this odometer reading will prevent it from being edited
              or deleted. This is recommended for SARS audit compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lockReason">Confirmation note (optional)</Label>
              <Input
                id="lockReason"
                placeholder="e.g., Tax year checked, Confirmed for SARS"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleLock} disabled={isProcessing}>
              {isProcessing ? "Confirming..." : "Confirm record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Re-open {type} Record for Editing
            </DialogTitle>
            <DialogDescription>
              Re-opening this confirmed odometer record will allow it to be
              edited or deleted. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          {record?.lockedAt && (
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed at:</span>
                <span>{new Date(record.lockedAt).toLocaleString("en-ZA")}</span>
              </div>
              {record.lockedByName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed by:</span>
                  <span>{record.lockedByName}</span>
                </div>
              )}
              {record.lockedReason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Confirmation note:
                  </span>
                  <span>{record.lockedReason}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlockDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleUnlock} disabled={isProcessing}>
              {isProcessing ? "Re-opening..." : "Re-open for editing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Reupload Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit {type} Reading
            </DialogTitle>
            <DialogDescription>
              You can update the odometer value, captured time and optionally
              replace the photo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current image preview */}
            {record && (
              <div className="space-y-2">
                <Label>Current Photo</Label>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={record.imageUrlAvif}
                    alt="Current odometer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-odometer">Odometer (km)</Label>
                    <Input
                      id="edit-odometer"
                      type="number"
                      inputMode="decimal"
                      value={editOdometerValue}
                      onChange={(e) => setEditOdometerValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-captured-at">Captured at</Label>
                    <Input
                      id="edit-captured-at"
                      type="datetime-local"
                      value={editCapturedAtLocal}
                      onChange={(e) => setEditCapturedAtLocal(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Current:{" "}
                      {new Date(record.capturedAt).toLocaleString("en-ZA")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* New image upload */}
            <div className="space-y-2">
              <Label>Replace with new photo</Label>
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="New odometer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}{" "}
                    KB)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      fileInputRef.current?.click();
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Choose different photo
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 mr-2" />
                  Select new photo
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedFile(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

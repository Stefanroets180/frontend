"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
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
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface FleetAssignmentHistoryExportDialogProps {
  disabled?: boolean;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}

interface AssignmentInfo {
  driverName: string;
  driverEmail: string;
  assignedAt: string;
  unassignedAt: string | null;
  assignedByName: string;
  assignedByEmail: string;
  status: string;
  odometerAtAssignment: number | null;
  odometerConfirmationImageUrl: string | null;
  vehicleCondition?: string | null;
  conditionNotes?: string | null;
  conditionReportImageUrl?: string | null;
  conditionReportCompletedByName?: string | null;
  conditionReportCompletedAt?: string | null;
}

interface FleetAssignmentHistory {
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  currentOdometer: number | null;
  currentDriver: AssignmentInfo | null;
  previousDriver: AssignmentInfo | null;
}

async function downloadAssignmentHistory(
  includeConditionReports: boolean,
): Promise<void> {
  const res = await apiFetch(
    `/vehicles/fleet/assignment-history?includeConditionReports=${includeConditionReports}`,
    {
      method: "GET",
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch assignment history (${res.status})`);
  }

  const data: FleetAssignmentHistory[] = await res.json();

  // Generate CSV
  const headers = [
    "Vehicle Registration",
    "Make",
    "Model",
    "Current Odometer",
    "Current Driver Name",
    "Current Driver Email",
    "Current Driver Assigned At",
    "Current Driver Assigned By",
    "Current Driver Odometer at Assignment",
    "Previous Driver Name",
    "Previous Driver Email",
    "Previous Driver Assigned At",
    "Previous Driver Assigned By",
    "Previous Driver Odometer at Assignment",
  ];

  if (includeConditionReports) {
    headers.push(
      "Current Vehicle Condition",
      "Current Condition Notes",
      "Previous Vehicle Condition",
      "Previous Condition Notes",
    );
  }

  const rows = data.map((vehicle) => [
    vehicle.vehicleRegistration,
    vehicle.vehicleMake,
    vehicle.vehicleModel,
    vehicle.currentOdometer?.toString() || "",
    vehicle.currentDriver?.driverName || "",
    vehicle.currentDriver?.driverEmail || "",
    vehicle.currentDriver?.assignedAt || "",
    vehicle.currentDriver?.assignedByName || "",
    vehicle.currentDriver?.odometerAtAssignment?.toString() || "",
    vehicle.previousDriver?.driverName || "",
    vehicle.previousDriver?.driverEmail || "",
    vehicle.previousDriver?.assignedAt || "",
    vehicle.previousDriver?.assignedByName || "",
    vehicle.previousDriver?.odometerAtAssignment?.toString() || "",
    ...(includeConditionReports
      ? [
          vehicle.currentDriver?.vehicleCondition || "",
          vehicle.currentDriver?.conditionNotes || "",
          vehicle.previousDriver?.vehicleCondition || "",
          vehicle.previousDriver?.conditionNotes || "",
        ]
      : []),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fleet-assignment-history-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FleetAssignmentHistoryExportDialog({
  disabled = false,
  triggerLabel = "Export All",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName = "",
}: FleetAssignmentHistoryExportDialogProps) {
  const { user } = useAuth();
  const { data: permissions } = usePermissions(user?.organizationId || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [includeConditionReports, setIncludeConditionReports] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const hasPermission =
    isSuperAdmin || permissions?.["FLEET_STATUS"]?.["VIEW_FLEET_STATUS"];

  if (!hasPermission) {
    return null;
  }

  const handleExport = async () => {
    setLoading(true);
    try {
      await downloadAssignmentHistory(includeConditionReports);
      toast.success("Fleet assignment history exported successfully");
      setOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export assignment history",
      );
    } finally {
      setLoading(false);
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
          <Download className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Fleet Assignment History</DialogTitle>
          <DialogDescription>
            Generate a comprehensive report showing vehicle assignments, driver
            history, and odometer readings for all fleet vehicles.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeConditionReports"
              checked={includeConditionReports}
              onCheckedChange={(checked) =>
                setIncludeConditionReports(checked as boolean)
              }
            />
            <label
              htmlFor="includeConditionReports"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include vehicle condition reports
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            This report includes:
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>Vehicle registration, make, and model</li>
            <li>Current odometer reading</li>
            <li>Current driver assignment details</li>
            <li>Previous driver assignment history</li>
            <li>Odometer readings at each assignment</li>
            <li>Who assigned each driver (name and email)</li>
            {includeConditionReports && (
              <li>Vehicle condition reports (if available)</li>
            )}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, X, Car } from "lucide-react";
import { useAssistants, UserAssistantDTO } from "@/hooks/useAssistants";
import { useVehicles } from "@/hooks/use-vehicles";
import { toast } from "sonner";

interface AddAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAssistantDialog({ open, onOpenChange }: AddAssistantDialogProps) {
  const { addAssistant, lookupUser, isAdding } = useAssistants();
  const { data: vehicles } = useVehicles();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ASSISTANT_LOW" | "ASSISTANT_HIGH">("ASSISTANT_LOW");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundUser, setFoundUser] = useState<UserAssistantDTO | null>(null);
  const [lookupError, setLookupError] = useState("");

  const handleLookup = async () => {
    if (!email || !email.includes("@")) {
      setLookupError("Please enter a valid email address");
      return;
    }

    setIsLookingUp(true);
    setLookupError("");
    setFoundUser(null);

    try {
      const user = await lookupUser(email);
      setFoundUser(user);
    } catch (error: any) {
      setLookupError(error.response?.data?.message || "User not found or cannot be added as assistant");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAdd = () => {
    if (!foundUser) {
      toast.error("Please look up a user first");
      return;
    }

    addAssistant(
      {
        assistantId: foundUser.assistantId,
        assistantRole: role,
        dateRangeStart: dateRangeStart || undefined,
        dateRangeEnd: dateRangeEnd || undefined,
        assignedVehicleId: assignedVehicleId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Assistant added successfully");
          onOpenChange(false);
          resetForm();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || "Failed to add assistant");
        },
      }
    );
  };

  const resetForm = () => {
    setEmail("");
    setRole("ASSISTANT_LOW");
    setDateRangeStart("");
    setDateRangeEnd("");
    setAssignedVehicleId("");
    setFoundUser(null);
    setLookupError("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Assistant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="assistant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                disabled={isLookingUp || !!foundUser}
              />
              {!foundUser && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookup}
                  disabled={isLookingUp}
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Lookup"
                  )}
                </Button>
              )}
              {foundUser && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFoundUser(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {lookupError && (
              <p className="text-sm text-destructive">{lookupError}</p>
            )}
          </div>

          {foundUser && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{foundUser.assistantFirstName} {foundUser.assistantLastName}</p>
                <p className="text-sm text-muted-foreground">{foundUser.assistantEmail}</p>
              </div>
              <Badge variant="secondary">Found</Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Access Level</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSISTANT_LOW">
                  <div className="flex flex-col">
                    <span className="font-medium">View Only</span>
                    <span className="text-xs text-muted-foreground">
                      Can view expenses and logbook, export reports
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ASSISTANT_HIGH">
                  <div className="flex flex-col">
                    <span className="font-medium">Edit Access</span>
                    <span className="text-xs text-muted-foreground">
                      Can view, add, and edit expenses and logbook entries
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRangeStart">Date Range Start (Optional)</Label>
              <Input
                id="dateRangeStart"
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateRangeEnd">Date Range End (Optional)</Label>
              <Input
                id="dateRangeEnd"
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Assigned Vehicle (Optional)</Label>
            <Select value={assignedVehicleId} onValueChange={setAssignedVehicleId}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="All vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>All vehicles</span>
                  </div>
                </SelectItem>
                {vehicles?.map((vehicle: any) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>{vehicle.registrationNumber}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If specified, the assistant will only have access to this vehicle's expenses and logbook entries.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!foundUser || isAdding}>
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Assistant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

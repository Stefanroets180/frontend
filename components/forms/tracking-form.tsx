"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, MapPin } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TRACKING_SUBSCRIPTION_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { API_URL } from "@/lib/api/client";
import { useEffect } from "react";

const trackingSchema = z.object({
  vehicleId: z.string().optional(),
  date: z.date({ required_error: "Select a date" }),
  providerName: z.string().min(1, "Enter provider name"),
  subscriptionType: z.enum(["MONTHLY", "ANNUAL", "ONCE_OFF"]),
  monthlyFeeZar: z.coerce.number().positive("Enter monthly fee"),
  subscriptionStartDate: z.date({
    required_error: "Select subscription start date",
  }),
  subscriptionEndDate: z.date().optional(),
  deviceSerialNumber: z.string().optional(),
  deviceType: z.string().optional(),
  installationDate: z.date().optional(),
  installationFeeZar: z.coerce.number().optional(),
  contractDurationMonths: z.coerce.number().optional(),
  recoveryIncluded: z.boolean().default(false),
  appLoginEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

type TrackingInput = z.infer<typeof trackingSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface TrackingFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: TrackingInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<TrackingInput>;
}

export function TrackingForm({
  vehicles,
  onSubmit,
  initialData,
  mode,
  existingImages = [],
}: TrackingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log("TrackingForm - useEffect triggered:", {
      mode,
      existingImagesLength: existingImages.length,
      previewUrl,
    });
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      console.log("TrackingForm - Setting previewUrl from:", firstImage);
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TrackingInput>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      vehicleId: "",
      date: new Date(),
      subscriptionType: "MONTHLY",
      recoveryIncluded: false,
      subscriptionStartDate: new Date(),
      ...initialData,
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchSubscriptionType = watch("subscriptionType");
  const watchSubscriptionStart = watch("subscriptionStartDate");
  const watchSubscriptionEnd = watch("subscriptionEndDate");
  const watchInstallDate = watch("installationDate");
  const watchRecovery = watch("recoveryIncluded");
  const requiresNewReceipt = mode === "create";

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid image file");
      return;
    }

    setImageError(null);
    setIsCompressing(true);

    try {
      const processed = await processReceiptImage(file);
      const processedFile = new File([processed.blob], file.name, {
        type: processed.format,
      });
      setReceiptImage(processedFile);
      setPreviewUrl(URL.createObjectURL(processed.blob));
      setCompressionInfo({
        originalSize: processed.originalSize,
        compressedSize: processed.convertedSize,
      });
    } catch (err) {
      setImageError("Failed to process image. Please try again.");
    } finally {
      setIsCompressing(false);
    }
  };

  const clearImage = () => {
    setReceiptImage(null);
    setPreviewUrl(null);
    setCompressionInfo(null);
    setImageError(null);
  };

  const handleFormSubmit = async (data: TrackingInput) => {
    if (requiresNewReceipt && !receiptImage) {
      setImageError("Please capture a receipt image");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(data, receiptImage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-violet-500" />
          Vehicle Tracking Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Vehicle */}
          {mode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={watchVehicleId}
                onValueChange={(val) => setValue("vehicleId", val)}
                name="vehicleId"
              >
                <SelectTrigger
                  id="vehicleId"
                  className={errors.vehicleId ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && (
                <p className="text-sm text-red-500">
                  {errors.vehicleId.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <div className="h-12 px-3 flex items-center rounded-md border border-input bg-muted text-sm">
                {(() => {
                  const vehicle = vehicles.find(
                    (v) => v.id === initialData?.vehicleId,
                  );
                  return vehicle
                    ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}`
                    : "Unknown";
                })()}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchDate && "text-muted-foreground",
                    errors.date && "border-red-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchDate ? format(watchDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchDate}
                  onSelect={(date) => date && setValue("date", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="providerName">Provider Name</Label>
            <Input
              id="providerName"
              placeholder="e.g., Tracker, Netstar, Cartrack"
              {...register("providerName")}
              className={errors.providerName ? "border-red-500" : ""}
            />
            {errors.providerName && (
              <p className="text-sm text-red-500">
                {errors.providerName.message}
              </p>
            )}
          </div>

          {/* Subscription Type */}
          <div className="space-y-2">
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select
              value={watchSubscriptionType}
              onValueChange={(val) => setValue("subscriptionType", val as any)}
              name="subscriptionType"
            >
              <SelectTrigger id="subscriptionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRACKING_SUBSCRIPTION_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Monthly Fee */}
          <div className="space-y-2">
            <Label htmlFor="monthlyFeeZar">Monthly Fee (ZAR)</Label>
            <Input
              id="monthlyFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("monthlyFeeZar")}
              className={errors.monthlyFeeZar ? "border-red-500" : ""}
            />
            {errors.monthlyFeeZar && (
              <p className="text-sm text-red-500">
                {errors.monthlyFeeZar.message}
              </p>
            )}
          </div>

          {/* Subscription Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionStartDate">Subscription Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="subscriptionStartDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchSubscriptionStart && "text-muted-foreground",
                      errors.subscriptionStartDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchSubscriptionStart
                      ? format(watchSubscriptionStart, "PP")
                      : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchSubscriptionStart}
                    onSelect={(date) =>
                      date && setValue("subscriptionStartDate", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionEndDate">
                Subscription End (Optional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="subscriptionEndDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchSubscriptionEnd && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchSubscriptionEnd
                      ? format(watchSubscriptionEnd, "PP")
                      : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchSubscriptionEnd}
                    onSelect={(date) =>
                      date && setValue("subscriptionEndDate", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Installation Fee & Contract Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installationFeeZar">Installation Fee (ZAR)</Label>
              <Input
                id="installationFeeZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("installationFeeZar")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractDurationMonths">
                Contract Duration (Months)
              </Label>
              <Input
                id="contractDurationMonths"
                type="number"
                placeholder="24"
                {...register("contractDurationMonths")}
              />
            </div>
          </div>

          {/* Device Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceSerialNumber">
                Device Serial (Optional)
              </Label>
              <Input
                id="deviceSerialNumber"
                placeholder="Serial number"
                {...register("deviceSerialNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type (Optional)</Label>
              <Input
                id="deviceType"
                placeholder="e.g., GPS, GSM"
                {...register("deviceType")}
              />
            </div>
          </div>

          {/* Installation Date */}
          <div className="space-y-2">
            <Label htmlFor="installationDate">
              Installation Date (Optional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="installationDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchInstallDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchInstallDate
                    ? format(watchInstallDate, "PPP")
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchInstallDate}
                  onSelect={(date) =>
                    date && setValue("installationDate", date)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Recovery Service */}
          <div className="flex items-center space-x-2">
            <Switch
              id="recoveryIncluded"
              checked={watchRecovery}
              onCheckedChange={(checked) =>
                setValue("recoveryIncluded", checked)
              }
            />
            <Label htmlFor="recoveryIncluded">Recovery Service Included</Label>
          </div>

          {/* App Login */}
          <div className="space-y-2">
            <Label htmlFor="appLoginEmail">App Login Email (Optional)</Label>
            <Input
              id="appLoginEmail"
              type="email"
              placeholder="email@example.com"
              {...register("appLoginEmail")}
            />
          </div>

          {/* Support Phone */}
          <div className="space-y-2">
            <Label htmlFor="supportPhone">Support Phone (Optional)</Label>
            <Input
              id="supportPhone"
              placeholder="Support contact"
              {...register("supportPhone")}
            />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label htmlFor="features">Features (Optional)</Label>
            <Textarea
              id="features"
              placeholder="e.g., Live tracking, Geofencing, Battery backup..."
              {...register("features")}
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Receipt Image */}
          <div className="space-y-2">
            <Label htmlFor="receipt-image" className="flex items-center gap-2">
              Receipt Image
              {mode === "create" && (
                <span className="text-xs text-destructive">(Required)</span>
              )}
            </Label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="receipt-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCompressing}
                  className={imageError ? "border-red-500" : ""}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isCompressing
                    ? "Processing..."
                    : receiptImage
                      ? "Change Photo"
                      : "Capture Receipt"}
                </Button>
              </div>
              {receiptImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearImage}
                >
                  Remove
                </Button>
              )}
            </div>
            {imageError && <p className="text-sm text-red-500">{imageError}</p>}
            {compressionInfo && (
              <p className="text-xs text-green-600">
                Image compressed: {formatFileSize(compressionInfo.originalSize)}{" "}
                → {formatFileSize(compressionInfo.compressedSize)}
              </p>
            )}
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="max-h-48 rounded-lg border object-contain"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || (mode === "create" && !receiptImage)}
          >
            {isSubmitting ? "Saving..." : "Save Tracking Subscription"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

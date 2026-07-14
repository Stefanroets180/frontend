"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, FileCheck } from "lucide-react";
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
import {
  LICENSE_TYPE_LABELS,
  LICENSE_RENEWAL_METHOD_LABELS,
} from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";

const licenseSchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  licenseType: z.enum([
    "VEHICLE_LICENSE",
    "DRIVERS_LICENSE",
    "PDP",
    "OPERATING_LICENSE",
  ]),
  licenseNumber: z.string().optional(),
  registrationAuthority: z.string().optional(),
  previousExpiryDate: z.date().optional(),
  newExpiryDate: z.date({ required_error: "Select new expiry date" }),
  renewalFeeZar: z.coerce.number().positive("Enter renewal fee"),
  penaltiesZar: z.coerce.number().optional(),
  arrearsZar: z.coerce.number().optional(),
  transactionNumber: z.string().optional(),
  renewalMethod: z.enum(["ONLINE", "POST_OFFICE", "LICENSING_DEPT", "AGENT"]),
  processingDays: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type LicenseInput = z.infer<typeof licenseSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface LicenseRenewalFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: LicenseInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<LicenseInput>;
}

export function LicenseRenewalForm({
  vehicles,
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
}: LicenseRenewalFormProps) {
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
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LicenseInput>({
    resolver: zodResolver(licenseSchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
      licenseType: "VEHICLE_LICENSE",
      renewalMethod: "LICENSING_DEPT",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchLicenseType = watch("licenseType");
  const watchPrevExpiry = watch("previousExpiryDate");
  const watchNewExpiry = watch("newExpiryDate");
  const watchRenewalMethod = watch("renewalMethod");

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

  const handleFormSubmit = async (data: LicenseInput) => {
    if (mode === "create" && !receiptImage) {
      setImageError("Please capture a receipt image");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(data, mode === "create" ? receiptImage : null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-teal-500" />
          License Renewal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Vehicle */}
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
              <p className="text-sm text-red-500">{errors.vehicleId.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Renewal Date</Label>
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

          {/* License Type */}
          <div className="space-y-2">
            <Label htmlFor="licenseType">License Type</Label>
            <Select
              value={watchLicenseType}
              onValueChange={(val) => setValue("licenseType", val as any)}
              name="licenseType"
            >
              <SelectTrigger id="licenseType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* License Number */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number (Optional)</Label>
            <Input
              id="licenseNumber"
              placeholder="License disc number"
              {...register("licenseNumber")}
            />
          </div>

          {/* Registration Authority */}
          <div className="space-y-2">
            <Label htmlFor="registrationAuthority">
              Registration Authority (Optional)
            </Label>
            <Input
              id="registrationAuthority"
              placeholder="e.g., Gauteng Provincial"
              {...register("registrationAuthority")}
            />
          </div>

          {/* Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previousExpiryDate">
                Previous Expiry (Optional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="previousExpiryDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchPrevExpiry && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchPrevExpiry
                      ? format(watchPrevExpiry, "PP")
                      : "Previous"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchPrevExpiry}
                    onSelect={(date) =>
                      date && setValue("previousExpiryDate", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newExpiryDate">New Expiry *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="newExpiryDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchNewExpiry && "text-muted-foreground",
                      errors.newExpiryDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchNewExpiry
                      ? format(watchNewExpiry, "PP")
                      : "New expiry"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchNewExpiry}
                    onSelect={(date) => date && setValue("newExpiryDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.newExpiryDate && (
                <p className="text-sm text-red-500">
                  {errors.newExpiryDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Renewal Method */}
          <div className="space-y-2">
            <Label htmlFor="renewalMethod">Renewal Method</Label>
            <Select
              value={watchRenewalMethod}
              onValueChange={(val) => setValue("renewalMethod", val as any)}
              name="renewalMethod"
            >
              <SelectTrigger id="renewalMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LICENSE_RENEWAL_METHOD_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Fees */}
          <div className="space-y-2">
            <Label htmlFor="renewalFeeZar">Renewal Fee (ZAR)</Label>
            <Input
              id="renewalFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("renewalFeeZar")}
              className={errors.renewalFeeZar ? "border-red-500" : ""}
            />
            {errors.renewalFeeZar && (
              <p className="text-sm text-red-500">
                {errors.renewalFeeZar.message}
              </p>
            )}
          </div>

          {/* Penalties & Arrears */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penaltiesZar">Penalties (ZAR) - Optional</Label>
              <Input
                id="penaltiesZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("penaltiesZar")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrearsZar">Arrears (ZAR) - Optional</Label>
              <Input
                id="arrearsZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("arrearsZar")}
              />
            </div>
          </div>

          {/* Transaction & Processing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionNumber">
                Transaction Number (Optional)
              </Label>
              <Input
                id="transactionNumber"
                placeholder="Receipt number"
                {...register("transactionNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processingDays">Processing Days (Optional)</Label>
              <Input
                id="processingDays"
                type="number"
                placeholder="0"
                {...register("processingDays")}
              />
            </div>
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
            <Label htmlFor="receipt-image-input">Receipt Image</Label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="receipt-image-input"
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
            {isSubmitting ? "Saving..." : "Save License Renewal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

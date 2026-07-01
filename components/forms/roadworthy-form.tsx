"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, Car } from "lucide-react";
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
import { ROADWORTHY_RESULT_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";

const roadworthySchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  testingStationName: z.string().min(1, "Enter testing station name"),
  testingStationAddress: z.string().optional(),
  testingStationPhone: z.string().optional(),
  testDate: z.date({ required_error: "Select test date" }),
  certificateNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  testResult: z.enum(["PASS", "FAIL", "CONDITIONAL_PASS"]),
  testFeeZar: z.coerce.number().positive("Enter test fee"),
  retestFeeZar: z.coerce.number().optional(),
  inspectorName: z.string().optional(),
  vehicleOdometer: z.coerce.number().optional(),
  failureReasons: z.string().optional(),
  conditionsApplied: z.string().optional(),
  notes: z.string().optional(),
});

type RoadworthyInput = z.infer<typeof roadworthySchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface RoadworthyFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: RoadworthyInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<RoadworthyInput>;
}

export function RoadworthyForm({
  vehicles,
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
}: RoadworthyFormProps) {
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
  } = useForm<RoadworthyInput>({
    resolver: zodResolver(roadworthySchema),
    defaultValues: initialData || {
      date: new Date(),
      testDate: new Date(),
      testResult: "PASS",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchTestDate = watch("testDate");
  const watchExpiryDate = watch("expiryDate");
  const watchResult = watch("testResult");

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

  const handleFormSubmit = async (data: RoadworthyInput) => {
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
          <Car className="h-5 w-5 text-indigo-500" />
          Roadworthy Certificate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <Select
              value={watchVehicleId || undefined}
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

          {/* Entry Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Entry Date</Label>
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

          {/* Testing Station */}
          <div className="space-y-2">
            <Label htmlFor="testingStationName">Testing Station Name *</Label>
            <Input
              id="testingStationName"
              placeholder="e.g., DEKRA, Technical Bureau"
              {...register("testingStationName")}
              className={errors.testingStationName ? "border-red-500" : ""}
            />
            {errors.testingStationName && (
              <p className="text-sm text-red-500">
                {errors.testingStationName.message}
              </p>
            )}
          </div>

          {/* Station Address & Phone */}
          <div className="space-y-2">
            <Label htmlFor="testingStationAddress">
              Station Address (Optional)
            </Label>
            <Input
              id="testingStationAddress"
              placeholder="Testing station address"
              {...register("testingStationAddress")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testingStationPhone">
              Station Phone (Optional)
            </Label>
            <Input
              id="testingStationPhone"
              placeholder="Contact number"
              {...register("testingStationPhone")}
            />
          </div>

          {/* Test Date */}
          <div className="space-y-2">
            <Label htmlFor="testDate">Test Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="testDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchTestDate && "text-muted-foreground",
                    errors.testDate && "border-red-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchTestDate
                    ? format(watchTestDate, "PPP")
                    : "Select test date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchTestDate}
                  onSelect={(date) => date && setValue("testDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.testDate && (
              <p className="text-sm text-red-500">{errors.testDate.message}</p>
            )}
          </div>

          {/* Test Result */}
          <div className="space-y-2">
            <Label htmlFor="testResult">Test Result</Label>
            <Select
              value={watchResult}
              onValueChange={(val) => setValue("testResult", val as any)}
              name="testResult"
            >
              <SelectTrigger id="testResult">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROADWORTHY_RESULT_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Certificate Number */}
          <div className="space-y-2">
            <Label htmlFor="certificateNumber">
              Certificate Number (Optional)
            </Label>
            <Input
              id="certificateNumber"
              placeholder="Certificate number"
              {...register("certificateNumber")}
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Certificate Expiry (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="expiryDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchExpiryDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchExpiryDate
                    ? format(watchExpiryDate, "PPP")
                    : "Select expiry date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchExpiryDate}
                  onSelect={(date) => date && setValue("expiryDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Test Fee */}
          <div className="space-y-2">
            <Label htmlFor="testFeeZar">Test Fee (ZAR)</Label>
            <Input
              id="testFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("testFeeZar")}
              className={errors.testFeeZar ? "border-red-500" : ""}
            />
            {errors.testFeeZar && (
              <p className="text-sm text-red-500">
                {errors.testFeeZar.message}
              </p>
            )}
          </div>

          {/* Retest Fee */}
          <div className="space-y-2">
            <Label htmlFor="retestFeeZar">Retest Fee (ZAR) - Optional</Label>
            <Input
              id="retestFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("retestFeeZar")}
            />
          </div>

          {/* Inspector & Odometer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inspectorName">Inspector Name (Optional)</Label>
              <Input
                id="inspectorName"
                placeholder="Inspector"
                {...register("inspectorName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleOdometer">
                Odometer Reading (Optional)
              </Label>
              <Input
                id="vehicleOdometer"
                type="number"
                placeholder="km"
                {...register("vehicleOdometer")}
              />
            </div>
          </div>

          {/* Failure Reasons (only show if failed) */}
          {watchResult === "FAIL" && (
            <div className="space-y-2">
              <Label htmlFor="failureReasons">Failure Reasons</Label>
              <Textarea
                id="failureReasons"
                placeholder="Why did the vehicle fail?"
                {...register("failureReasons")}
                rows={3}
              />
            </div>
          )}

          {/* Conditions Applied */}
          <div className="space-y-2">
            <Label htmlFor="conditionsApplied">
              Conditions Applied (Optional)
            </Label>
            <Textarea
              id="conditionsApplied"
              placeholder="Any conditions on certificate..."
              {...register("conditionsApplied")}
              rows={2}
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
            <Label htmlFor="receipt-image">Receipt Image</Label>

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
            {isSubmitting ? "Saving..." : "Save Roadworthy Certificate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

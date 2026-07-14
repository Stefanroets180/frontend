"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, Shield } from "lucide-react";
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
import { INSURANCE_POLICY_TYPE_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";

const insuranceSchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  insurerName: z.string().min(1, "Enter insurer name"),
  policyNumber: z.string().min(1, "Enter policy number"),
  policyType: z.enum([
    "COMPREHENSIVE",
    "THIRD_PARTY",
    "THIRD_PARTY_FIRE_THEFT",
  ]),
  coverageStartDate: z.date({ required_error: "Select coverage start date" }),
  coverageEndDate: z.date({ required_error: "Select coverage end date" }),
  monthlyPremiumZar: z.coerce.number().positive("Enter monthly premium"),
  excessAmountZar: z.coerce.number().optional(),
  brokerName: z.string().optional(),
  brokerPhone: z.string().optional(),
  claimPhoneNumber: z.string().optional(),
  coverDetails: z.string().optional(),
});

type InsuranceInput = z.infer<typeof insuranceSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface InsuranceFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: InsuranceInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<InsuranceInput>;
}

export function InsuranceForm({
  vehicles,
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
}: InsuranceFormProps) {
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
  } = useForm<InsuranceInput>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
      policyType: "COMPREHENSIVE",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchPolicyType = watch("policyType");
  const watchCoverageStart = watch("coverageStartDate");
  const watchCoverageEnd = watch("coverageEndDate");

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

  const handleFormSubmit = async (data: InsuranceInput) => {
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
          <Shield className="h-5 w-5 text-emerald-500" />
          Insurance Premium
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

          {/* Insurer */}
          <div className="space-y-2">
            <Label htmlFor="insurerName">Insurer Name</Label>
            <Input
              id="insurerName"
              placeholder="e.g., Discovery, Outsurance"
              {...register("insurerName")}
              className={errors.insurerName ? "border-red-500" : ""}
            />
            {errors.insurerName && (
              <p className="text-sm text-red-500">
                {errors.insurerName.message}
              </p>
            )}
          </div>

          {/* Policy Number */}
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input
              id="policyNumber"
              placeholder="Policy number"
              {...register("policyNumber")}
              className={errors.policyNumber ? "border-red-500" : ""}
            />
            {errors.policyNumber && (
              <p className="text-sm text-red-500">
                {errors.policyNumber.message}
              </p>
            )}
          </div>

          {/* Policy Type */}
          <div className="space-y-2">
            <Label htmlFor="policyType">Policy Type</Label>
            <Select
              value={watchPolicyType}
              onValueChange={(val) => setValue("policyType", val as any)}
              name="policyType"
            >
              <SelectTrigger id="policyType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_POLICY_TYPE_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Coverage Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coverageStartDate">Coverage Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="coverageStartDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchCoverageStart && "text-muted-foreground",
                      errors.coverageStartDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchCoverageStart
                      ? format(watchCoverageStart, "PP")
                      : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchCoverageStart}
                    onSelect={(date) =>
                      date && setValue("coverageStartDate", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverageEndDate">Coverage End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="coverageEndDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchCoverageEnd && "text-muted-foreground",
                      errors.coverageEndDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchCoverageEnd ? format(watchCoverageEnd, "PP") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchCoverageEnd}
                    onSelect={(date) =>
                      date && setValue("coverageEndDate", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Monthly Premium */}
          <div className="space-y-2">
            <Label htmlFor="monthlyPremiumZar">Monthly Premium (ZAR)</Label>
            <Input
              id="monthlyPremiumZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("monthlyPremiumZar")}
              className={errors.monthlyPremiumZar ? "border-red-500" : ""}
            />
            {errors.monthlyPremiumZar && (
              <p className="text-sm text-red-500">
                {errors.monthlyPremiumZar.message}
              </p>
            )}
          </div>

          {/* Excess */}
          <div className="space-y-2">
            <Label htmlFor="excessAmountZar">
              Excess Amount (ZAR) - Optional
            </Label>
            <Input
              id="excessAmountZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("excessAmountZar")}
            />
          </div>

          {/* Broker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brokerName">Broker Name (Optional)</Label>
              <Input
                id="brokerName"
                placeholder="Broker name"
                {...register("brokerName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokerPhone">Broker Phone (Optional)</Label>
              <Input
                id="brokerPhone"
                placeholder="Phone number"
                {...register("brokerPhone")}
              />
            </div>
          </div>

          {/* Claim Phone */}
          <div className="space-y-2">
            <Label htmlFor="claimPhoneNumber">
              Claim Phone Number (Optional)
            </Label>
            <Input
              id="claimPhoneNumber"
              placeholder="Emergency claim line"
              {...register("claimPhoneNumber")}
            />
          </div>

          {/* Cover Details */}
          <div className="space-y-2">
            <Label htmlFor="coverDetails">Cover Details (Optional)</Label>
            <Textarea
              id="coverDetails"
              placeholder="Additional coverage details..."
              {...register("coverDetails")}
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
            {isSubmitting ? "Saving..." : "Save Insurance Premium"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

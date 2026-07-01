"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, IdCard } from "lucide-react";
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
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";

const personalLicenseSchema = z.object({
  date: z.date({ required_error: "Select a date" }),
  licenseType: z.enum(["DRIVERS_LICENSE", "PERSONAL_ID_CARD", "PDP"]),
  licenseNumber: z.string().min(1, "Enter license/ID number"),
  licenseCode: z.string().optional(),
  issueDate: z.date({ required_error: "Select issue date" }),
  expiryDate: z.date({ required_error: "Select expiry date" }),
  renewalFeeZar: z.coerce.number().positive("Enter renewal fee"),
  penaltiesZar: z.coerce.number().optional(),
  renewalMethod: z.enum([
    "ONLINE",
    "DLTC",
    "DRIVING_SCHOOL",
    "HOME_AFFAIRS",
    "BANK",
  ]),
  issuingAuthority: z.string().optional(),
  notes: z.string().optional(),
});

type PersonalLicenseInput = z.infer<typeof personalLicenseSchema>;

interface PersonalLicenseFormProps extends ReceiptSupportProps {
  onSubmit: (
    data: PersonalLicenseInput,
    receiptImage: File | null,
  ) => Promise<void>;
  initialData?: Partial<PersonalLicenseInput>;
}

const LICENSE_CODES = [
  { value: "A", label: "Code A - Motorcycle" },
  { value: "A1", label: "Code A1 - Motorcycle (under 125cc)" },
  { value: "B", label: "Code B - Light Motor Vehicle (LMV)" },
  { value: "C", label: "Code C - Heavy Motor Vehicle" },
  { value: "C1", label: "Code C1 - Heavy Motor Vehicle (3,500kg-16,000kg)" },
  { value: "EB", label: "Code EB - LMV with trailer" },
  { value: "EC", label: "Code EC - Articulated heavy vehicle" },
  { value: "EC1", label: "Code EC1 - Heavy vehicle with trailer" },
];

const RENEWAL_METHODS = [
  { value: "ONLINE", label: "Online (NATPAY)" },
  { value: "DLTC", label: "Driving License Testing Centre" },
  { value: "DRIVING_SCHOOL", label: "Driving School" },
  { value: "HOME_AFFAIRS", label: "Home Affairs Office" },
  { value: "BANK", label: "Participating Bank" },
];

export function PersonalLicenseForm({
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: PersonalLicenseFormProps) {
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
  } = useForm<PersonalLicenseInput>({
    resolver: zodResolver(personalLicenseSchema),
    defaultValues: initialData || {
      date: new Date(),
      licenseType: "DRIVERS_LICENSE",
      renewalMethod: "DLTC",
    },
  });

  const watchDate = watch("date");
  const watchIssueDate = watch("issueDate");
  const watchExpiryDate = watch("expiryDate");
  const watchLicenseType = watch("licenseType");
  const watchLicenseCode = watch("licenseCode");
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

  const handleFormSubmit = async (data: PersonalLicenseInput) => {
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

  const getLicenseTypeLabel = () => {
    switch (watchLicenseType) {
      case "DRIVERS_LICENSE":
        return "Driver's License";
      case "PERSONAL_ID_CARD":
        return "ID Card";
      case "PDP":
        return "PDP (Professional Driving Permit)";
      default:
        return "License";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-rose-500" />
          Personal License Renewal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
                <SelectItem value="DRIVERS_LICENSE">
                  Driver&apos;s License
                </SelectItem>
                <SelectItem value="PERSONAL_ID_CARD">
                  ID Card (Smart ID)
                </SelectItem>
                <SelectItem value="PDP">
                  Professional Driving Permit (PDP)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* License Number */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">
              {getLicenseTypeLabel()} Number
            </Label>
            <Input
              id="licenseNumber"
              placeholder={
                watchLicenseType === "PERSONAL_ID_CARD"
                  ? "13-digit ID number"
                  : "License number"
              }
              {...register("licenseNumber")}
              className={errors.licenseNumber ? "border-red-500" : ""}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-red-500">
                {errors.licenseNumber.message}
              </p>
            )}
          </div>

          {/* License Code (only for driver's license) */}
          {watchLicenseType === "DRIVERS_LICENSE" && (
            <div className="space-y-2">
              <Label htmlFor="licenseCode">License Code</Label>
              <Select
                value={watchLicenseCode || undefined}
                onValueChange={(val) => setValue("licenseCode", val)}
                name="licenseCode"
              >
                <SelectTrigger id="licenseCode">
                  <SelectValue placeholder="Select license code" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_CODES.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Issue & Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="issueDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchIssueDate && "text-muted-foreground",
                      errors.issueDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchIssueDate ? format(watchIssueDate, "PP") : "Issue"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchIssueDate}
                    onSelect={(date) => date && setValue("issueDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.issueDate && (
                <p className="text-sm text-red-500">
                  {errors.issueDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="expiryDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchExpiryDate && "text-muted-foreground",
                      errors.expiryDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchExpiryDate ? format(watchExpiryDate, "PP") : "Expiry"}
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
              {errors.expiryDate && (
                <p className="text-sm text-red-500">
                  {errors.expiryDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Renewal Fee */}
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

          {/* Penalties */}
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
                {RENEWAL_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issuing Authority */}
          <div className="space-y-2">
            <Label htmlFor="issuingAuthority">
              Issuing Authority (Optional)
            </Label>
            <Input
              id="issuingAuthority"
              placeholder="e.g., Randburg DLTC, Home Affairs"
              {...register("issuingAuthority")}
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
          {mode === "create" && (
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
              {imageError && (
                <p className="text-sm text-red-500">{imageError}</p>
              )}
              {compressionInfo && (
                <p className="text-xs text-green-600">
                  Image compressed:{" "}
                  {formatFileSize(compressionInfo.originalSize)} →{" "}
                  {formatFileSize(compressionInfo.compressedSize)}
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
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || (mode === "create" && !receiptImage)}
          >
            {isSubmitting
              ? "Saving..."
              : `Save ${getLicenseTypeLabel()} Renewal`}
          </Button>

          {/* Receipt Images Manager for Edit Mode */}
          {mode === "edit" && entryId && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-5 w-5 text-chart-1" />
                  Receipt Images
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Attach or manage receipt images for this expense.
                </p>
              </CardHeader>
              <CardContent>
                {onImageUpload &&
                onImageDelete &&
                onImageReupload &&
                onImageLock ? (
                  <EntryImageManager
                    entryId={entryId}
                    entryType="EXPENSE"
                    images={existingImages}
                    onUpload={onImageUpload}
                    onDelete={onImageDelete}
                    onReupload={onImageReupload}
                    onLock={onImageLock}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Image management not available
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, MoreHorizontal } from "lucide-react";
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
import { RECURRENCE_FREQUENCY_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { API_URL } from "@/lib/api/client";

const otherExpenseSchema = z.object({
  vehicleId: z.string().optional(),
  date: z.date({ required_error: "Select a date" }),
  expenseDescription: z.string().min(1, "Enter expense description"),
  categoryLabel: z.string().optional(),
  providerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  amountZar: z.coerce.number().positive("Enter amount"),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z
    .enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONCE_OFF"])
    .optional(),
  periodStartDate: z.date().optional(),
  periodEndDate: z.date().optional(),
  notes: z.string().optional(),
});

type OtherExpenseInput = z.infer<typeof otherExpenseSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface OtherExpenseFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (
    data: OtherExpenseInput,
    receiptImage: File | null,
  ) => Promise<void>;
  initialData?: Partial<OtherExpenseInput>;
}

export function OtherExpenseForm({
  vehicles,
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: OtherExpenseFormProps) {
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
    console.log("OtherExpenseForm - useEffect triggered:", {
      mode,
      existingImagesLength: existingImages.length,
      previewUrl,
    });
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      console.log("OtherExpenseForm - Setting previewUrl from:", firstImage);
      const BACKEND_BASE_URL = API_URL.replace(/\/api\/v1$/, "");
      const imageUrl = firstImage.imageUrl?.startsWith("http")
        ? firstImage.imageUrl
        : `${BACKEND_BASE_URL}${firstImage.imageUrl?.startsWith("/") ? firstImage.imageUrl : `/${firstImage.imageUrl}`}`;
      setPreviewUrl(imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OtherExpenseInput>({
    resolver: zodResolver(otherExpenseSchema),
    defaultValues: initialData || {
      date: new Date(),
      isRecurring: false,
      recurrenceFrequency: "ONCE_OFF",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchPeriodStart = watch("periodStartDate");
  const watchPeriodEnd = watch("periodEndDate");
  const watchIsRecurring = watch("isRecurring");
  const watchRecurrenceFrequency = watch("recurrenceFrequency");

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

  const handleFormSubmit = async (data: OtherExpenseInput) => {
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
          <MoreHorizontal className="h-5 w-5 text-chart-4" />
          Other Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Vehicle */}
          {mode === "create" ? (
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
                  const vehicle = initialData?.vehicleId
                    ? vehicles.find((v) => v.id === initialData.vehicleId)
                    : null;
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="expenseDescription">Expense Description *</Label>
            <Input
              id="expenseDescription"
              placeholder="What is this expense for?"
              {...register("expenseDescription")}
              className={errors.expenseDescription ? "border-red-500" : ""}
            />
            {errors.expenseDescription && (
              <p className="text-sm text-red-500">
                {errors.expenseDescription.message}
              </p>
            )}
          </div>

          {/* Category Label */}
          <div className="space-y-2">
            <Label htmlFor="categoryLabel">Category Label (Optional)</Label>
            <Input
              id="categoryLabel"
              placeholder="e.g., Parking, Tolls, Fines"
              {...register("categoryLabel")}
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="providerName">Provider/Supplier (Optional)</Label>
            <Input
              id="providerName"
              placeholder="Who provided this service?"
              {...register("providerName")}
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
            <Input
              id="referenceNumber"
              placeholder="Invoice/ref number"
              {...register("referenceNumber")}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amountZar">Amount (ZAR)</Label>
            <Input
              id="amountZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amountZar")}
              className={errors.amountZar ? "border-red-500" : ""}
            />
            {errors.amountZar && (
              <p className="text-sm text-red-500">{errors.amountZar.message}</p>
            )}
          </div>

          {/* Recurring */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isRecurring"
              checked={watchIsRecurring}
              onCheckedChange={(checked) => setValue("isRecurring", checked)}
            />
            <Label htmlFor="isRecurring">This is a recurring expense</Label>
          </div>

          {/* Recurrence Frequency (if recurring) */}
          {watchIsRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrenceFrequency">Frequency</Label>
              <Select
                value={watchRecurrenceFrequency}
                onValueChange={(val) =>
                  setValue("recurrenceFrequency", val as any)
                }
                name="recurrenceFrequency"
              >
                <SelectTrigger id="recurrenceFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period Dates (if recurring) */}
          {watchIsRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStartDate">Period Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="periodStartDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchPeriodStart && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchPeriodStart
                        ? format(watchPeriodStart, "PP")
                        : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchPeriodStart}
                      onSelect={(date) =>
                        date && setValue("periodStartDate", date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEndDate">Period End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="periodEndDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchPeriodEnd && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchPeriodEnd ? format(watchPeriodEnd, "PP") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchPeriodEnd}
                      onSelect={(date) =>
                        date && setValue("periodEndDate", date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

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

          {/* Receipt Images Manager for Edit Mode */}
          {mode === "edit" && entryId && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-5 w-5 text-chart-4" />
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

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || (mode === "create" && !receiptImage)}
          >
            {isSubmitting ? "Saving..." : "Save Other Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

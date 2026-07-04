"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  CircleDot,
  Camera,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  CalendarIcon,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  FuelType,
  formatZAR,
  DrivetrainType,
  DRIVETRAIN_TYPE_LABELS,
  ROTATION_INTERVAL_KM,
} from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { API_URL } from "@/lib/api/client";
const tyrePurchaseSchema = z.object({
  vehicleId: z.string().optional(),
  date: z.date({ required_error: "Select a date" }),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().optional(),
  size: z.string().optional(),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Enter number of tyres")
    .max(6, "Maximum 6 tyres"),
  odometerReading: z.coerce
    .number()
    .int()
    .min(0, "Enter odometer at installation"),
  priceZar: z.coerce.number().positive("Enter total price"),
  position: z.string().optional(),
  warrantyKm: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
  enableRotationTracking: z.boolean().default(false),
  drivetrainType: z.nativeEnum(DrivetrainType).optional(),
});

type TyrePurchaseInput = z.infer<typeof tyrePurchaseSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  fuelType: FuelType;
  currentOdometer: number;
}

interface TyrePurchaseFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (
    data: TyrePurchaseInput,
    receiptImage: File | null,
  ) => Promise<void>;
  initialData?: Partial<TyrePurchaseInput>;
}

const COMMON_TYRE_BRANDS = [
  "Bridgestone",
  "Continental",
  "Dunlop",
  "Firestone",
  "Goodyear",
  "Hankook",
  "Kumho",
  "Michelin",
  "Pirelli",
  "Sumitomo",
  "Toyo",
  "Yokohama",
  "Other",
];

const TYRE_QUANTITIES = [
  { value: "1", label: "1 Tyre" },
  { value: "2", label: "2 Tyres" },
  { value: "4", label: "4 Tyres (Full Set)" },
  { value: "5", label: "5 Tyres (+ Spare)" },
];

export function TyrePurchaseForm({
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
}: TyrePurchaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [enableRotation, setEnableRotation] = useState(false);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log("TyrePurchaseForm - useEffect triggered:", {
      mode,
      existingImagesLength: existingImages.length,
    });
    if (mode === "edit" && existingImages.length > 0) {
      const firstImage = existingImages[0];
      console.log("TyrePurchaseForm - Setting previewUrl from:", firstImage);
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages]);

  useEffect(() => {
    const rotationEnabled = Boolean(initialData?.enableRotationTracking);
    setEnableRotation(rotationEnabled);
    setValue("enableRotationTracking", rotationEnabled);
  }, [initialData?.enableRotationTracking, setValue]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TyrePurchaseInput>({
    resolver: zodResolver(tyrePurchaseSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || "",
      date: new Date(),
      quantity: 4,
      odometerReading: vehicles[0]?.currentOdometer || 0,
      enableRotationTracking: false,
    },
  });

  const selectedVehicleId = watch("vehicleId");
  const priceZar = watch("priceZar");
  const quantity = watch("quantity");
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const pricePerTyre = priceZar && quantity ? priceZar / quantity : 0;

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setValue("vehicleId", vehicleId);
      setValue("odometerReading", vehicle.currentOdometer);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setCompressionInfo(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid file");
      return;
    }

    setIsCompressing(true);

    try {
      // Process and compress to AVIF
      const result = await processReceiptImage(file);

      // Create a new File from the blob
      const compressedFile = new File(
        [result.blob],
        file.name.replace(/\.[^.]+$/, ".avif"),
        { type: result.format },
      );

      setReceiptImage(compressedFile);
      setPreviewUrl(URL.createObjectURL(result.blob));
      setCompressionInfo({
        originalSize: result.originalSize,
        compressedSize: result.convertedSize,
      });
    } catch (error) {
      setImageError("Failed to process image. Please try again.");
      console.error("Image compression error:", error);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFormSubmit = async (data: TyrePurchaseInput) => {
    if (mode === "create" && !receiptImage) {
      setImageError("Receipt image is required");
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Tyre Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-chart-5" />
            Tyre Purchase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          {mode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={handleVehicleChange}
              >
                <SelectTrigger id="vehicleId" className="h-12 touch-target">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} - {vehicle.make}{" "}
                      {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && (
                <p className="text-sm text-destructive">
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
                    "w-full h-12 touch-target justify-start text-left font-normal",
                    !watch("date") && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch("date") ? (
                    format(watch("date"), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watch("date")}
                  onSelect={(date) => setValue("date", date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand">Tyre Brand</Label>
            <Select
              value={watch("brand")}
              onValueChange={(value) => setValue("brand", value)}
            >
              <SelectTrigger id="brand" className="h-12 touch-target">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TYRE_BRANDS.map((brand) => (
                  <SelectItem key={brand} value={brand} className="py-3">
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.brand && (
              <p className="text-sm text-destructive">{errors.brand.message}</p>
            )}
          </div>

          {/* Number of Tyres */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Tyres</Label>
            <Select
              value={quantity?.toString()}
              onValueChange={(value) => setValue("quantity", parseInt(value))}
            >
              <SelectTrigger id="quantity" className="h-12 touch-target">
                <SelectValue placeholder="Select quantity" />
              </SelectTrigger>
              <SelectContent>
                {TYRE_QUANTITIES.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="py-3"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.quantity && (
              <p className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
          </div>

          {/* Odometer at Installation */}
          <div className="space-y-2">
            <Label htmlFor="odometerReading">
              Odometer at Installation (km)
            </Label>
            <Input
              id="odometerReading"
              {...register("odometerReading")}
              type="number"
              inputMode="numeric"
              placeholder={selectedVehicle?.currentOdometer.toString() || "0"}
              className="h-12 touch-target text-lg"
            />
            {errors.odometerReading && (
              <p className="text-sm text-destructive">
                {errors.odometerReading.message}
              </p>
            )}
            {selectedVehicle && (
              <p className="text-xs text-muted-foreground">
                Current: {selectedVehicle.currentOdometer.toLocaleString()} km
              </p>
            )}
          </div>

          {/* Total Price */}
          <div className="space-y-2">
            <Label htmlFor="priceZar">Total Price (R)</Label>
            <Input
              id="priceZar"
              {...register("priceZar")}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="4500.00"
              className="h-12 touch-target text-lg font-semibold"
            />
            {errors.priceZar && (
              <p className="text-sm text-destructive">
                {errors.priceZar.message}
              </p>
            )}
          </div>

          {/* Price Display */}
          {priceZar > 0 && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">
                  {formatZAR(priceZar)}
                </span>
              </div>
              {pricePerTyre > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Per Tyre</span>
                  <span className="font-medium">{formatZAR(pricePerTyre)}</span>
                </div>
              )}
            </div>
          )}

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Tyre Model (Optional)</Label>
              <Input
                id="model"
                {...register("model")}
                placeholder="e.g., Pilot Sport"
                className="h-12 touch-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size (Optional)</Label>
              <Input
                id="size"
                {...register("size")}
                placeholder="e.g., 225/45R17"
                className="h-12 touch-target"
              />
            </div>
          </div>

          {/* Warranty */}
          <div className="space-y-2">
            <Label htmlFor="warrantyKm">Warranty (km) - Optional</Label>
            <Input
              id="warrantyKm"
              {...register("warrantyKm")}
              type="number"
              inputMode="numeric"
              placeholder="e.g., 80000"
              className="h-12 touch-target"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rotation Tracking */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-chart-5" />
            Rotation Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Rotation Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableRotation" className="font-medium">
                Enable Rotation Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when tyres need rotation
              </p>
            </div>
            <Switch
              id="enableRotation"
              checked={enableRotation}
              onCheckedChange={(checked) => {
                setEnableRotation(checked);
                setValue("enableRotationTracking", checked);
              }}
            />
          </div>

          {/* Drivetrain Selection - Only shown when rotation is enabled */}
          {enableRotation && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="drivetrainType">Drivetrain Type</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Rotation intervals vary by drivetrain configuration
              </p>
              <Select
                value={watch("drivetrainType")}
                onValueChange={(value) =>
                  setValue("drivetrainType", value as DrivetrainType)
                }
              >
                <SelectTrigger
                  id="drivetrainType"
                  className="h-12 touch-target"
                >
                  <SelectValue placeholder="Select drivetrain" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DrivetrainType).map((type) => (
                    <SelectItem key={type} value={type} className="py-3">
                      <div className="flex justify-between items-center w-full">
                        <span>{DRIVETRAIN_TYPE_LABELS[type]}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          every {ROTATION_INTERVAL_KM[type].toLocaleString()} km
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {watch("drivetrainType") && (
                <div className="rounded-lg bg-muted p-3 mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Reminder set:</span> Rotate
                    tyres every{" "}
                    <span className="font-semibold text-chart-5">
                      {ROTATION_INTERVAL_KM[
                        watch("drivetrainType")!
                      ].toLocaleString()}{" "}
                      km
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {mode === "create" && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-5" />
              Capture Receipt
              <span className="text-destructive text-sm font-normal">
                (Required)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="w-full max-h-48 object-contain rounded-lg bg-muted"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setReceiptImage(null);
                      setPreviewUrl(null);
                      setCompressionInfo(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
                {compressionInfo && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      Compressed: {formatFileSize(compressionInfo.originalSize)}{" "}
                      → {formatFileSize(compressionInfo.compressedSize)}(
                      {Math.round(
                        (1 -
                          compressionInfo.compressedSize /
                            compressionInfo.originalSize) *
                          100,
                      )}
                      % saved)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <label
                htmlFor="receiptImage"
                className={`
                flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${imageError ? "border-destructive bg-destructive/5" : "border-chart-5 hover:border-chart-5/80 hover:bg-chart-5/5"}
              `}
              >
                {isCompressing ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chart-5 mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Compressing image...
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-chart-5 mb-2" />
                    <span className="text-sm font-medium text-foreground">
                      Tap to capture receipt
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Photo will be compressed automatically
                    </span>
                  </>
                )}
                <input
                  id="receiptImage"
                  name="receiptImage"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                  disabled={isCompressing}
                />
              </label>
            )}
            {imageError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{imageError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg touch-target-lg"
        disabled={isSubmitting || (mode === "create" && !receiptImage)}
      >
        {isSubmitting ? "Saving..." : "Save Tyre Purchase"}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === "edit" && entryId && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-5" />
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
  );
}

import { AddVehicleForm } from "@/components/vehicles/add-vehicle-form"
import { Truck } from "lucide-react"

export default function AddVehiclePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center" suppressHydrationWarning>
          <Truck className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vehicle Expense</h1>
          <p className="text-xs text-muted-foreground">SA Fleet Management</p>
        </div>
      </div>

      <AddVehicleForm />

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        After adding your vehicle, you will be asked to photograph your odometer
        as required by SARS for logbook compliance.
      </p>
    </div>
  )
}

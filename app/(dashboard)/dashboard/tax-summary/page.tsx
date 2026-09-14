"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, Calculator, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/contexts/auth-context";

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface TaxYearSummary {
  vehicleId: string;
  taxYear: number;
  totalKm: number;
  businessKm: number;
  privateKm: number;
  unclassifiedKm: number;
  businessPercentage: number;
  distanceSource: string;
  qualifyingCurrentExpenseCents: number;
  capitalOrAllowanceReviewCents: number;
  uncategorizedExpenseCents: number;
  dataQualityWarnings: string[];
}

interface TaxCalculationResult {
  method: string;
  eligible: boolean;
  ineligibilityReason?: string;
  totalDeductionCents: number;
  perKmRateCents: number;
  totalKm: number;
  businessKm: number;
  privateKm: number;
  businessPercentage: number;
}

interface TaxComparisonResponse {
  results: Record<string, TaxCalculationResult>;
}

export default function TaxSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(2026);
  const [taxSummary, setTaxSummary] = useState<TaxYearSummary | null>(null);
  const [comparisonResults, setComparisonResults] = useState<TaxCalculationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const taxYears = [2024, 2025, 2026, 2027];

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchTaxSummary();
    }
  }, [selectedVehicleId, selectedTaxYear]);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/vehicles");
      console.log("Tax Summary - Vehicles response:", response);
      if (response.ok) {
        const data = await response.json();
        console.log("Tax Summary - Vehicles data:", data);
        setVehicles(data);
        if (data.length > 0) {
          setSelectedVehicleId(data[0].id);
        } else {
          setError("No vehicles found. Please add a vehicle first.");
        }
      } else {
        const errorText = await response.text();
        console.error("Tax Summary - Vehicles error:", errorText);
        setError(`Failed to fetch vehicles: ${response.status}`);
      }
    } catch (err) {
      console.error("Tax Summary - Vehicles fetch error:", err);
      setError("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxSummary = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/tax-year-summaries/vehicle/${selectedVehicleId}/tax-year/${selectedTaxYear}`);
      if (response.ok) {
        const data = await response.json();
        setTaxSummary(data);
      } else if (response.status === 404) {
        // No tax summary exists for this vehicle and tax year
        setTaxSummary(null);
        setError(null); // Clear error, this is expected
      } else {
        setError("Failed to fetch tax summary");
      }
    } catch (err) {
      setError("Failed to fetch tax summary");
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonResults = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setComparisonLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles/tax-calculations?taxYear=${selectedTaxYear}`);
      if (response.ok) {
        const data: TaxComparisonResponse = await response.json();
        const results = Object.entries(data.results || {}).map(([key, result]) => ({
          ...result,
          method: key,
        }));
        setComparisonResults(results);
        // Auto-select the first eligible method
        const firstEligible = results.find((r) => r.eligible);
        if (firstEligible) {
          setSelectedMethod(firstEligible.method);
        }
      } else if (response.status === 404) {
        // No tax profile exists for this vehicle
        setError("A tax profile is required to compare tax calculation methods. Please set up a tax profile for this vehicle first.");
      } else {
        setError("Failed to fetch tax comparison results");
      }
    } catch (err) {
      setError("Failed to fetch tax comparison results");
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setCalculateLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/tax-year-summaries/calculate/vehicle/${selectedVehicleId}/tax-year/${selectedTaxYear}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTaxSummary(data);
      } else {
        setError("Failed to calculate tax summary");
      }
    } catch (err) {
      setError("Failed to calculate tax summary");
    } finally {
      setCalculateLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedVehicleId || !selectedTaxYear || !selectedMethod) return;

    setExportLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/exports/export?vehicleId=${selectedVehicleId}&taxYear=${selectedTaxYear}&calculationMethod=${selectedMethod}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-export-${selectedVehicleId}-${selectedTaxYear}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to export tax data");
      }
    } catch (err) {
      setError("Failed to export tax data");
    } finally {
      setExportLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const formatZAR = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-muted-foreground">
            View tax year summaries and data quality information
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle & Tax Year Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Vehicle</label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Tax Year</label>
              <Select value={selectedTaxYear.toString()} onValueChange={(v) => setSelectedTaxYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}/{(year + 1).toString().slice(-2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Banner */}
      {taxSummary && taxSummary.dataQualityWarnings && taxSummary.dataQualityWarnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Data Quality Warnings</h3>
                <ul className="mt-2 space-y-1 text-sm text-orange-800">
                  {taxSummary.dataQualityWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Tax Summary State */}
      {!taxSummary && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Tax Summary Available</h3>
                <p className="text-muted-foreground mt-2">
                  Calculate a tax summary for this vehicle and tax year to view tax calculations and data quality information.
                </p>
              </div>
              <Button
                onClick={handleCalculate}
                disabled={calculateLoading}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                {calculateLoading ? "Calculating..." : "Calculate Tax Summary"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {taxSummary && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tax Year Summary</h2>
            <Button
              onClick={fetchComparisonResults}
              disabled={comparisonLoading}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {comparisonLoading ? "Calculating..." : "Compare Methods"}
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.totalKm?.toLocaleString() ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Source: {taxSummary.distanceSource ?? 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Business KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.businessKm?.toLocaleString() ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taxSummary.businessPercentage?.toFixed(1) ?? 'N/A'}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Private KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.privateKm?.toLocaleString() ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Personal use
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unclassified KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.unclassifiedKm?.toLocaleString() ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Qualifying Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.qualifyingCurrentExpenseCents ? formatZAR(taxSummary.qualifyingCurrentExpenseCents / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax-deductible
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital/Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.capitalOrAllowanceReviewCents ? formatZAR(taxSummary.capitalOrAllowanceReviewCents / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requires review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uncategorized</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.uncategorizedExpenseCents ? formatZAR(taxSummary.uncategorizedExpenseCents / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs classification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Business Percentage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxSummary.businessPercentage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Business use ratio
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Method Comparison Cards */}
      {comparisonResults.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Tax Calculation Method Comparison</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {comparisonResults.map((result) => (
              <Card
                key={result.method}
                className={result.eligible ? "" : "opacity-60"}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {result.method.replace(/_/g, " ")}
                    </CardTitle>
                    <Badge variant={result.eligible ? "default" : "secondary"}>
                      {result.eligible ? "Eligible" : "Not Applicable"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!result.eligible && result.ineligibilityReason && (
                    <p className="text-sm text-muted-foreground">
                      {result.ineligibilityReason}
                    </p>
                  )}
                  {result.eligible && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Deduction</p>
                        <p className="text-2xl font-bold">
                          {formatZAR(result.totalDeductionCents / 100)}
                        </p>
                      </div>
                      {result.perKmRateCents > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Per KM Rate</p>
                          <p className="font-semibold">
                            {formatZAR(result.perKmRateCents / 100)} / km
                          </p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Business KM</p>
                        <p className="font-semibold">{result.businessKm.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Business Share</p>
                        <p className="font-semibold">{result.businessPercentage.toFixed(1)}%</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Tax Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Calculation Method</label>
                  <Select
                    value={selectedMethod}
                    onValueChange={setSelectedMethod}
                    disabled={exportLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      {comparisonResults
                        .filter((r) => r.eligible)
                        .map((result) => (
                          <SelectItem key={result.method} value={result.method}>
                            {result.method.replace(/_/g, " ")} - {formatZAR(result.totalDeductionCents / 100)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={!selectedMethod || exportLoading}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exportLoading ? "Exporting..." : "Export"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading tax summary...</div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

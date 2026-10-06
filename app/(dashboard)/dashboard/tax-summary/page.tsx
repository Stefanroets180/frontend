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
import { OrganizationMode } from "@/lib/types/database";

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  assignedDriverId?: string;
}

interface OrganizationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface VehicleTaxAcquisitionFacts {
  id?: string;
  vehicleId: string;
  recipientUserId: string;
  recipientUserName?: string;
  recipientUserEmail?: string;
  recipientAcquisitionDate?: string;
  recipientAcquisitionCostCents?: number;
  originalPurchaseDebtCents?: number | null;
  vehicleArrangementType: 'OWNED' | 'LEASED';
  section11eBaseValueCents?: number | null;
  section11eBaseBasis?: 'DIRECT_ACQUISITION_COST' | null;
  section11eBaseConfirmedAt?: string | null;
  vehicleConditionAtAcquisition?: 'NEW' | 'USED' | null;
  hadNonTradeUseBeforeTrade?: boolean | null;
}

interface VehicleTaxProfile {
  id: string;
  vehicleId: string;
  vehicleCostCents?: number;
  datePlacedInBusinessUse?: string;
  taxpayerVatRegistered?: boolean;
  taxpayerType?: string;
  compensationType?: string;
  fuelBorneBy?: string;
  maintenanceBorneBy?: string;
  coveredByMaintenancePlan?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  defaultCalculationMethod?: 'ACTUAL_COSTS' | 'SARS_COST_SCALE' | 'SIMPLIFIED_REIMBURSIVE';
  isCompanyProvidedVehicle?: boolean;
  recipientUserId?: string;
  recipientUserName?: string;
  recipientUserEmail?: string;
  march1stPhotoOdometer?: number | null;
  feb28thPhotoOdometer?: number | null;
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
  openingOdometer?: number;
  closingOdometer?: number;
  temporaryClosingOdometer?: number;
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
  fixedCostCents: number;
  fuelCostCents: number;
  maintenanceCostCents: number;
  businessShare: number;
  businessUseDays: number | null;
  daysInTaxYear: number | null;
  bracketDescription: string;
  breakdown: Record<string, any>;
}

interface TaxComparisonResponse {
  results: Record<string, TaxCalculationResult>;
}

export default function TaxSummaryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  // UI stores the tax-year start year: 2026 means 2026/27.
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(2026);
  const [taxSummary, setTaxSummary] = useState<TaxYearSummary | null>(null);
  const [allTaxSummaries, setAllTaxSummaries] = useState<TaxYearSummary[]>([]);
  const [viewMode, setViewMode] = useState<'individual' | 'combined'>('individual');
  const [comparisonResults, setComparisonResults] = useState<TaxCalculationResult[]>([]);
  const [vehicleComparisonResults, setVehicleComparisonResults] = useState<Record<string, TaxCalculationResult[]>>({});
  const [selectedMethodPerVehicle, setSelectedMethodPerVehicle] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [vehicleTaxProfile, setVehicleTaxProfile] = useState<VehicleTaxProfile | null>(null);
  const [showTaxProfileConfig, setShowTaxProfileConfig] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<VehicleTaxProfile>>({});
  const [vehicleCostInput, setVehicleCostInput] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const [acquisitionFacts, setAcquisitionFacts] = useState<VehicleTaxAcquisitionFacts | null>(null);
  const [editingAcquisitionFacts, setEditingAcquisitionFacts] = useState<Partial<VehicleTaxAcquisitionFacts>>({});
  const [savingAcquisitionFacts, setSavingAcquisitionFacts] = useState(false);
  const [acquisitionCostInput, setAcquisitionCostInput] = useState<string>('');
  const [purchaseDebtInput, setPurchaseDebtInput] = useState<string>('');
  const [section11eBaseInput, setSection11eBaseInput] = useState<string>('');
  const [confirmExistingAcquisitionCost, setConfirmExistingAcquisitionCost] = useState(false);
  const [vehicleConditionInput, setVehicleConditionInput] = useState<'NEW' | 'USED' | null>(null);
  const [hadNonTradeUseInput, setHadNonTradeUseInput] = useState<boolean | null>(null);
  const [temporaryClosingOdometer, setTemporaryClosingOdometer] = useState<number | null>(null);
  const [savingTemporaryOdometer, setSavingTemporaryOdometer] = useState(false);

  // Phase 8: Multi-tenant view switching based on organization mode
  const isFleetMode = user?.organizationMode === OrganizationMode.BUSINESS_FLEET || user?.organizationMode === OrganizationMode.COMPANY;
  const isSoloMode = user?.organizationMode === OrganizationMode.SOLO;

  // Only expose completed/current tax years; do not show a future year with reused profile data.
  // The app tax year runs 1 March through the following February.
  // Keep the current 2026/27 year selected; do not expose future 2027/28 yet.
  const taxYears = [2026];
  const formatTaxYear = (year: number) => `${year}/${(year + 1).toString().slice(-2)}`;
  const backendTaxYear = selectedTaxYear + 1;
  const toBackendCalculationMethod = (method: string) => {
    const aliases: Record<string, string> = {
      actualCosts: 'ACTUAL_COSTS',
      sarsCostScale: 'SARS_COST_SCALE',
      simplifiedReimbursement: 'SIMPLIFIED_REIMBURSIVE',
    };
    return aliases[method] || method;
  };

  useEffect(() => {
    fetchVehicles();
    fetchOrganizationUsers();
  }, []);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve before fetching
    if (viewMode === 'combined') {
      fetchAllTaxSummaries();
    } else if (selectedVehicleId) {
      fetchTaxSummary();
      fetchVehicleTaxProfile();
      fetchAcquisitionFacts();
    }
  }, [selectedVehicleId, selectedTaxYear, viewMode, authLoading]);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/vehicles");
      if (response.ok) {
        const data = await response.json();
        // Phase 8: Sort vehicles for fleet mode
        let sortedVehicles = data;
        if (isFleetMode && data.length > 0) {
          // Sort by make/model for fleet organization
          sortedVehicles = [...data].sort((a: Vehicle, b: Vehicle) => {
            const makeCompare = a.make.localeCompare(b.make);
            if (makeCompare !== 0) return makeCompare;
            return a.model.localeCompare(b.model);
          });
        }

        setVehicles(sortedVehicles);
        if (sortedVehicles.length > 0) {
          setSelectedVehicleId(sortedVehicles[0].id);
        } else {
          setError("No vehicles found. Please add a vehicle first.");
        }
      } else {
        const errorText = await response.text();
        setError(`Failed to fetch vehicles: ${response.status}`);
      }
    } catch (err) {
      setError("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationUsers = async () => {
    try {
      const response = await apiFetch("/users/organization");
      if (response.ok) {
        const data = await response.json();
        setOrganizationUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch organization users:", err);
    }
  };

  const fetchAcquisitionFacts = async () => {
    if (!selectedVehicleId || !vehicleTaxProfile?.recipientUserId) return;

    try {
      const url = `/vehicles/${selectedVehicleId}/acquisition-facts?recipientUserId=${vehicleTaxProfile.recipientUserId}`;
      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        setAcquisitionFacts(data);
        setEditingAcquisitionFacts(data);
        if (data.recipientAcquisitionCostCents) {
          setAcquisitionCostInput((data.recipientAcquisitionCostCents / 100).toFixed(2));
        }
        if (data.originalPurchaseDebtCents) {
          setPurchaseDebtInput((data.originalPurchaseDebtCents / 100).toFixed(2));
        }
        if (data.section11eBaseValueCents) {
          setSection11eBaseInput((data.section11eBaseValueCents / 100).toFixed(2));
          setConfirmExistingAcquisitionCost(false);
        } else {
          setSection11eBaseInput('');
          setConfirmExistingAcquisitionCost(false);
        }
        setVehicleConditionInput(data.vehicleConditionAtAcquisition || null);
        setHadNonTradeUseInput(data.hadNonTradeUseBeforeTrade ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch acquisition facts:", err);
    }
  };

  const fetchAllTaxSummaries = async () => {
    if (!selectedTaxYear) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/tax-year-summaries/tax-year/${backendTaxYear}`);
      if (response.ok) {
        const data = await response.json();
        setAllTaxSummaries(data);

        // Fetch comparison results for all vehicles
        const vehicleResults: Record<string, TaxCalculationResult[]> = {};
        const vehicleMethods: Record<string, string> = {};

        for (const summary of data) {
          const compResponse = await apiFetch(`/vehicles/${summary.vehicleId}/tax-profiles/tax-calculations?taxYear=${backendTaxYear}`);
          if (compResponse.ok) {
            const compData: TaxComparisonResponse = await compResponse.json();
            const results = Object.entries(compData.results || {}).map(([key, result]) => ({
              ...result,
              method: key,
            }));
            vehicleResults[summary.vehicleId] = results;

            // Auto-select: org default if eligible, otherwise first eligible for each vehicle
            const orgDefaultMethod = user?.defaultTaxCalculationMethod;
            const orgDefaultEligible = orgDefaultMethod
              ? results.find((r) => r.method === orgDefaultMethod && r.eligible)
              : null;
            if (orgDefaultEligible) {
              vehicleMethods[summary.vehicleId] = orgDefaultEligible.method;
            } else {
              const firstEligible = results.find((r) => r.eligible);
              if (firstEligible) {
                vehicleMethods[summary.vehicleId] = firstEligible.method;
              }
            }
          }
        }

        setVehicleComparisonResults(vehicleResults);
        setSelectedMethodPerVehicle(vehicleMethods);
      } else if (response.status === 404) {
        // No tax summaries exist for this tax year
        setAllTaxSummaries([]);
        setVehicleComparisonResults({});
        setSelectedMethodPerVehicle({});
        setError(null);
      } else {
        setError("Failed to fetch tax summaries");
      }
    } catch (err) {
      setError("Failed to fetch tax summaries");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxSummary = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/tax-year-summaries/vehicle/${selectedVehicleId}/tax-year/${backendTaxYear}`);
      if (response.ok) {
        const data = await response.json();
        setTaxSummary(data);
        setTemporaryClosingOdometer(data.temporaryClosingOdometer || null);
      } else if (response.status === 404) {
        // No tax summary exists for this vehicle and tax year
        setTaxSummary(null);
        setTemporaryClosingOdometer(null);
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

  const fetchVehicleTaxProfile = async () => {
    if (!selectedVehicleId) return;

    console.log("=== Fetching tax profile for vehicle:", selectedVehicleId, "===");

    try {
      // First, fetch first business trip date for auto-population
      let firstBusinessDate = "";
      try {
        const tripsRes = await apiFetch(`/trips/vehicle/${selectedVehicleId}`);
        if (tripsRes.ok) {
          const trips = await tripsRes.json();
          const businessTrips = Array.isArray(trips) ? trips.filter((t: any) => t.purpose === "BUSINESS") : [];
          console.log("Vehicle", selectedVehicleId, "- Business trips found:", businessTrips.length);
          if (businessTrips.length > 0) {
            const firstBusinessTrip = businessTrips.reduce((earliest: any, trip: any) =>
              new Date(trip.tripDate) < new Date(earliest.tripDate) ? trip : earliest
            );
            firstBusinessDate = new Date(firstBusinessTrip.tripDate).toISOString().split('T')[0];
            console.log("Vehicle", selectedVehicleId, "- First business date:", firstBusinessDate);
          } else {
            console.log("Vehicle", selectedVehicleId, "- No business trips found, date will be empty");
          }
        }
      } catch (tripsError) {
        console.error("Error fetching trips for auto-population:", tripsError);
      }

      const url = `/vehicles/${selectedVehicleId}/tax-profiles/active`;
      console.log("Tax Profile request URL:", url);
      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("Tax Profile response:", data);
        console.log("Tax Profile vehicleId:", data.vehicleId);
        setVehicleTaxProfile(data);
        // Preserve existing stored date, only use business trip suggestion if empty
        const profileWithDate = {
          ...data,
          datePlacedInBusinessUse: data.datePlacedInBusinessUse || firstBusinessDate
        };
        console.log("Vehicle", selectedVehicleId, "- Setting editing profile with date:", profileWithDate.datePlacedInBusinessUse);
        setEditingProfile(profileWithDate);
        setVehicleCostInput(data.vehicleCostCents ? (data.vehicleCostCents / 100).toFixed(2) : '');
      } else if (response.status === 404) {
        // No tax profile exists for this vehicle - use business trip suggestion if available
        setVehicleTaxProfile(null);
        setEditingProfile({
          datePlacedInBusinessUse: firstBusinessDate
        });
        console.log("Vehicle", selectedVehicleId, "- No tax profile, setting date:", firstBusinessDate || 'empty (no business trips)');
        setVehicleCostInput('');
      }
    } catch (err) {
      // 404 is expected when no tax profile exists - don't log
      const error = err as any;
      if (!error?.message?.includes('404')) {
        console.error("Failed to fetch vehicle tax profile:", err);
      }
    }
  };

  const saveTaxProfile = async () => {
    if (!selectedVehicleId) return;

    // Validate required fields
    const validationErrors: string[] = [];

    if (editingProfile.taxpayerType !== 'TRACKING_ONLY') {
      if (!editingProfile.vehicleCostCents || editingProfile.vehicleCostCents <= 0) {
        validationErrors.push('Vehicle Cost is required and must be greater than 0');
      }
      if (!editingProfile.datePlacedInBusinessUse) {
        validationErrors.push('Date Placed in Business Use is required');
      }
      if (!editingProfile.fuelBorneBy) {
        validationErrors.push('Fuel Borne By is required');
      }
      if (!editingProfile.maintenanceBorneBy) {
        validationErrors.push('Maintenance Borne By is required');
      }
    }
    if (!editingProfile.taxpayerType) {
      validationErrors.push('Taxpayer Type is required');
    }
    if (editingProfile.taxpayerType !== 'TRACKING_ONLY' && editingProfile.taxpayerType !== 'SOLE_PROPRIETOR' && !editingProfile.compensationType) {
      validationErrors.push('Compensation Type is required');
    }
    if ((editingProfile.taxpayerType === 'EMPLOYEE' || editingProfile.taxpayerType === 'SOLE_PROPRIETOR') && !editingProfile.recipientUserId) {
      validationErrors.push('Taxpayer / SARS Recipient is required for EMPLOYEE and SOLE_PROPRIETOR');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setSavingProfile(true);
    setError(null);
    try {
      // For SOLE_PROPRIETOR, enforce ACTUAL_COSTS and set compensationType to null (not applicable)
      const isSoleProprietor = editingProfile.taxpayerType === 'SOLE_PROPRIETOR';
      
      const profileData = {
        vehicleId: selectedVehicleId,
        vehicleCostCents: editingProfile.vehicleCostCents,
        datePlacedInBusinessUse: editingProfile.datePlacedInBusinessUse,
        taxpayerVatRegistered: editingProfile.taxpayerVatRegistered || false,
        taxpayerType: editingProfile.taxpayerType,
        compensationType: isSoleProprietor ? null : editingProfile.compensationType,
        fuelBorneBy: editingProfile.fuelBorneBy,
        maintenanceBorneBy: editingProfile.maintenanceBorneBy,
        coveredByMaintenancePlan: editingProfile.coveredByMaintenancePlan || false,
        effectiveFrom: editingProfile.effectiveFrom || new Date().toISOString().split('T')[0],
        effectiveTo: editingProfile.effectiveTo || null,
        defaultCalculationMethod: isSoleProprietor ? 'ACTUAL_COSTS' : (editingProfile.defaultCalculationMethod || 'ACTUAL_COSTS'),
        isCompanyProvidedVehicle: editingProfile.isCompanyProvidedVehicle || false,
        recipientUserId: editingProfile.recipientUserId,
      };

      let response;
      if (vehicleTaxProfile?.id) {
        // Update existing profile
        response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles/${vehicleTaxProfile.id}`, {
          method: 'PUT',
          body: JSON.stringify(profileData),
        });
      } else {
        // Create new profile
        response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles`, {
          method: 'POST',
          body: JSON.stringify(profileData),
        });
      }

      if (response.ok) {
        const data = await response.json();
        setVehicleTaxProfile(data);
        setEditingProfile(data);
        // Refetch tax summary to recalculate with new profile
        await handleCalculate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save tax profile');
      }
    } catch (err) {
      setError('Failed to save tax profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveTemporaryOdometer = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    // Validate temporary closing odometer against opening + business KM
    if (temporaryClosingOdometer !== null && taxSummary && taxSummary.openingOdometer != null) {
      const openingOdometer = taxSummary.openingOdometer;
      const businessKm = taxSummary.businessKm || 0;
      const minimumClosing = openingOdometer + businessKm;

      if (temporaryClosingOdometer < minimumClosing) {
        setError(`Temporary closing odometer must be at least ${minimumClosing.toLocaleString()} km because the current Business Trip Log contains ${businessKm.toLocaleString()} km since the ${openingOdometer.toLocaleString()} km opening reading.`);
        return;
      }
    }

    setSavingTemporaryOdometer(true);
    setError(null);

    try {
      const response = await apiFetch(
        `/tax-year-summaries/vehicle/${selectedVehicleId}/tax-year/${backendTaxYear}/temporary-closing-odometer`,
        {
          method: 'PATCH',
          body: JSON.stringify({ temporaryClosingOdometer }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTaxSummary(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save temporary closing odometer');
      }
    } catch (err) {
      setError('Failed to save temporary closing odometer');
    } finally {
      setSavingTemporaryOdometer(false);
    }
  };

  const saveAcquisitionFacts = async () => {
    if (!selectedVehicleId || !vehicleTaxProfile?.recipientUserId) return;

    setSavingAcquisitionFacts(true);
    setError(null);

    try {
      const validationErrors: string[] = [];

      if (!editingAcquisitionFacts.vehicleArrangementType) {
        validationErrors.push('Vehicle arrangement is required');
      }

      if (editingAcquisitionFacts.vehicleArrangementType === 'OWNED') {
        if (!editingAcquisitionFacts.recipientAcquisitionDate) {
          validationErrors.push('Acquisition date is required for owned vehicles');
        }
        if (!editingAcquisitionFacts.recipientAcquisitionCostCents || editingAcquisitionFacts.recipientAcquisitionCostCents <= 0) {
          validationErrors.push('Acquisition cost is required for owned vehicles and must be greater than 0');
        }
      }

      if (editingAcquisitionFacts.originalPurchaseDebtCents !== undefined && editingAcquisitionFacts.originalPurchaseDebtCents !== null && editingAcquisitionFacts.originalPurchaseDebtCents < 0) {
        validationErrors.push('Original purchase debt cannot be negative');
      }

      // Validate section 11(e) base value if provided
      if (section11eBaseInput && !confirmExistingAcquisitionCost) {
        const baseValue = parseFloat(section11eBaseInput);
        if (baseValue <= 0) {
          validationErrors.push('Section 11(e) base value must be greater than 0');
        }
      }

      if (validationErrors.length > 0) {
        setError(validationErrors.join('; '));
        return;
      }

      // Build facts data
      const factsData: any = {
        recipientUserId: vehicleTaxProfile.recipientUserId,
        recipientAcquisitionDate: editingAcquisitionFacts.recipientAcquisitionDate,
        recipientAcquisitionCostCents: editingAcquisitionFacts.recipientAcquisitionCostCents,
        originalPurchaseDebtCents: editingAcquisitionFacts.originalPurchaseDebtCents,
        vehicleArrangementType: editingAcquisitionFacts.vehicleArrangementType,
        vehicleConditionAtAcquisition: vehicleConditionInput,
        hadNonTradeUseBeforeTrade: hadNonTradeUseInput,
      };

      // Handle section 11(e) base confirmation
      if (confirmExistingAcquisitionCost && editingAcquisitionFacts.recipientAcquisitionCostCents) {
        // User confirms existing acquisition cost as the section 11(e) base
        factsData.section11eBaseValueCents = editingAcquisitionFacts.recipientAcquisitionCostCents;
        factsData.section11eBaseBasis = 'DIRECT_ACQUISITION_COST';
      } else if (section11eBaseInput && !confirmExistingAcquisitionCost) {
        // User enters a different corrected section 11(e) base
        factsData.section11eBaseValueCents = Math.round(parseFloat(section11eBaseInput) * 100);
        factsData.section11eBaseBasis = 'DIRECT_ACQUISITION_COST';
      } else {
        // No section 11(e) base confirmation
        factsData.section11eBaseValueCents = null;
        factsData.section11eBaseBasis = null;
      }

      const response = await apiFetch(`/vehicles/${selectedVehicleId}/acquisition-facts`, {
        method: 'PUT',
        body: JSON.stringify(factsData),
      });

      if (response.ok) {
        const data = await response.json();
        setAcquisitionFacts(data);
        setEditingAcquisitionFacts(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save acquisition facts');
      }
    } catch (err) {
      setError('Failed to save acquisition facts');
    } finally {
      setSavingAcquisitionFacts(false);
    }
  };

  const fetchComparisonResults = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    console.log("=== Fetching comparison results for vehicle:", selectedVehicleId, "===");

    setComparisonLoading(true);
    setError(null);
    try {
      const url = `/vehicles/${selectedVehicleId}/tax-profiles/tax-calculations?taxYear=${backendTaxYear}`;
      console.log("Comparison request URL:", url);
      const response = await apiFetch(url);
      if (response.ok) {
        const data: TaxComparisonResponse = await response.json();
        console.log("Comparison response:", data);
        const results = Object.entries(data.results || {}).map(([key, result]) => ({
          ...result,
          method: key,
        }));
        setComparisonResults(results);
        // Auto-select: org default if eligible, otherwise first eligible
        const orgDefaultMethod = user?.defaultTaxCalculationMethod;
        const orgDefaultEligible = orgDefaultMethod
          ? results.find((r) => r.method === orgDefaultMethod && r.eligible)
          : null;
        if (orgDefaultEligible) {
          setSelectedMethod(orgDefaultEligible.method);
        } else {
          const firstEligible = results.find((r) => r.eligible);
          if (firstEligible) {
            setSelectedMethod(firstEligible.method);
          }
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
        `/tax-year-summaries/calculate/vehicle/${selectedVehicleId}/tax-year/${backendTaxYear}`,
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

  const handleSarsExport = async (exportType: 'submission' | 'enhanced', overrideMethod?: string) => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setExportLoading(true);
    setError(null);
    try {
      const endpoint = exportType === 'submission'
        ? '/exports/sars-submission'
        : '/exports/sars-logbook/enhanced';

      const requestData = {
        vehicleId: selectedVehicleId,
        taxYear: backendTaxYear,
        organizationId: user?.organizationId,
        calculationMethod: toBackendCalculationMethod(overrideMethod || selectedMethod), // Use backend enum value
      };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sars-${exportType}-${selectedVehicleId}-${selectedTaxYear}${overrideMethod ? `-${overrideMethod}` : ''}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to export ${exportType}`);
      }
    } catch (err) {
      setError(`Failed to export ${exportType}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExport = async (overrideMethod?: string) => {
    if (!selectedVehicleId || !selectedTaxYear || !selectedMethod) return;

    setExportLoading(true);
    setError(null);
    try {
      const methodToUse = toBackendCalculationMethod(overrideMethod || selectedMethod);
      const response = await apiFetch("/exports/export", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          taxYear: backendTaxYear,
          calculationMethod: methodToUse,
          format: "EXCEL",
        }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-export-${selectedVehicleId}-${selectedTaxYear}${overrideMethod ? `-${overrideMethod}` : ''}.xlsx`;
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

  const combinedSummary = allTaxSummaries.length > 0 ? {
    totalKm: allTaxSummaries.reduce((sum, s) => sum + (s.totalKm || 0), 0),
    businessKm: allTaxSummaries.reduce((sum, s) => sum + (s.businessKm || 0), 0),
    privateKm: allTaxSummaries.reduce((sum, s) => sum + (s.privateKm || 0), 0),
    unclassifiedKm: allTaxSummaries.reduce((sum, s) => sum + (s.unclassifiedKm || 0), 0),
    businessPercentage: (() => {
      const totalKm = allTaxSummaries.reduce((sum, s) => sum + (s.totalKm || 0), 0);
      const businessKm = allTaxSummaries.reduce((sum, s) => sum + (s.businessKm || 0), 0);
      return totalKm > 0 ? (businessKm / totalKm) * 100 : 0;
    })(),
    qualifyingCurrentExpenseCents: allTaxSummaries.reduce((sum, s) => sum + (s.qualifyingCurrentExpenseCents || 0), 0),
    capitalOrAllowanceReviewCents: allTaxSummaries.reduce((sum, s) => sum + (s.capitalOrAllowanceReviewCents || 0), 0),
    uncategorizedExpenseCents: allTaxSummaries.reduce((sum, s) => sum + (s.uncategorizedExpenseCents || 0), 0),
    dataQualityWarnings: allTaxSummaries.flatMap(s => s.dataQualityWarnings || []),
    distanceSource: "Combined",
  } : null;

  const formatZAR = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(value);
  };

  const transformWarningForTrackingOnly = (warning: string): string => {
    if (!vehicleTaxProfile || vehicleTaxProfile.taxpayerType !== 'TRACKING_ONLY') {
      return warning;
    }

    // Transform tax-specific warnings to tracking-neutral language
    if (warning.includes('accurate tax-year total')) {
      return warning.replace(
        'Running estimate: Total KM based on logged trips (no closing odometer or fuel entries available). Set closing odometer verification for accurate tax-year total.',
        'Running estimate: Total KM is based on logged trips because no reliable closing odometer or fuel evidence is available.'
      );
    }

    if (warning.includes('tax-year opening and closing odometer')) {
      return warning.replace(
        'Reliable tax-year opening and closing odometer readings were not found. The business percentage is based only on logged trips.',
        'Reliable opening and closing odometer readings were not found. Distance totals and business kilometre share are based on logged trips.'
      );
    }

    if (warning.includes('require tax treatment review')) {
      return warning.replace(
        /Uncategorized vehicle expenses of R([\d.,]+) require tax treatment review and are not included in qualifying current expenses\./,
        'Uncategorized vehicle expenses of R$1 still need classification.'
      );
    }

    if (warning.includes('Capital or allowance-review expenses require separate tax treatment review')) {
      return 'Capital or allowance-review expenses require separate review.';
    }

    return warning;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-muted-foreground">
            {isFleetMode ? "Fleet tax year summaries and optimization" : "Individual tax year summaries and data quality information"}
          </p>
        </div>
        {/* Phase 8: Organization mode indicator */}
        <Badge variant={isFleetMode ? "default" : "secondary"}>
          {isFleetMode ? "Fleet Mode" : "Solo Mode"}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <Car className="h-5 w-5" />
            Vehicle & Tax Year Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">View Mode</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="View Mode">
                  <Button
                    variant={viewMode === 'individual' ? 'default' : 'outline'}
                    onClick={() => setViewMode('individual')}
                    className="flex-1"
                    role="radio"
                    aria-checked={viewMode === 'individual'}
                  >
                    Individual Vehicle
                  </Button>
                  <Button
                    variant={viewMode === 'combined' ? 'default' : 'outline'}
                    onClick={() => setViewMode('combined')}
                    className="flex-1"
                    role="radio"
                    aria-checked={viewMode === 'combined'}
                  >
                    Combined Total
                  </Button>
                </div>
              </fieldset>
            </div>
            {viewMode === 'individual' && (
              <div className="flex-1 w-full">
                <label htmlFor="vehicle-select" className="text-sm font-medium mb-2 block">Vehicle</label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} name="vehicle">
                  <SelectTrigger id="vehicle-select" name="vehicle-select">
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
            )}
            <div className="w-full md:w-48">
              <label htmlFor="tax-year-select" className="text-sm font-medium mb-2 block">Tax Year</label>
              <Select value={selectedTaxYear.toString()} onValueChange={(v) => setSelectedTaxYear(parseInt(v))} name="tax-year">
                <SelectTrigger id="tax-year-select" name="tax-year-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {formatTaxYear(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {viewMode === 'individual' && (
              <div className="w-full md:w-48">
                <label htmlFor="temporary-closing-odometer" className="text-sm font-medium mb-2 block">Temporary Closing Odometer</label>
                <div className="relative">
                  <input
                    id="temporary-closing-odometer"
                    type="number"
                    value={temporaryClosingOdometer || ''}
                    onChange={(e) => setTemporaryClosingOdometer(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Enter odometer"
                  />
                  <Button
                    onClick={saveTemporaryOdometer}
                    disabled={savingTemporaryOdometer}
                    className="absolute right-1 top-1 h-6 px-2 text-xs"
                    size="sm"
                  >
                    {savingTemporaryOdometer ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                  Used for your current tax estimate only. Check your vehicle's current odometer for the most accurate calculation.
                </p>
                {temporaryClosingOdometer !== null && (
                  <p className="text-xs text-amber-600 mt-1 dark:text-amber-400">
                    This temporary odometer reading may be outdated. Check your vehicle's current odometer and update it for the most accurate estimate.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Tax Profile Configuration */}
      {viewMode === 'individual' && (
        <Card className="dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Car className="h-5 w-5" />
              Vehicle Tax Profile Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!vehicleTaxProfile && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950 dark:border-yellow-900">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No tax profile set up for this vehicle. Set up a tax profile to configure tax calculation methods and odometer baselines.
                </p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {editingProfile.taxpayerType !== 'TRACKING_ONLY' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="vehicle-cost" className="text-sm font-medium dark:text-gray-300">Vehicle Cost (ZAR) *</label>
                    <input
                      id="vehicle-cost"
                      name="vehicle-cost"
                      type="text"
                      inputMode="decimal"
                      value={vehicleCostInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setVehicleCostInput(value);
                        setEditingProfile({ ...editingProfile, vehicleCostCents: value ? Math.round(parseFloat(value) * 100) : 0 });
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const numValue = parseFloat(e.target.value);
                          setVehicleCostInput(numValue.toFixed(2));
                          setEditingProfile({ ...editingProfile, vehicleCostCents: Math.round(numValue * 100) });
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., 250000.00"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total vehicle cost including VAT (purchase price + accessories).</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="datePlacedInBusinessUse" className="text-sm font-medium dark:text-gray-300">Date Placed in Business Use *</label>
                    <input
                      type="date"
                      id="datePlacedInBusinessUse"
                      name="datePlacedInBusinessUse"
                      value={editingProfile.datePlacedInBusinessUse || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, datePlacedInBusinessUse: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">When this vehicle was first used for business purposes. Auto-populated from first business trip: {editingProfile.datePlacedInBusinessUse || 'Not set'}</p>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label htmlFor="taxpayer-type" className="text-sm font-medium dark:text-gray-300">Taxpayer Type *</label>
                <Select
                  value={editingProfile.taxpayerType || 'EMPLOYEE'}
                  onValueChange={(value) => setEditingProfile({ ...editingProfile, taxpayerType: value as any })}
                >
                  <SelectTrigger id="taxpayer-type" name="taxpayer-type" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRACKING_ONLY">Tracking Only / No Tax Claim</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="SOLE_PROPRIETOR">Sole Proprietor / Self-employed</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(editingProfile.taxpayerType === 'EMPLOYEE' || editingProfile.taxpayerType === 'SOLE_PROPRIETOR') && (
                <div className="space-y-2">
                  <label htmlFor="recipient-user" className="text-sm font-medium dark:text-gray-300">Taxpayer / SARS Recipient *</label>
                  <Select
                    value={editingProfile.recipientUserId || ''}
                    onValueChange={(value) => setEditingProfile({ ...editingProfile, recipientUserId: value })}
                  >
                    <SelectTrigger id="recipient-user" name="recipient-user" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationUsers.map((orgUser) => (
                        <SelectItem key={orgUser.id} value={orgUser.id}>
                          {orgUser.firstName} {orgUser.lastName} ({orgUser.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The natural person who is the SARS tax recipient for this vehicle.
                  </p>
                </div>
              )}
              {editingProfile.taxpayerType !== 'SOLE_PROPRIETOR' && editingProfile.taxpayerType !== 'TRACKING_ONLY' && (
                <div className="space-y-2">
                  <label htmlFor="compensation-type" className="text-sm font-medium dark:text-gray-300">Compensation Type *</label>
                  <Select
                    value={editingProfile.compensationType || 'TRAVEL_ALLOWANCE'}
                    onValueChange={(value) => setEditingProfile({ ...editingProfile, compensationType: value as any })}
                  >
                    <SelectTrigger id="compensation-type" name="compensation-type" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAVEL_ALLOWANCE">Travel Allowance</SelectItem>
                      <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingProfile.taxpayerType !== 'TRACKING_ONLY' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="fuel-borne-by" className="text-sm font-medium dark:text-gray-300">Fuel Borne By *</label>
                    <Select
                      value={editingProfile.fuelBorneBy || 'EMPLOYEE'}
                      onValueChange={(value) => setEditingProfile({ ...editingProfile, fuelBorneBy: value as any })}
                    >
                      <SelectTrigger id="fuel-borne-by" name="fuel-borne-by" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="EMPLOYER">Employer</SelectItem>
                        <SelectItem value="SELF">Self (Sole Proprietor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="maintenance-borne-by" className="text-sm font-medium dark:text-gray-300">Maintenance Borne By *</label>
                    <Select
                      value={editingProfile.maintenanceBorneBy || 'EMPLOYEE'}
                      onValueChange={(value) => setEditingProfile({ ...editingProfile, maintenanceBorneBy: value as any })}
                    >
                      <SelectTrigger id="maintenance-borne-by" name="maintenance-borne-by" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="EMPLOYER">Employer</SelectItem>
                        <SelectItem value="SELF">Self (Sole Proprietor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {editingProfile.taxpayerType !== 'TRACKING_ONLY' && (
                <div className="space-y-2">
                  <label htmlFor="default-calculation-method" className="text-sm font-medium dark:text-gray-300">Default Calculation Method *</label>
                  <Select
                    value={editingProfile.defaultCalculationMethod || 'ACTUAL_COSTS'}
                    onValueChange={(value) => setEditingProfile({ ...editingProfile, defaultCalculationMethod: value as any })}
                  >
                    <SelectTrigger id="default-calculation-method" name="default-calculation-method" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTUAL_COSTS">Actual Costs</SelectItem>
                      {editingProfile.taxpayerType !== 'SOLE_PROPRIETOR' && (
                        <>
                          <SelectItem value="SARS_COST_SCALE">SARS Cost Scale</SelectItem>
                          <SelectItem value="SIMPLIFIED_REIMBURSIVE">Simplified Reimbursive (SARS Prescribed Rate)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {editingProfile.taxpayerType === 'SOLE_PROPRIETOR' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sole proprietors must use the actual-cost business expenditure path.</p>
                  )}
                </div>
              )}
              {editingProfile.taxpayerType !== 'TRACKING_ONLY' && (
                <div className="space-y-2">
                  <label htmlFor="company-provided-vehicle" className="text-sm font-medium dark:text-gray-300">Company Provided Vehicle</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="company-provided-vehicle"
                      name="company-provided-vehicle"
                      type="checkbox"
                      checked={editingProfile.isCompanyProvidedVehicle || false}
                      onChange={(e) => setEditingProfile({ ...editingProfile, isCompanyProvidedVehicle: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm dark:text-gray-300">
                      {editingProfile.isCompanyProvidedVehicle ? 'Yes (Fringe Benefit)' : 'No (Personal Vehicle)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Company car (fringe benefit) changes how private use is displayed for tax purposes.</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={saveTaxProfile}
                disabled={savingProfile || (editingProfile.taxpayerType !== 'TRACKING_ONLY' && (!editingProfile.vehicleCostCents || !editingProfile.datePlacedInBusinessUse))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingProfile ? 'Saving...' : vehicleTaxProfile ? 'Update Profile' : 'Create Profile'}
              </Button>
              {vehicleTaxProfile && (
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(vehicleTaxProfile)}
                  disabled={savingProfile}
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acquisition Facts Card */}
      {vehicleTaxProfile && vehicleTaxProfile.recipientUserId && vehicleTaxProfile.taxpayerType !== 'TRACKING_ONLY' && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">Acquisition Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="vehicle-arrangement" className="text-sm font-medium dark:text-gray-300">Vehicle Arrangement *</label>
                <Select
                  value={editingAcquisitionFacts.vehicleArrangementType || 'OWNED'}
                  onValueChange={(value) => {
                    const newArrangement = value as any;
                    // Clear stale values when switching to LEASED
                    if (newArrangement === 'LEASED') {
                      setEditingAcquisitionFacts({
                        ...editingAcquisitionFacts,
                        vehicleArrangementType: newArrangement,
                        recipientAcquisitionDate: undefined,
                        recipientAcquisitionCostCents: undefined,
                        originalPurchaseDebtCents: null,
                      });
                      setAcquisitionCostInput('');
                      setPurchaseDebtInput('');
                    } else {
                      setEditingAcquisitionFacts({ ...editingAcquisitionFacts, vehicleArrangementType: newArrangement });
                    }
                  }}
                >
                  <SelectTrigger id="vehicle-arrangement" name="vehicle-arrangement" className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNED">Owned</SelectItem>
                    <SelectItem value="LEASED">Leased</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {editingAcquisitionFacts.vehicleArrangementType === 'OWNED' 
                    ? 'Wear-and-tear may apply to owned vehicles. Lease payments are handled separately for leased vehicles.' 
                    : 'Lease payments apply instead of wear-and-tear for leased vehicles.'}
                </p>
              </div>

              {editingAcquisitionFacts.vehicleArrangementType === 'OWNED' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="acquisition-date" className="text-sm font-medium dark:text-gray-300">Acquisition Date *</label>
                    <input
                      id="acquisition-date"
                      name="acquisition-date"
                      type="date"
                      value={editingAcquisitionFacts.recipientAcquisitionDate || ''}
                      onChange={(e) => setEditingAcquisitionFacts({ ...editingAcquisitionFacts, recipientAcquisitionDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date this tax recipient acquired the vehicle.</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="acquisition-cost" className="text-sm font-medium dark:text-gray-300">Acquisition Cost *</label>
                    <input
                      id="acquisition-cost"
                      name="acquisition-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={acquisitionCostInput}
                      onChange={(e) => setAcquisitionCostInput(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const numValue = parseFloat(e.target.value);
                          if (numValue <= 0) {
                            setAcquisitionCostInput('');
                            setEditingAcquisitionFacts({ ...editingAcquisitionFacts, recipientAcquisitionCostCents: undefined });
                          } else {
                            setAcquisitionCostInput(numValue.toFixed(2));
                            setEditingAcquisitionFacts({ ...editingAcquisitionFacts, recipientAcquisitionCostCents: Math.round(numValue * 100) });
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., 250000.00"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recipient-specific acquisition amount including VAT.</p>
                  </div>
                </>
              )}

              {editingAcquisitionFacts.vehicleArrangementType === 'OWNED' && (
                <div className="space-y-2">
                  <label htmlFor="purchase-debt" className="text-sm font-medium dark:text-gray-300">Original Purchase Debt (Optional)</label>
                  <input
                    id="purchase-debt"
                    name="purchase-debt"
                    type="number"
                    step="0.01"
                    value={purchaseDebtInput}
                    onChange={(e) => setPurchaseDebtInput(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        const numValue = parseFloat(e.target.value);
                        setPurchaseDebtInput(numValue.toFixed(2));
                        setEditingAcquisitionFacts({ ...editingAcquisitionFacts, originalPurchaseDebtCents: Math.round(numValue * 100) });
                      } else {
                        setEditingAcquisitionFacts({ ...editingAcquisitionFacts, originalPurchaseDebtCents: null });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., 150000.00"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Original debt incurred for acquisition (financing only). Leave blank if not financed.</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="vehicle-condition" className="text-sm font-medium dark:text-gray-300">Vehicle Condition at Acquisition</label>
                <select
                  id="vehicle-condition"
                  name="vehicle-condition"
                  value={vehicleConditionInput || ''}
                  onChange={(e) => setVehicleConditionInput(e.target.value as 'NEW' | 'USED' | null)}
                  className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Not confirmed</option>
                  <option value="NEW">New</option>
                  <option value="USED">Used / second-hand</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">Condition of the vehicle when you acquired it. Leave blank if unknown.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="prior-trade-use" className="text-sm font-medium dark:text-gray-300">Prior Non-Trade Use</label>
                <select
                  id="prior-trade-use"
                  name="prior-trade-use"
                  value={hadNonTradeUseInput === null ? '' : hadNonTradeUseInput ? 'true' : 'false'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setHadNonTradeUseInput(null);
                    } else {
                      setHadNonTradeUseInput(value === 'true');
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Not confirmed</option>
                  <option value="true">Yes - used for private/non-trade purposes before business</option>
                  <option value="false">No — no private/non-trade use before business use</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">Did you use this vehicle for private or other non-trade purposes before first using it for your business?</p>
              </div>

              {editingAcquisitionFacts.vehicleArrangementType === 'OWNED' && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-gray-800 rounded-md border border-blue-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold dark:text-gray-200 mb-3">Section 11(e) Wear-and-Tear Base Value</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Verify the section 11(e) wear-and-tear base. Finance charges must be excluded and VAT treatment must already be correct. The verified value is saved for the section 11(e) calculation.
                  </p>

                  {!acquisitionFacts?.section11eBaseValueCents ? (
                    <>
                      <div className="space-y-2 mb-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmExistingAcquisitionCost}
                            onChange={(e) => {
                              setConfirmExistingAcquisitionCost(e.target.checked);
                              if (e.target.checked) {
                                setSection11eBaseInput(acquisitionCostInput);
                              } else {
                                setSection11eBaseInput('');
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm dark:text-gray-300">
                            Confirm existing acquisition cost ({acquisitionCostInput || 'not set'}) as the section 11(e) base
                          </span>
                        </label>
                      </div>

                      {!confirmExistingAcquisitionCost && (
                        <div className="space-y-2">
                          <label htmlFor="section11e-base" className="text-sm font-medium dark:text-gray-300">
                            Or enter a corrected section 11(e) base value (R)
                          </label>
                          <input
                            id="section11e-base"
                            name="section11e-base"
                            type="number"
                            step="0.01"
                            min="0"
                            value={section11eBaseInput}
                            onChange={(e) => setSection11eBaseInput(e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value) {
                                const numValue = parseFloat(e.target.value);
                                if (numValue > 0) {
                                  setSection11eBaseInput(numValue.toFixed(2));
                                }
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            placeholder="e.g., 250000.00"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm dark:text-gray-300">
                        <span className="font-semibold">Verified base value:</span> R{(acquisitionFacts.section11eBaseValueCents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Confirmed on {acquisitionFacts.section11eBaseConfirmedAt ? new Date(acquisitionFacts.section11eBaseConfirmedAt).toLocaleDateString() : 'unknown'} as {acquisitionFacts.section11eBaseBasis?.replace('_', ' ')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSection11eBaseInput('');
                          setConfirmExistingAcquisitionCost(false);
                          setEditingAcquisitionFacts({ ...editingAcquisitionFacts, section11eBaseValueCents: null, section11eBaseBasis: null, section11eBaseConfirmedAt: null });
                        }}
                        className="mt-2"
                      >
                        Remove Verification
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={saveAcquisitionFacts}
                  disabled={savingAcquisitionFacts || (editingAcquisitionFacts.vehicleArrangementType === 'OWNED' && (!editingAcquisitionFacts.recipientAcquisitionDate || !editingAcquisitionFacts.recipientAcquisitionCostCents || editingAcquisitionFacts.recipientAcquisitionCostCents <= 0))}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {savingAcquisitionFacts ? 'Saving...' : acquisitionFacts ? 'Update Acquisition Details' : 'Save Acquisition Details'}
                </Button>
                {acquisitionFacts && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingAcquisitionFacts(acquisitionFacts);
                      setAcquisitionCostInput(acquisitionFacts.recipientAcquisitionCostCents ? (acquisitionFacts.recipientAcquisitionCostCents / 100).toFixed(2) : '');
                      setPurchaseDebtInput(acquisitionFacts.originalPurchaseDebtCents ? (acquisitionFacts.originalPurchaseDebtCents / 100).toFixed(2) : '');
                    }}
                    disabled={savingAcquisitionFacts}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 8: Fleet Optimization Intelligence */}
      {isFleetMode && viewMode === 'combined' && combinedSummary && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Fleet Optimization Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Fleet Business KM</span>
                <span className="text-lg font-bold text-blue-900">{combinedSummary.businessKm?.toLocaleString()} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fleet Business Percentage</span>
                <span className="text-lg font-bold text-blue-900">
                  {combinedSummary.businessPercentage != null
                    ? `${combinedSummary.businessPercentage.toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Qualifying Expenses</span>
                <span className="text-lg font-bold text-blue-900">{formatZAR((combinedSummary.qualifyingCurrentExpenseCents || 0) / 100)}</span>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Fleet-level aggregation across {allTaxSummaries.length} vehicle(s)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fleet TOTAL TAX DEDUCTIBLE Display */}
      {isFleetMode && viewMode === 'combined' && allTaxSummaries.length > 0 && Object.keys(vehicleComparisonResults).length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900">TOTAL TAX DEDUCTIBLE (Fleet)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">
              {formatZAR(
                allTaxSummaries.reduce((total, summary) => {
                  const selectedMethod = selectedMethodPerVehicle[summary.vehicleId];
                  const results = vehicleComparisonResults[summary.vehicleId] || [];
                  const selectedResult = results.find(r => r.method === selectedMethod);
                  return total + (selectedResult?.totalDeductionCents || 0);
                }, 0) / 100
              )}
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Sum of selected calculation methods across {allTaxSummaries.length} vehicle(s)
            </p>
            <div className="mt-4 space-y-2">
              {allTaxSummaries.map((summary) => {
                const vehicle = vehicles.find(v => v.id === summary.vehicleId);
                const selectedMethod = selectedMethodPerVehicle[summary.vehicleId];
                const results = vehicleComparisonResults[summary.vehicleId] || [];
                const selectedResult = results.find(r => r.method === selectedMethod);
                return (
                  <div key={summary.vehicleId} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">{vehicle?.registrationNumber || 'Unknown Vehicle'}</span>
                    <span className="font-semibold">{formatZAR((selectedResult?.totalDeductionCents || 0) / 100)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Banner */}
      {((viewMode === 'individual' && taxSummary) || (viewMode === 'combined' && combinedSummary)) &&
       ((viewMode === 'individual' ? taxSummary : combinedSummary)?.dataQualityWarnings?.length || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Data Quality Warnings</h3>
                <ul className="mt-2 space-y-1 text-sm text-orange-800">
                  {(viewMode === 'individual' ? taxSummary : combinedSummary)?.dataQualityWarnings?.map((warning, index) => (
                    <li key={index}>• {transformWarningForTrackingOnly(warning)}</li>
                  ))}
                </ul>
                {/* Odometer drift warning for ALL users */}
                {(viewMode === 'individual' ? taxSummary : combinedSummary)?.dataQualityWarnings?.some(w => w.includes('odometer drift')) && (
                  <p className="mt-3 text-xs text-orange-700 font-medium">
                    {vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY'
                      ? '⚠️ Odometer drift affects distance accuracy. Please resolve to ensure reliable tracking data.'
                      : '⚠️ Tax calculations and SARS exports are blocked until odometer drift is resolved.'
                    }
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Tax Summary State */}
      {((viewMode === 'individual' && !taxSummary) || (viewMode === 'combined' && !combinedSummary)) && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Tax Summary Available</h3>
                <p className="text-muted-foreground mt-2">
                  {viewMode === 'individual'
                    ? "Calculate a tax summary for this vehicle and tax year to view tax calculations and data quality information."
                    : "Calculate tax summaries for your vehicles to view combined totals across all vehicles."
                  }
                </p>
              </div>
              {viewMode === 'individual' && (
                <Button
                  onClick={handleCalculate}
                  disabled={calculateLoading}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {calculateLoading ? "Calculating..." : "Calculate Tax Summary"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {((viewMode === 'individual' && taxSummary) || (viewMode === 'combined' && combinedSummary)) && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {viewMode === 'combined'
                ? (isFleetMode ? 'Fleet Combined Tax Year Summary' : 'Combined Tax Year Summary (All Vehicles)')
                : 'Tax Year Summary'}
            </h2>
            <div className="flex gap-2">
              {viewMode === 'individual' && vehicleTaxProfile?.taxpayerType !== 'TRACKING_ONLY' && (
                <Button
                  onClick={fetchComparisonResults}
                  disabled={comparisonLoading}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {comparisonLoading ? "Calculating..." : "Compare Methods"}
                </Button>
              )}
              {viewMode === 'individual' && vehicleTaxProfile?.taxpayerType !== 'TRACKING_ONLY' && (
                <>
                  <Button
                    onClick={() => handleSarsExport('submission')}
                    disabled={exportLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {exportLoading ? "Exporting..." : "SARS eFiling Export"}
                  </Button>
                  <Button
                    onClick={() => handleSarsExport('enhanced')}
                    disabled={exportLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {exportLoading ? "Exporting..." : "Enhanced Logbook"}
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.totalKm?.toLocaleString() ?? 'N/A'}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {(viewMode === 'individual' ? taxSummary : combinedSummary)?.distanceSource ?? 'N/A'}
                  </Badge>
                  {vehicleTaxProfile?.march1stPhotoOdometer && (
                    <p className="text-xs text-muted-foreground">
                      Baseline: {vehicleTaxProfile.march1stPhotoOdometer.toLocaleString()}
                    </p>
                  )}
                  {vehicleTaxProfile?.feb28thPhotoOdometer && (
                    <p className="text-xs text-muted-foreground">
                      Closing: {vehicleTaxProfile.feb28thPhotoOdometer.toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {vehicleTaxProfile?.isCompanyProvidedVehicle ? (
              // Company car mode: emphasize private KM with fringe benefit label
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-orange-900">Private / Leisure KM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.privateKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-orange-700 mt-1 font-medium">
                    Fringe benefit reduction
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    SARS assumes a company car is fully taxable; your logged business KM reduces the taxable private use.
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Personal car mode: emphasize business KM
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Business KM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessPercentage != null
                      ? `${(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessPercentage.toFixed(1)}% of total`
                      : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            )}

            {vehicleTaxProfile?.isCompanyProvidedVehicle ? (
              // Company car mode: show business KM as supporting evidence
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Business KM (Evidence)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged business trips support fringe benefit reduction
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Personal car mode: do not show Private KM card (it's calculated internally)
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? 'Recorded Business KM' : 'Business KM (Evidence)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? 'Logged business trips' : 'Logged business trips for tax deduction'}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unclassified KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.unclassifiedKm?.toLocaleString() ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Subset of private/non-business (needs classification)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Qualifying Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.qualifyingCurrentExpenseCents ? formatZAR(((viewMode === 'individual' ? taxSummary : combinedSummary)?.qualifyingCurrentExpenseCents || 0) / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? 'Classified as qualifying' : 'Tax-deductible'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital/Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.capitalOrAllowanceReviewCents ? formatZAR(((viewMode === 'individual' ? taxSummary : combinedSummary)?.capitalOrAllowanceReviewCents || 0) / 100) : 'N/A'}</div>
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
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.uncategorizedExpenseCents ? formatZAR(((viewMode === 'individual' ? taxSummary : combinedSummary)?.uncategorizedExpenseCents || 0) / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs classification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? 'Business KM Share' : 'Business Percentage'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessPercentage != null
                    ? `${(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessPercentage.toFixed(1)}%`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? 'Recorded business use' : 'Business use ratio'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TOTAL TAX DEDUCTIBLE Display */}
          {selectedMethod && comparisonResults.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-blue-900">
                  {vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? 'Tax Calculation Status' : 'TOTAL TAX DEDUCTIBLE'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicleTaxProfile?.taxpayerType === 'TRACKING_ONLY' ? (
                  <div className="text-2xl font-bold text-blue-900">
                    Not configured
                  </div>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-blue-900">
                      {formatZAR((comparisonResults.find(r => r.method === selectedMethod)?.totalDeductionCents || 0) / 100)}
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                      Based on {comparisonResults.find(r => r.method === selectedMethod)?.method.replace(/_/g, ' ')} method
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Method Comparison Cards */}
      {comparisonResults.length > 0 && viewMode === 'individual' && vehicleTaxProfile?.taxpayerType !== 'TRACKING_ONLY' && (
        <>
          <h2 className="text-xl font-semibold">Tax Calculation Method Comparison</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {comparisonResults.map((result) => (
              <Card
                key={result.method}
                className={result.eligible ? "" : "opacity-60"}
                onClick={() => result.eligible && setSelectedMethod(result.method)}
                style={{ cursor: result.eligible ? 'pointer' : 'default' }}
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
                      {result.bracketDescription && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bracket/Rate Source</p>
                          <p className="font-semibold text-xs">{result.bracketDescription}</p>
                        </div>
                      )}
                      {result.method === 'ACTUAL_COSTS' ? (
                        (() => {
                          const runningExpenseDeductionCents = result.totalDeductionCents - result.fixedCostCents;
                          return (
                            <>
                              {runningExpenseDeductionCents >= 0 ? (
                                <div>
                                  <p className="text-sm text-muted-foreground">Running expenses</p>
                                  <p className="font-semibold">{formatZAR(runningExpenseDeductionCents / 100)}</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-muted-foreground">Running expenses</p>
                                  <p className="text-xs text-muted-foreground">Breakdown unavailable</p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground">Wear-and-tear</p>
                                <p className="font-semibold">{formatZAR(result.fixedCostCents / 100)}</p>
                                {result.breakdown?.wearAndTearStatus && (
                                  <p className="text-xs text-muted-foreground mt-1">{result.breakdown.wearAndTearStatus}</p>
                                )}
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          {result.fixedCostCents > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground">Fixed Costs</p>
                              <p className="font-semibold">{formatZAR(result.fixedCostCents / 100)}</p>
                            </div>
                          )}
                          {result.fuelCostCents > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground">Fuel Costs</p>
                              <p className="font-semibold">{formatZAR(result.fuelCostCents / 100)}</p>
                            </div>
                          )}
                          {result.maintenanceCostCents > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground">Maintenance Costs</p>
                              <p className="font-semibold">{formatZAR(result.maintenanceCostCents / 100)}</p>
                            </div>
                          )}
                        </>
                      )}
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Business Share</p>
                        <p className="font-semibold">{(result.businessShare * 100).toFixed(1)}%</p>
                      </div>
                      {result.businessUseDays !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">Business Use Days</p>
                          <p className="font-semibold">{result.businessUseDays} / {result.daysInTaxYear}</p>
                        </div>
                      )}
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
                  <label htmlFor="calculation-method-select" className="text-sm font-medium mb-2 block">Calculation Method</label>
                  <Select
                    value={selectedMethod}
                    onValueChange={setSelectedMethod}
                    disabled={exportLoading}
                    name="calculation-method"
                  >
                    <SelectTrigger id="calculation-method-select" name="calculation-method-select">
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
                  onClick={() => handleExport()}
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

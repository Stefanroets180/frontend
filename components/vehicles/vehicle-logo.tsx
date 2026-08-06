import React, { useState, useEffect, useRef } from 'react';
import { Car } from 'lucide-react';
import { getManufacturerLogo, getManufacturerLogoWithFallback } from '@/lib/utils/vehicle-logos';
import { cn } from '@/lib/utils';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface VehicleLogoProps {
  make: string;
  size?: LogoSize;
  className?: string;
  fallback?: React.ReactNode;
  enableApiFallback?: boolean;
}

const sizeClasses: Record<LogoSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

/**
 * VehicleLogo Component
 * 
 * Displays the manufacturer logo for a vehicle make.
 * Falls back to a generic Car icon if no logo is available.
 * Can optionally fetch logos from WorldVectorLogo API if not available locally.
 * 
 * @param make - Vehicle make (e.g., "Toyota", "toyota", "TOYOTA")
 * @param size - Logo size (xs, sm, md, lg, xl)
 * @param className - Additional CSS classes
 * @param fallback - Custom fallback component (defaults to Car icon)
 * @param enableApiFallback - Enable API fallback for missing logos (default: false)
 */
export function VehicleLogo({ 
  make, 
  size = 'md', 
  className,
  fallback,
  enableApiFallback = false
}: VehicleLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    async function fetchLogo() {
      // First check local logos
      const localLogo = getManufacturerLogo(make);
      if (localLogo) {
        setLogoUrl(localLogo);
        return;
      }

      // If API fallback is enabled, try to fetch from API
      if (enableApiFallback) {
        setIsLoading(true);
        try {
          const apiLogo = await getManufacturerLogoWithFallback(make);
          // Only update if we got a result - keep existing logo if API returns null
          if (apiLogo) {
            setLogoUrl(apiLogo);
          }
        } catch (error) {
          console.error('Error fetching logo from API:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (make) {
      // Debounce the fetch
      debounceRef.current = setTimeout(() => {
        fetchLogo();
      }, 400);
    } else {
      // Clear logo when make is empty
      setLogoUrl(null);
    }

    // Cleanup
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [make, enableApiFallback]);

  if (isLoading && !logoUrl) {
    // Show loading placeholder only if we don't have a logo yet
    return (
      <div className={cn(sizeClasses[size], 'animate-pulse bg-muted rounded', className)} />
    );
  }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${make} logo`}
        className={cn(sizeClasses[size], className)}
        onError={(e) => {
          // Fallback to Car icon if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to Car icon or custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Car className={cn(sizeClasses[size], 'text-muted-foreground', className)} />
  );
}

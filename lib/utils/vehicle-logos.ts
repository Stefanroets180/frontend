/**
 * Vehicle Manufacturer Logo Utility
 * 
 * Provides case-insensitive matching for vehicle manufacturer logos.
 * Logos are stored in /public/vehicle-logos/ with lowercase filenames.
 * Falls back to WorldVectorLogo API if local logo is not available.
 */

// WorldVectorLogo API configuration
const WORLD_VECTOR_LOGO_API = 'https://worldvectorlogo.com/api/v1';
const WORLD_VECTOR_LOGO_API_KEY = process.env.NEXT_PUBLIC_WORLD_VECTOR_LOGO_API_KEY || '';

/**
 * LocalStorage cache key for API-fetched logos
 */
const CACHE_KEY = 'vehicle-logos-cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Cached logo entry
 */
interface CachedLogo {
  url: string;
  timestamp: number;
}

/**
 * WorldVectorLogo API response
 */
interface WorldVectorLogoResponse {
  data: Array<{
    slug: string;
    name: string;
    svg_url: string;
    tags: string[];
  }>;
}

/**
 * List of available manufacturer logos
 * This list should be updated as new logos are added
 */
const AVAILABLE_LOGOS = [
  'toyota',
  'volkswagen',
  'bmw',
  'mercedes-benz',
  'ford',
  'audi',
  'honda',
  'nissan',
  'hyundai',
  'kia',
  'mazda',
  'subaru',
  'mitsubishi',
  'suzuki',
  'chevrolet',
  'jeep',
  'land-rover',
  'jaguar',
  'volvo',
  'peugeot',
  'renault',
  'citroen',
  'fiat',
  'alfa-romeo',
  'ferrari',
  'lamborghini',
  'porsche',
  'tesla',
  'lexus',
  'infiniti',
  'acura',
  'mini',
  'smart',
  'skoda',
  'seat',
  'opel',
  'vauxhall',
  'chrysler',
  'dodge',
  'ram',
  'gmc',
  'buick',
  'cadillac',
  'lincoln',
  'genesis',
  'maserati',
  'bentley',
  'rolls-royce',
  'aston-martin',
  'mclaren',
  'bugatti',
  'koenigsegg',
  'pagani',
  'rimac',
  'lucid',
  'rivian',
  'polestar',
  'byd',
  'geely',
  'great-wall',
  'chery',
  'haval',
  'mg',
  'tata',
  'mahindra',
  'isuzu',
  'hino',
  'scania',
  'man',
  'volvo-trucks',
  'daf',
  'iveco',
  'ford-trucks',
  'freightliner',
  'kenworth',
  'peterbilt',
  'international',
  'mack',
] as const;

type AvailableLogo = typeof AVAILABLE_LOGOS[number];

/**
 * Normalizes a vehicle make string to match logo filename format
 * Converts to lowercase, removes spaces and special characters
 */
function normalizeMake(make: string): string {
  return make
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

/**
 * Gets cached logos from localStorage
 */
function getCachedLogos(): Record<string, CachedLogo> {
  if (typeof window === 'undefined') return {};
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    
    const parsed = JSON.parse(cached);
    // Remove expired entries
    const now = Date.now();
    const cleaned: Record<string, CachedLogo> = {};
    
    for (const [key, value] of Object.entries(parsed)) {
      const entry = value as CachedLogo;
      if (now - entry.timestamp < CACHE_DURATION) {
        cleaned[key] = entry;
      }
    }
    
    // Update cache with cleaned entries
    localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return {};
  }
}

/**
 * Caches a logo URL in localStorage
 * Only caches if URL is not null
 */
function cacheLogo(make: string, url: string): void {
  if (typeof window === 'undefined') return;
  if (!url) return; // Don't cache null/undefined URLs
  
  try {
    const cached = getCachedLogos();
    cached[normalizeMake(make)] = {
      url,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Searches for a logo via WorldVectorLogo API
 */
async function searchLogoViaAPI(make: string): Promise<string | null> {
  const normalized = normalizeMake(make);
  
  // Check cache first
  const cached = getCachedLogos();
  if (cached[normalized]) {
    return cached[normalized].url;
  }
  
  try {
    // Build API request
    const url = new URL(`${WORLD_VECTOR_LOGO_API}/logos/search`);
    url.searchParams.append('q', make);
    url.searchParams.append('per_page', '10');
    
    // Add API key if available
    if (WORLD_VECTOR_LOGO_API_KEY) {
      url.searchParams.append('api_key', WORLD_VECTOR_LOGO_API_KEY);
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return null;
    }
    
    const data: WorldVectorLogoResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('No logos found for:', make);
      return null;
    }
    
    // Find the best matching logo with improved matching
    const bestMatch = data.data.find((logo) => {
      const logoName = logo.name.toLowerCase();
      const logoSlug = logo.slug.toLowerCase();
      const normalizedMake = normalized.toLowerCase();
      const makeLower = make.toLowerCase();
      
      // Exact match on normalized make
      if (logoName === normalizedMake || logoSlug === normalizedMake) {
        return true;
      }
      
      // Exact match on original make (case-insensitive)
      if (logoName === makeLower) {
        return true;
      }
      
      // Check if logo name contains the normalized make
      if (logoName.includes(normalizedMake) && logoName.length < normalizedMake.length + 10) {
        return true;
      }
      
      // Check if normalized make contains logo name (for partial matches)
      if (normalizedMake.includes(logoName) && logoName.length > 2) {
        return true;
      }
      
      return false;
    });
    
    // If we found a match, use it
    if (bestMatch) {
      console.log('Found logo for', make, ':', bestMatch.name);
      // Cache the result
      cacheLogo(make, bestMatch.svg_url);
      return bestMatch.svg_url;
    }
    
    // If no exact match but we have results, use the first one as fallback
    if (data.data.length > 0) {
      console.log('Using first available logo for', make, ':', data.data[0].name);
      cacheLogo(make, data.data[0].svg_url);
      return data.data[0].svg_url;
    }
    
    console.log('No logos found for:', make);
    return null;
  } catch (error) {
    console.error('Error fetching logo from WorldVectorLogo API:', error);
    return null;
  }
}

/**
 * Gets the logo URL for a vehicle manufacturer
 * 
 * @param make - Vehicle make (e.g., "Toyota", "toyota", "TOYOTA")
 * @returns Logo URL if available, null otherwise
 */
export function getManufacturerLogo(make: string): string | null {
  if (!make || typeof make !== 'string') {
    return null;
  }

  const normalized = normalizeMake(make);
  
  // Check if the normalized make is in our available logos list
  if (AVAILABLE_LOGOS.includes(normalized as AvailableLogo)) {
    return `/vehicle-logos/${normalized}.svg`;
  }

  return null;
}

/**
 * Gets the logo URL for a vehicle manufacturer with API fallback
 * This is an async version that will try the API if local logo is not available
 * 
 * @param make - Vehicle make (e.g., "Toyota", "toyota", "TOYOTA")
 * @returns Logo URL if available (local or API), null otherwise
 */
export async function getManufacturerLogoWithFallback(make: string): Promise<string | null> {
  if (!make || typeof make !== 'string') {
    return null;
  }

  const normalized = normalizeMake(make);
  
  // First check local logos
  if (AVAILABLE_LOGOS.includes(normalized as AvailableLogo)) {
    return `/vehicle-logos/${normalized}.svg`;
  }

  // Try API fallback
  return await searchLogoViaAPI(make);
}

/**
 * Checks if a logo is available for a given make
 */
export function hasManufacturerLogo(make: string): boolean {
  return getManufacturerLogo(make) !== null;
}

/**
 * Gets all available logo names
 */
export function getAvailableLogos(): readonly string[] {
  return AVAILABLE_LOGOS;
}

import { NextRequest, NextResponse } from 'next/server';

// In-memory cache to avoid re-querying the same addresses
const geocodeCache = new Map<string, { lat: string; lon: string; display_name: string } | null>();

async function geocodeOne(query: string): Promise<{ lat: string; lon: string; display_name: string } | null> {
  const cached = geocodeCache.get(query);
  if (cached !== undefined) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1&countrycodes=fr&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InitApp/1.0 (contact@init-app.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      geocodeCache.set(query, null);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const result = { lat: data[0].lat, lon: data[0].lon, display_name: data[0].display_name };
      geocodeCache.set(query, result);
      return result;
    }

    geocodeCache.set(query, null);
    return null;
  } catch {
    geocodeCache.set(query, null);
    return null;
  }
}

// Single query: GET /api/geocode?q=Paris
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  const result = await geocodeOne(query);
  if (result) {
    return NextResponse.json([result]);
  }
  return NextResponse.json([]);
}

// Batch: POST /api/geocode with body { locations: ["Paris", "Lyon", ...] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locations: string[] = body.locations;

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ error: 'locations array required' }, { status: 400 });
    }

    // Cap at 20 locations per request
    const toProcess = locations.slice(0, 20);

    // Process with 1s delay between Nominatim calls (rate limit), but use cache to skip known ones
    const results: Record<string, { lat: string; lon: string } | null> = {};
    let needsDelay = false;

    for (const loc of toProcess) {
      if (geocodeCache.has(loc)) {
        const cached = geocodeCache.get(loc);
        results[loc] = cached ? { lat: cached.lat, lon: cached.lon } : null;
        continue;
      }

      // Rate limit: wait 1s between actual API calls
      if (needsDelay) {
        await new Promise((r) => setTimeout(r, 1050));
      }

      const result = await geocodeOne(loc);
      results[loc] = result ? { lat: result.lat, lon: result.lon } : null;
      needsDelay = true;
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}

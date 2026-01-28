import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5&countrycodes=fr&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InitApp/1.0 (contact@init-app.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}

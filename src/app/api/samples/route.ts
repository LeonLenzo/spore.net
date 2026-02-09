'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('sampling_routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET routes error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ routes: data });
  } catch (error: any) {
    console.error('API GET error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get('id');

    if (!routeId) {
      return NextResponse.json({ error: 'Route ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('sampling_routes')
      .delete()
      .eq('id', routeId);

    if (error) {
      console.error('DELETE route error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sampleId, startLocationName, endLocationName, startPosition, currentPosition, trackingPoints, userId } = body;

    const now = new Date().toISOString();

    // Insert sampling route
    const { data: route, error: routeError } = await supabaseAdmin
      .from('sampling_routes')
      .insert({
        sample_id: sampleId.trim(),
        start_name: startLocationName || 'Field Location',
        end_name: endLocationName || 'Field Location',
        start_latitude: startPosition.latitude,
        start_longitude: startPosition.longitude,
        end_latitude: currentPosition.latitude,
        end_longitude: currentPosition.longitude,
        collection_date: now.split('T')[0],
        collection_start_time: new Date(startPosition.timestamp).toISOString(),
        collection_end_time: now,
        created_by: userId
      })
      .select()
      .single();

    if (routeError) {
      console.error('Route error:', routeError);
      return NextResponse.json({ error: routeError.message }, { status: 500 });
    }

    // Insert GPS tracking points
    if (trackingPoints.length > 0 && route) {
      const trackingData = trackingPoints.map((point: any) => ({
        route_id: route.id,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        recorded_at: new Date(point.timestamp).toISOString()
      }));

      const { error: trackingError } = await supabaseAdmin
        .from('gps_tracking_points')
        .insert(trackingData);

      if (trackingError) {
        console.error('Tracking error:', trackingError);
        // Don't fail the whole operation if tracking points fail
      }
    }

    return NextResponse.json({ success: true, route });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

// Types for our simplified database schema
export interface DatabaseSample {
  id: string;
  sample_id: string;
  start_name: string;
  end_name: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  collection_date: string;
  year: number;
  pathogen_detections: Array<{
    read_count: number;
    pathogen_species: {
      species_name: string;
      common_name: string;
    };
  }>;
}

// Transform database results to app format
export function transformToAppFormat(dbSamples: DatabaseSample[]): import('@/data/sampleData').Sample[] {
  return dbSamples.map(row => ({
    id: row.sample_id,
    startLatitude: row.start_latitude,
    startLongitude: row.start_longitude,
    endLatitude: row.end_latitude,
    endLongitude: row.end_longitude,
    location: `${row.start_name} to ${row.end_name}`,
    collectionDate: new Date(row.collection_date).toLocaleDateString(),
    season: 'summer', // Default season since we removed season calculation
    year: row.year,
    pathogens: row.pathogen_detections
      .filter(detection => detection.read_count > 0) // Only include actual detections
      .map(detection => ({
        species: detection.pathogen_species.species_name,
        commonName: detection.pathogen_species.common_name || detection.pathogen_species.species_name,
        readCount: detection.read_count,
        relativeAbundance: detection.read_count / 5000, // Simple relative calculation
        severity: detection.read_count > 3000 ? 'high' : detection.read_count > 1000 ? 'medium' : 'low'
      }))
  }));
}
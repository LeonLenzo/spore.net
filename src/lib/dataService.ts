import { supabase, transformToAppFormat } from './supabase';
import { Sample } from '@/data/sampleData';

/**
 * Fetch all samples from Supabase
 */
export async function fetchSamples(): Promise<Sample[]> {
  try {
    const { data, error } = await supabase
      .from('sampling_routes')
      .select(`
        *,
        pathogen_detections (
          read_count,
          pathogen_species (
            species_name,
            common_name
          )
        )
      `)
      .order('collection_date', { ascending: false });

    if (error) {
      console.error('Error fetching samples:', error);
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transformToAppFormat(data as any[]);
  } catch (error) {
    console.error('Failed to fetch samples from database:', error);
    // Return empty array on error - app will show no data
    return [];
  }
}

/**
 * Fetch samples by year
 */
export async function fetchSamplesByYear(year: number): Promise<Sample[]> {
  try {
    const { data, error } = await supabase
      .from('sampling_routes')
      .select(`
        *,
        pathogen_detections (
          read_count,
          pathogen_species (
            species_name,
            common_name
          )
        )
      `)
      .eq('year', year)
      .order('collection_date', { ascending: false });

    if (error) {
      console.error('Error fetching samples by year:', error);
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transformToAppFormat(data as any[]);
  } catch (error) {
    console.error(`Failed to fetch samples for year ${year}:`, error);
    return [];
  }
}

/**
 * Get unique years from database
 */
export async function fetchUniqueYears(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('sampling_routes')
      .select('year')
      .order('year', { ascending: false });

    if (error) {
      console.error('Error fetching years:', error);
      throw error;
    }

    const uniqueYears = [...new Set(data.map(row => row.year))];
    return uniqueYears;
  } catch (error) {
    console.error('Failed to fetch unique years:', error);
    return [new Date().getFullYear()]; // Default to current year
  }
}

/**
 * Get unique pathogen species from database
 */
export async function fetchUniquePathogens(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pathogen_species')
      .select('species_name')
      .order('species_name');

    if (error) {
      console.error('Error fetching pathogen species:', error);
      throw error;
    }

    return data.map(row => row.species_name);
  } catch (error) {
    console.error('Failed to fetch pathogen species:', error);
    return [];
  }
}
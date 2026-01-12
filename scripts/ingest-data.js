#!/usr/bin/env node

/**
 * Data ingestion script for pathogen monitoring data
 * Usage: node scripts/ingest-data.js --file path/to/data.csv [--dry-run] [--org "Organization Name"]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parser');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index > -1 ? args[index + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const csvFile = getArg('--file');
const dryRun = hasFlag('--dry-run');
const orgName = getArg('--org') || 'Default Organization';

if (!csvFile) {
  console.error('Usage: node scripts/ingest-data.js --file path/to/data.csv [--dry-run] [--org "Organization Name"]');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse CSV file using proper CSV parser
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const data = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Only add row if it has the required fields
        if (row.sample_id && row.species) {
          data.push(row);
        }
      })
      .on('end', () => {
        resolve(data);
      })
      .on('error', reject);
  });
}

/**
 * Parse quoted coordinates like "-31.95086, 115.86223"
 */
function parseCoordinates(coordString) {
  const cleaned = coordString.replace(/"/g, '');
  const [lat, lng] = cleaned.split(',').map(s => parseFloat(s.trim()));
  return { lat, lng };
}

/**
 * Parse date in DD/MM/YYYY format
 */
function parseDate(dateString) {
  const [day, month, year] = dateString.split('/');
  return new Date(year, month - 1, day);
}

/**
 * Calculate season from date (Southern Hemisphere)
 */
function calculateSeason(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  if ([12, 1, 2].includes(month)) return 'summer';
  if ([3, 4, 5].includes(month)) return 'autumn';
  if ([6, 7, 8].includes(month)) return 'winter';
  if ([9, 10, 11].includes(month)) return 'spring';
}

/**
 * Transform CSV data to database format
 */
function transformData(csvData) {
  // Group by sample_id
  const sampleGroups = {};

  csvData.forEach(row => {
    const sampleId = row.sample_id;
    if (!sampleGroups[sampleId]) {
      const startCoords = parseCoordinates(row.start_point);
      const endCoords = parseCoordinates(row.end_point);

      sampleGroups[sampleId] = {
        sample_id: sampleId,
        start_name: row.start_name,
        end_name: row.end_name,
        start_latitude: startCoords.lat,
        start_longitude: startCoords.lng,
        end_latitude: endCoords.lat,
        end_longitude: endCoords.lng,
        collection_date: parseDate(row.collection_date),
        pathogens: []
      };
    }

    // Add pathogen data
    const readCount = parseInt(row.read_count) || 0;
    sampleGroups[sampleId].pathogens.push({
      species: row.species,
      read_count: readCount
    });
  });

  return Object.values(sampleGroups);
}

/**
 * Main ingestion function
 */
async function ingestData() {
  try {
    console.log(`🔍 Reading CSV file: ${csvFile}`);
    const csvData = await parseCSV(csvFile);
    console.log(`📊 Found ${csvData.length} rows in CSV`);

    console.log(`🔄 Transforming data...`);
    const transformedData = transformData(csvData);
    console.log(`📦 Transformed into ${transformedData.length} samples`);

    if (dryRun) {
      console.log('🏃‍♂️ DRY RUN - No data will be inserted');
      console.log('Sample data preview:');
      console.log(JSON.stringify(transformedData[0], null, 2));
      return;
    }

    // No organizations table in simplified schema

    // Get all pathogen species
    console.log(`🦠 Loading pathogen species...`);
    const { data: species, error: speciesError } = await supabase
      .from('pathogen_species')
      .select('id, species_name');

    if (speciesError) throw speciesError;

    const speciesMap = new Map();
    species.forEach(s => speciesMap.set(s.species_name, s.id));

    // Insert data
    console.log(`💾 Inserting ${transformedData.length} samples...`);

    for (const sample of transformedData) {
      // Insert sampling route
      const { data: route, error: routeError } = await supabase
        .from('sampling_routes')
        .insert({
          sample_id: sample.sample_id,
          start_name: sample.start_name,
          end_name: sample.end_name,
          start_latitude: sample.start_latitude,
          start_longitude: sample.start_longitude,
          end_latitude: sample.end_latitude,
          end_longitude: sample.end_longitude,
          collection_date: sample.collection_date.toISOString().split('T')[0]
        })
        .select('id')
        .single();

      if (routeError) {
        if (routeError.code === '23505') { // Unique violation
          console.log(`⚠️  Sample ${sample.sample_id} already exists, skipping...`);
          continue;
        }
        throw routeError;
      }

      // Insert pathogen detections
      const detections = sample.pathogens
        .filter(p => speciesMap.has(p.species))
        .map(p => ({
          route_id: route.id,
          pathogen_species_id: speciesMap.get(p.species),
          read_count: p.read_count
        }));

      if (detections.length > 0) {
        const { error: detectionsError } = await supabase
          .from('pathogen_detections')
          .insert(detections);

        if (detectionsError) throw detectionsError;
      }

      console.log(`✅ Inserted sample ${sample.sample_id} with ${detections.length} pathogen detections`);
    }

    console.log(`🎉 Data ingestion completed successfully!`);

  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    process.exit(1);
  }
}

// Run the script
ingestData();
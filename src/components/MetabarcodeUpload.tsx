'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

interface UploadResult {
  success: boolean;
  message: string;
  routesProcessed: number;
  detectionsAdded: number;
  errors: string[];
}

interface CSVRow {
  sample_id: string;
  start_name: string;
  start_point: string;
  end_name: string;
  end_point: string;
  species: string;
  read_count: string;
  collection_date: string;
}

export default function MetabarcodeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });

      rows.push(row as CSVRow);
    }

    return rows;
  };

  const parseCoordinates = (coordString: string): [number, number] | null => {
    // Format: "-31.95086, 115.86223" or similar
    const cleaned = coordString.replace(/["']/g, '').trim();
    const parts = cleaned.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    return null;
  };

  const parseDate = (dateString: string): string => {
    // Handle formats like "30/07/2025"
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateString; // Assume it's already in YYYY-MM-DD format
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    const errors: string[] = [];
    let routesProcessed = 0;
    let detectionsAdded = 0;

    try {
      // Read file
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setResult({
          success: false,
          message: 'No valid data found in CSV',
          routesProcessed: 0,
          detectionsAdded: 0,
          errors: ['CSV file is empty or invalid']
        });
        return;
      }

      // Group by sample_id
      const sampleGroups = new Map<string, CSVRow[]>();
      rows.forEach(row => {
        if (!sampleGroups.has(row.sample_id)) {
          sampleGroups.set(row.sample_id, []);
        }
        sampleGroups.get(row.sample_id)!.push(row);
      });

      const user = AuthService.getCurrentUser();

      // Process each sample
      for (const [sampleId, sampleRows] of sampleGroups) {
        const firstRow = sampleRows[0];

        // Parse coordinates
        const startCoords = parseCoordinates(firstRow.start_point);
        const endCoords = parseCoordinates(firstRow.end_point);

        if (!startCoords || !endCoords) {
          errors.push(`${sampleId}: Invalid coordinates`);
          continue;
        }

        const collectionDate = parseDate(firstRow.collection_date);

        // Check if route already exists
        const { data: existingRoute } = await supabase
          .from('sampling_routes')
          .select('id')
          .eq('sample_id', sampleId)
          .single();

        let routeId: string;

        if (existingRoute) {
          // Route exists, we'll add detections to it
          routeId = existingRoute.id;
        } else {
          // Create new route
          const { data: newRoute, error: routeError } = await supabase
            .from('sampling_routes')
            .insert({
              sample_id: sampleId,
              start_name: firstRow.start_name,
              end_name: firstRow.end_name,
              start_latitude: startCoords[0],
              start_longitude: startCoords[1],
              end_latitude: endCoords[0],
              end_longitude: endCoords[1],
              collection_date: collectionDate,
              created_by: user?.id
            })
            .select()
            .single();

          if (routeError || !newRoute) {
            errors.push(`${sampleId}: Failed to create route - ${routeError?.message}`);
            continue;
          }

          routeId = newRoute.id;
          routesProcessed++;
        }

        // Record upload metadata
        await supabase.from('sample_uploads').insert({
          route_id: routeId,
          uploaded_by: user?.id,
          filename: file.name,
          file_size: file.size,
          row_count: sampleRows.length,
          notes: `Uploaded via metabarcode CSV upload`
        });

        // Add pathogen detections
        for (const row of sampleRows) {
          const readCount = parseInt(row.read_count);

          // Skip zero reads if you want, or include them
          if (isNaN(readCount)) {
            errors.push(`${sampleId}: Invalid read count for ${row.species}`);
            continue;
          }

          // Get pathogen species ID
          const { data: pathogen } = await supabase
            .from('pathogen_species')
            .select('id')
            .eq('species_name', row.species)
            .single();

          if (!pathogen) {
            errors.push(`${sampleId}: Unknown species ${row.species}`);
            continue;
          }

          // Insert or update detection
          const { error: detectionError } = await supabase
            .from('pathogen_detections')
            .upsert({
              route_id: routeId,
              pathogen_species_id: pathogen.id,
              read_count: readCount
            }, {
              onConflict: 'route_id,pathogen_species_id'
            });

          if (detectionError) {
            errors.push(`${sampleId}: Failed to add detection for ${row.species}`);
          } else {
            detectionsAdded++;
          }
        }
      }

      setResult({
        success: errors.length < rows.length,
        message: `Processed ${sampleGroups.size} samples`,
        routesProcessed,
        detectionsAdded,
        errors
      });

    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        message: 'Upload failed',
        routesProcessed: 0,
        detectionsAdded: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Metabarcode Data
        </h3>
        <p className="text-sm text-gray-600">
          Upload a CSV file containing pathogen detection data from sequencing.
        </p>
      </div>

      <div className="space-y-4">
        {/* File input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* CSV Format Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Expected CSV Format:</h4>
          <pre className="text-xs text-blue-800 font-mono overflow-x-auto">
{`sample_id,start_name,start_point,end_name,end_point,species,read_count,collection_date
25_01,Perth,"-31.95, 115.86",Bindoon,"-31.39, 116.09",Puccinia striiformis,3146,30/07/2025`}
          </pre>
        </div>

        {/* Upload button */}
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              'Upload & Process'
            )}
          </button>
          {file && !uploading && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h4 className={`font-medium mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {result.message}
            </h4>
            <div className="text-sm space-y-1">
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                Routes created: {result.routesProcessed}
              </p>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                Detections added: {result.detectionsAdded}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-red-900 mb-1">Errors ({result.errors.length}):</p>
                  <div className="bg-white rounded p-2 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 10).map((error, i) => (
                      <p key={i} className="text-xs text-red-700">{error}</p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-xs text-red-600 italic mt-1">
                        ... and {result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

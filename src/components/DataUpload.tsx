'use client';

import { useState, useRef } from 'react';
import { Sample, PathogenDetection } from '@/data/sampleData';

interface DataUploadProps {
  onDataUploaded: (samples: Sample[]) => void;
  onClose: () => void;
}

export default function DataUpload({ onDataUploaded, onClose }: DataUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedData, setUploadedData] = useState<Sample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();

      if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text);
        validateAndSetData(jsonData);
      } else if (file.name.endsWith('.csv')) {
        const csvData = parseCSV(text);
        validateAndSetData(csvData);
      } else {
        throw new Error('Unsupported file format. Please upload JSON or CSV files.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSV = (text: string): Sample[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    // Expected headers for metabarcoding data
    const requiredHeaders = ['sample_id', 'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude', 'location', 'collection_date', 'species', 'read_count', 'relative_abundance'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const samplesMap = new Map<string, Sample>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const sampleId = row.sample_id;
      const species = row.species;

      if (!samplesMap.has(sampleId)) {
        const date = new Date(row.collection_date);
        const season = getSeasonFromDate(date);

        samplesMap.set(sampleId, {
          id: sampleId,
          startLatitude: parseFloat(row.start_latitude),
          startLongitude: parseFloat(row.start_longitude),
          endLatitude: parseFloat(row.end_latitude),
          endLongitude: parseFloat(row.end_longitude),
          location: row.location,
          collectionDate: row.collection_date,
          season,
          year: date.getFullYear(),
          pathogens: []
        });
      }

      const sample = samplesMap.get(sampleId)!;
      const readCount = parseInt(row.read_count);
      const relativeAbundance = parseFloat(row.relative_abundance);

      const pathogen: PathogenDetection = {
        species,
        commonName: getCommonName(species),
        readCount,
        relativeAbundance,
        severity: getSeverity(relativeAbundance)
      };

      sample.pathogens.push(pathogen);
    }

    return Array.from(samplesMap.values());
  };

  const getSeasonFromDate = (date: Date): string => {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    if (month >= 6 && month <= 8) return 'Winter';
    if (month >= 9 && month <= 11) return 'Spring';
    if (month >= 12 || month <= 2) return 'Summer';
    return 'Autumn';
  };

  const getCommonName = (species: string): string => {
    const commonNames: Record<string, string> = {
      'Puccinia striiformis': 'Stripe Rust',
      'Puccinia graminis': 'Stem Rust',
      'Puccinia triticina': 'Leaf Rust',
      'Fusarium graminearum': 'Fusarium Head Blight',
      'Fusarium pseudograminearum': 'Crown Rot',
      'Pyrenophora tritici-repentis': 'Tan Spot',
      'Septoria tritici': 'Septoria Leaf Blotch',
      'Rhynchosporium secalis': 'Scald'
    };
    return commonNames[species] || species;
  };

  const getSeverity = (abundance: number): 'low' | 'medium' | 'high' => {
    if (abundance >= 20) return 'high';
    if (abundance >= 10) return 'medium';
    return 'low';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateAndSetData = (data: any) => {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array of samples');
    }

    // Basic validation
    const validatedSamples: Sample[] = data.map((item, index) => {
      if (!item.id || !item.startLatitude || !item.startLongitude || !item.endLatitude || !item.endLongitude || !item.location) {
        throw new Error(`Sample at index ${index} is missing required fields (id, start/end coordinates, location)`);
      }
      return item as Sample;
    });

    setUploadedData(validatedSamples);
  };

  const handleConfirmUpload = () => {
    onDataUploaded(uploadedData);
    setUploadedData([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upload Metabarcoding Data</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Upload CSV or JSON files containing sample and pathogen detection data
          </p>
        </div>

        <div className="p-6">
          {!uploadedData.length && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports CSV and JSON formats
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing file...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {uploadedData.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Preview ({uploadedData.length} samples)</h3>
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Sample ID</th>
                      <th className="px-3 py-2 text-left">Location</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Pathogens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedData.slice(0, 10).map((sample, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{sample.id}</td>
                        <td className="px-3 py-2">{sample.location}</td>
                        <td className="px-3 py-2">{sample.collectionDate}</td>
                        <td className="px-3 py-2">{sample.pathogens.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadedData.length > 10 && (
                  <div className="p-2 text-center text-gray-500 text-sm bg-gray-50">
                    ... and {uploadedData.length - 10} more samples
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {uploadedData.length > 0 && (
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => setUploadedData([])}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmUpload}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
            >
              Confirm Upload
            </button>
          </div>
        )}

        {!uploadedData.length && (
          <div className="p-6 border-t bg-gray-50">
            <h4 className="font-medium mb-2">Expected CSV Format:</h4>
            <code className="block text-xs bg-white p-2 rounded border overflow-x-auto">
              sample_id,start_latitude,start_longitude,end_latitude,end_longitude,location,collection_date,species,read_count,relative_abundance<br/>
              WAB001,-30.7854,121.4473,-30.7254,121.5073,Merredin Route,2024-06-15,Puccinia striiformis,1245,15.2<br/>
              WAB001,-30.7854,121.4473,-30.7254,121.5073,Merredin Route,2024-06-15,Fusarium pseudograminearum,892,10.9
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
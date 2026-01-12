export interface Sample {
  id: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  location: string;
  collectionDate: string;
  season: string;
  year: number;
  pathogens: PathogenDetection[];
  // Legacy support for single-point samples
  latitude?: number;
  longitude?: number;
}

export interface PathogenDetection {
  species: string;
  commonName: string;
  readCount: number;
  relativeAbundance: number;
  severity: 'low' | 'medium' | 'high';
}

export interface Pathogen {
  species: string;
  commonName: string;
  category: string;
  description: string;
  cropAffected: string[];
}

export const pathogens: Pathogen[] = [
  {
    species: 'Puccinia striiformis',
    commonName: 'Stripe Rust',
    category: 'Rust',
    description: 'Yellow stripe rust affecting wheat and barley',
    cropAffected: ['wheat', 'barley']
  },
  {
    species: 'Puccinia graminis',
    commonName: 'Stem Rust',
    category: 'Rust',
    description: 'Black stem rust, historically devastating to wheat',
    cropAffected: ['wheat', 'barley', 'oats']
  },
  {
    species: 'Puccinia triticina',
    commonName: 'Leaf Rust',
    category: 'Rust',
    description: 'Brown leaf rust commonly found on wheat',
    cropAffected: ['wheat']
  },
  {
    species: 'Fusarium graminearum',
    commonName: 'Fusarium Head Blight',
    category: 'Fusarium',
    description: 'Causes head blight and produces mycotoxins',
    cropAffected: ['wheat', 'barley']
  },
  {
    species: 'Fusarium pseudograminearum',
    commonName: 'Crown Rot',
    category: 'Fusarium',
    description: 'Causes crown rot and whiteheads',
    cropAffected: ['wheat', 'barley']
  },
  {
    species: 'Pyrenophora tritici-repentis',
    commonName: 'Tan Spot',
    category: 'Leaf Spot',
    description: 'Causes tan necrotic lesions on leaves',
    cropAffected: ['wheat']
  },
  {
    species: 'Septoria tritici',
    commonName: 'Septoria Leaf Blotch',
    category: 'Leaf Spot',
    description: 'Causes irregular brown lesions',
    cropAffected: ['wheat']
  },
  {
    species: 'Rhynchosporium secalis',
    commonName: 'Scald',
    category: 'Leaf Spot',
    description: 'Causes scalding lesions on barley',
    cropAffected: ['barley']
  }
];

// Color palette for different pathogen species (accessible, distinct colors)
export const pathogenColors: Record<string, string> = {
  'Puccinia striiformis': '#f59e0b',      // Amber/Yellow - matches "stripe" rust
  'Puccinia graminis': '#dc2626',         // Red - matches "stem" rust severity
  'Puccinia triticina': '#ea580c',        // Orange - matches "leaf" rust
  'Fusarium graminearum': '#7c3aed',      // Purple - distinct for Fusarium
  'Fusarium pseudograminearum': '#8b5cf6', // Light purple - related to graminearum
  'Pyrenophora tritici-repentis': '#059669', // Green - tan spot
  'Septoria tritici': '#0891b2',          // Blue - septoria
  'Rhynchosporium secalis': '#be185d'     // Pink - scald
};

// Sequential sampling routes following major highways through WA wheat belt
// Routes follow logical road connections and progress through wheat growing regions
export const samples: Sample[] = [
  // Route 1: Great Eastern Highway - Perth to Southern Cross (Day 1)
  {
    id: 'WAB001',
    startLatitude: -31.9505,
    startLongitude: 115.8605,
    endLatitude: -31.2305,
    endLongitude: 119.3705,
    location: 'Perth to Southern Cross (Great Eastern Hwy)',
    collectionDate: '2024-06-15',
    season: 'Early Winter',
    year: 2024,
    pathogens: [
      { species: 'Puccinia striiformis', commonName: 'Stripe Rust', readCount: 1245, relativeAbundance: 15.2, severity: 'medium' },
      { species: 'Fusarium pseudograminearum', commonName: 'Crown Rot', readCount: 892, relativeAbundance: 10.9, severity: 'low' },
      { species: 'Septoria tritici', commonName: 'Septoria Leaf Blotch', readCount: 456, relativeAbundance: 5.6, severity: 'low' }
    ]
  },
  // Route 2: Southern Cross to Merredin via Coolgardie-Esperance Hwy (Day 2)
  {
    id: 'WAB002',
    startLatitude: -31.2305,
    startLongitude: 119.3705,
    endLatitude: -30.7554,
    endLongitude: 121.4773,
    location: 'Southern Cross to Merredin',
    collectionDate: '2024-06-20',
    season: 'Early Winter',
    year: 2024,
    pathogens: [
      { species: 'Puccinia triticina', commonName: 'Leaf Rust', readCount: 2134, relativeAbundance: 22.1, severity: 'high' },
      { species: 'Pyrenophora tritici-repentis', commonName: 'Tan Spot', readCount: 1567, relativeAbundance: 16.2, severity: 'medium' },
      { species: 'Fusarium graminearum', commonName: 'Fusarium Head Blight', readCount: 743, relativeAbundance: 7.7, severity: 'low' }
    ]
  },
  // Route 3: Merredin to Mukinbudin via local roads (Day 3)
  {
    id: 'WAB003',
    startLatitude: -30.7554,
    startLongitude: 121.4773,
    endLatitude: -30.4531,
    endLongitude: 119.6906,
    location: 'Merredin to Mukinbudin',
    collectionDate: '2024-07-05',
    season: 'Mid Winter',
    year: 2024,
    pathogens: [
      { species: 'Rhynchosporium secalis', commonName: 'Scald', readCount: 1876, relativeAbundance: 19.4, severity: 'medium' },
      { species: 'Puccinia striiformis', commonName: 'Stripe Rust', readCount: 1023, relativeAbundance: 10.6, severity: 'medium' },
      { species: 'Fusarium pseudograminearum', commonName: 'Crown Rot', readCount: 654, relativeAbundance: 6.8, severity: 'low' }
    ]
  },
  // Route 4: Mukinbudin to Wongan Hills via Pithara (Day 4)
  {
    id: 'WAB004',
    startLatitude: -30.4531,
    startLongitude: 119.6906,
    endLatitude: -30.8944,
    endLongitude: 116.7186,
    location: 'Mukinbudin to Wongan Hills',
    collectionDate: '2024-07-10',
    season: 'Mid Winter',
    year: 2024,
    pathogens: [
      { species: 'Puccinia graminis', commonName: 'Stem Rust', readCount: 2891, relativeAbundance: 28.7, severity: 'high' },
      { species: 'Puccinia striiformis', commonName: 'Stripe Rust', readCount: 1456, relativeAbundance: 14.4, severity: 'medium' },
      { species: 'Septoria tritici', commonName: 'Septoria Leaf Blotch', readCount: 789, relativeAbundance: 7.8, severity: 'low' }
    ]
  },
  // Route 5: Wongan Hills to Moora via Wubin (Day 5)
  {
    id: 'WAB005',
    startLatitude: -30.8944,
    startLongitude: 116.7186,
    endLatitude: -30.6397,
    endLongitude: 115.9775,
    location: 'Wongan Hills to Moora',
    collectionDate: '2024-07-25',
    season: 'Late Winter',
    year: 2024,
    pathogens: [
      { species: 'Fusarium graminearum', commonName: 'Fusarium Head Blight', readCount: 1987, relativeAbundance: 21.3, severity: 'high' },
      { species: 'Pyrenophora tritici-repentis', commonName: 'Tan Spot', readCount: 1234, relativeAbundance: 13.2, severity: 'medium' },
      { species: 'Puccinia triticina', commonName: 'Leaf Rust', readCount: 876, relativeAbundance: 9.4, severity: 'low' }
    ]
  },
  // Route 6: Moora to Gingin via Calingiri (Day 6)
  {
    id: 'WAB006',
    startLatitude: -30.6397,
    startLongitude: 115.9775,
    endLatitude: -31.3461,
    endLongitude: 115.9088,
    location: 'Moora to Gingin',
    collectionDate: '2024-08-10',
    season: 'Late Winter',
    year: 2024,
    pathogens: [
      { species: 'Septoria tritici', commonName: 'Septoria Leaf Blotch', readCount: 2456, relativeAbundance: 25.1, severity: 'high' },
      { species: 'Rhynchosporium secalis', commonName: 'Scald', readCount: 1345, relativeAbundance: 13.7, severity: 'medium' },
      { species: 'Fusarium pseudograminearum', commonName: 'Crown Rot', readCount: 987, relativeAbundance: 10.1, severity: 'medium' }
    ]
  },
  // Route 7: Gingin to Northam via Chittering (Day 7)
  {
    id: 'WAB007',
    startLatitude: -31.3461,
    startLongitude: 115.9088,
    endLatitude: -31.6541,
    endLongitude: 116.6686,
    location: 'Gingin to Northam',
    collectionDate: '2024-08-15',
    season: 'Late Winter',
    year: 2024,
    pathogens: [
      { species: 'Puccinia graminis', commonName: 'Stem Rust', readCount: 1765, relativeAbundance: 18.9, severity: 'medium' },
      { species: 'Puccinia striiformis', commonName: 'Stripe Rust', readCount: 1123, relativeAbundance: 12.0, severity: 'medium' },
      { species: 'Pyrenophora tritici-repentis', commonName: 'Tan Spot', readCount: 654, relativeAbundance: 7.0, severity: 'low' }
    ]
  },
  // Route 8: Northam to Brookton via York (Day 8)
  {
    id: 'WAB008',
    startLatitude: -31.6541,
    startLongitude: 116.6686,
    endLatitude: -32.3644,
    endLongitude: 117.0347,
    location: 'Northam to Brookton via York',
    collectionDate: '2024-09-01',
    season: 'Early Spring',
    year: 2024,
    pathogens: [
      { species: 'Fusarium graminearum', commonName: 'Fusarium Head Blight', readCount: 2234, relativeAbundance: 24.6, severity: 'high' },
      { species: 'Puccinia triticina', commonName: 'Leaf Rust', readCount: 1567, relativeAbundance: 17.2, severity: 'medium' },
      { species: 'Rhynchosporium secalis', commonName: 'Scald', readCount: 889, relativeAbundance: 9.8, severity: 'low' }
    ]
  },
  // Route 9: Brookton to Katanning via Pingelly (Day 9)
  {
    id: 'WAB009',
    startLatitude: -32.3644,
    startLongitude: 117.0347,
    endLatitude: -33.6894,
    endLongitude: 117.5567,
    location: 'Brookton to Katanning',
    collectionDate: '2024-09-05',
    season: 'Early Spring',
    year: 2024,
    pathogens: [
      { species: 'Puccinia striiformis', commonName: 'Stripe Rust', readCount: 1876, relativeAbundance: 18.9, severity: 'medium' },
      { species: 'Fusarium graminearum', commonName: 'Fusarium Head Blight', readCount: 1245, relativeAbundance: 12.6, severity: 'medium' },
      { species: 'Septoria tritici', commonName: 'Septoria Leaf Blotch', readCount: 789, relativeAbundance: 8.0, severity: 'low' }
    ]
  },
  // Route 10: Katanning to Albany via Mount Barker (Day 10)
  {
    id: 'WAB010',
    startLatitude: -33.6894,
    startLongitude: 117.5567,
    endLatitude: -34.9574,
    endLongitude: 117.8843,
    location: 'Katanning to Albany',
    collectionDate: '2024-09-10',
    season: 'Early Spring',
    year: 2024,
    pathogens: [
      { species: 'Puccinia triticina', commonName: 'Leaf Rust', readCount: 2134, relativeAbundance: 21.5, severity: 'high' },
      { species: 'Pyrenophora tritici-repentis', commonName: 'Tan Spot', readCount: 1567, relativeAbundance: 15.8, severity: 'medium' },
      { species: 'Rhynchosporium secalis', commonName: 'Scald', readCount: 923, relativeAbundance: 9.3, severity: 'low' }
    ]
  },

  // 2023 data - Previous year's route (partial coverage for comparison)
  {
    id: 'WAB001_2023',
    startLatitude: -31.9505,
    startLongitude: 115.8605,
    endLatitude: -31.2305,
    endLongitude: 119.3705,
    location: 'Perth to Southern Cross (Great Eastern Hwy)',
    collectionDate: '2023-06-15',
    season: 'Early Winter',
    year: 2023,
    pathogens: [
      { species: 'Puccinia striiformis', commonName: 'Stripe Rust', readCount: 856, relativeAbundance: 9.8, severity: 'low' },
      { species: 'Septoria tritici', commonName: 'Septoria Leaf Blotch', readCount: 1234, relativeAbundance: 14.1, severity: 'medium' }
    ]
  },
  {
    id: 'WAB002_2023',
    startLatitude: -31.2305,
    startLongitude: 119.3705,
    endLatitude: -30.7554,
    endLongitude: 121.4773,
    location: 'Southern Cross to Merredin',
    collectionDate: '2023-07-10',
    season: 'Mid Winter',
    year: 2023,
    pathogens: [
      { species: 'Puccinia triticina', commonName: 'Leaf Rust', readCount: 1456, relativeAbundance: 16.7, severity: 'medium' },
      { species: 'Fusarium pseudograminearum', commonName: 'Crown Rot', readCount: 987, relativeAbundance: 11.3, severity: 'low' }
    ]
  }
];

export const getUniqueYears = (): number[] => {
  return [...new Set(samples.map(s => s.year))].sort((a, b) => b - a);
};

export const getUniqueSeasons = (): string[] => {
  return [...new Set(samples.map(s => s.season))];
};

export const getUniquePathogens = (): string[] => {
  const allPathogens = samples.flatMap(s => s.pathogens.map(p => p.species));
  return [...new Set(allPathogens)].sort();
};
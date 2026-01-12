# Supabase Setup for Pathogen Monitor

This document explains how to set up Supabase for the pathogen monitoring application.

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

### 2. Set up Database Schema

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor:

```bash
# Copy the contents of supabase/schema.sql and run it in Supabase SQL Editor
```

This will create:
- Tables for organizations, sampling routes, pathogen species, and detections
- Indexes for performance
- Row Level Security policies for public read access
- A view for easy data querying
- Default pathogen species data

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Data Ingestion

Use the data ingestion script to load your CSV data:

```bash
# Dry run to test the data transformation
node scripts/ingest-data.js --file ../dummy_data.csv --dry-run

# Actually ingest the data
node scripts/ingest-data.js --file ../dummy_data.csv --org "Your Organization Name"
```

## CSV Format

The ingestion script expects CSV files with this format:

```csv
sample_id,start_name,start_point,end_name,end_point,species,read_count,collection_date
25_01,Perth,"-31.95086, 115.86223",Bindoon,"-31.39306, 116.09878",Puccinia striiformis,1234,30/07/2025
```

Where:
- `sample_id`: Unique identifier for the sampling route
- `start_name`, `end_name`: Location names
- `start_point`, `end_point`: GPS coordinates in quoted format
- `species`: Pathogen species name (must match database species)
- `read_count`: Number of sequencing reads detected
- `collection_date`: Date in DD/MM/YYYY format

## Database Structure

- **organizations**: Research groups/institutions
- **sampling_routes**: GPS routes with start/end points
- **pathogen_species**: Reference data for known pathogens
- **pathogen_detections**: Detection data linking routes to pathogens

## Security

- Only public read access is enabled
- No public write access to prevent unauthorized data modification
- Use the ingestion script for secure data uploads
- Service role key required for data modification

## Development

The app will automatically:
- Load data from Supabase on startup
- Show loading states while fetching data
- Fall back gracefully if database is unavailable
- Use the existing static data format internally

## Data Management Commands

```bash
# Ingest new data
node scripts/ingest-data.js --file path/to/data.csv

# Ingest with specific organization
node scripts/ingest-data.js --file path/to/data.csv --org "University of WA"

# Test data transformation without inserting
node scripts/ingest-data.js --file path/to/data.csv --dry-run
```
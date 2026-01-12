# Database Management with Supabase CLI

This document explains how to manage your database schema and data using version-controlled migrations and CLI tools.

## Quick Start

```bash
# Test schema deployment (dry run)
npm run db:deploy:dry

# Deploy schema to production
npm run db:deploy

# Test data ingestion (dry run)
npm run data:ingest:dry -- --file ../dummy_data.csv

# Ingest real data
npm run data:ingest -- --file ../dummy_data.csv --org "Your Organization"
```

## Schema Management

### Creating New Migrations

When you need to modify the database schema:

1. **Create a new migration file**:
   ```bash
   # Create a timestamped migration file
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_your_change_description.sql
   ```

2. **Write your SQL changes**:
   ```sql
   -- supabase/migrations/20250130120000_add_sample_metadata.sql

   -- Add new column to sampling_routes
   ALTER TABLE sampling_routes
   ADD COLUMN weather_conditions JSONB DEFAULT '{}';

   -- Create index for new column
   CREATE INDEX idx_sampling_routes_weather
   ON sampling_routes USING GIN(weather_conditions);
   ```

3. **Test the migration**:
   ```bash
   npm run db:deploy:dry
   ```

4. **Apply to production**:
   ```bash
   npm run db:deploy
   ```

### Migration File Naming

Use this format: `YYYYMMDDHHMMSS_description.sql`

Examples:
- `20250130120000_initial_schema.sql`
- `20250130130000_add_weather_data.sql`
- `20250130140000_fix_abundance_calculation.sql`

## Data Management

### Ingesting New Data

```bash
# Test with your CSV file
npm run data:ingest:dry -- --file path/to/your/data.csv

# Apply to production
npm run data:ingest -- --file path/to/your/data.csv --org "Research Group Name"
```

### CSV Format Requirements

Your CSV must have these columns:
```csv
sample_id,start_name,start_point,end_name,end_point,species,read_count,collection_date
25_01,Perth,"-31.95086, 115.86223",Bindoon,"-31.39306, 116.09878",Puccinia striiformis,1234,30/07/2025
```

## Version Control Workflow

### 1. Making Schema Changes

```bash
# 1. Create feature branch
git checkout -b feature/add-weather-data

# 2. Create migration
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_weather_data.sql

# 3. Write SQL changes
vim supabase/migrations/20250130120000_add_weather_data.sql

# 4. Test locally
npm run db:deploy:dry

# 5. Commit changes
git add supabase/migrations/
git commit -m "Add weather data support to sampling routes"

# 6. Push and create PR
git push origin feature/add-weather-data
```

### 2. Deploying to Production

```bash
# 1. Merge PR to main
git checkout main
git pull origin main

# 2. Deploy schema changes
npm run db:deploy

# 3. Verify deployment
npm run dev  # Check that app still works
```

## Project Structure

```
pathogen-monitor/
├── supabase/
│   ├── config.toml           # Supabase CLI configuration
│   ├── migrations/           # Database schema migrations
│   │   ├── 20250101000000_initial_schema.sql
│   │   └── 20250130120000_add_weather_data.sql
│   └── schema.sql           # Legacy schema file (reference only)
├── scripts/
│   ├── deploy.sh            # Shell script for schema deployment
│   ├── deploy-schema.js     # Node.js script for schema deployment
│   └── ingest-data.js       # Data ingestion script
└── .env.local              # Environment variables (keep secure!)
```

## Available Commands

### Database Schema

| Command | Description |
|---------|-------------|
| `npm run db:deploy` | Deploy schema migrations to production |
| `npm run db:deploy:dry` | Test schema deployment (no changes) |
| `npm run db:migrate` | Alternative migration script (Node.js) |
| `npm run db:migrate:dry` | Test Node.js migration script |

### Data Management

| Command | Description |
|---------|-------------|
| `npm run data:ingest -- --file path.csv` | Ingest CSV data |
| `npm run data:ingest:dry -- --file path.csv` | Test data ingestion |

## Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://rrziguogaivzuxdlxffpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Keep service role key secure** - only use for admin operations
3. **Use dry-run mode** to test changes before applying
4. **Review migrations** before deploying to production
5. **Backup database** before major schema changes

## Troubleshooting

### Migration Fails

```bash
# Check what's in your database
npx supabase db diff --schema public

# Reset if needed (WARNING: destroys data)
npx supabase db reset
```

### Connection Issues

```bash
# Verify your environment variables
cat .env.local

# Test connection
npx supabase status
```

### Data Ingestion Issues

```bash
# Check CSV format
head -5 your_data.csv

# Test transformation
npm run data:ingest:dry -- --file your_data.csv
```

## Paper Trail

All changes are tracked through:

1. **Git commits** - Schema migration files
2. **Migration timestamps** - Applied changes in database
3. **Database logs** - Supabase dashboard > Logs
4. **Script output** - Terminal logs during deployment

This ensures full traceability of all database changes!
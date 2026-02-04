# Field Collection & Role-Based Access Implementation

## Overview
Enhanced the pathogen monitoring application with field data collection capabilities and role-based access control.

## New Features

### 1. Role-Based Access Control

**Three User Roles:**
- **Viewer**: Map viewing only
- **Sampler**: Map + field collection
- **Admin**: Full access (map, field, admin panel)

**New Files:**
- `src/lib/auth.ts` - Updated auth service with role hierarchy
- `src/components/RoleGuard.tsx` - Role-based route protection
- `src/app/login/page.tsx` - Unified login page with role-based redirects

**Database Migration:**
- `supabase/migrations/20260204_user_roles_auth.sql`
  - `users` table with email/password/role
  - `sample_uploads` metadata table
  - `gps_tracking_points` for route tracking
  - Updated RLS policies

### 2. Field Collection Interface

**New Page:** `/field`
- Mobile-optimized interface for field sampling
- GPS tracking with offline fallback to manual entry
- Sample ID entry and confirmation workflow
- Real-time position tracking
- Route recording (start/end positions + breadcrumb trail)

**New Files:**
- `src/app/field/page.tsx` - Main field collection page
- `src/components/FieldMap.tsx` - Interactive map for GPS tracking

**Workflow:**
1. Click "Begin Sample"
2. Enter unique sample ID
3. GPS automatically captures start position (or tap map manually)
4. Track location during drive
5. Click "End Sample" to save route
6. Data saved to database with timestamps

**Features:**
- Automatic GPS tracking (updates every 30 seconds)
- Manual position entry (click map) for offline/no-GPS scenarios
- Visual route display with start (green) and current (blue) markers
- Breadcrumb trail visualization
- Real-time accuracy reporting

### 3. Metabarcode CSV Upload

**New Component:** `src/components/MetabarcodeUpload.tsx`
- Integrated into admin data management page
- Batch processing of sequencing results
- Automatic route creation/update
- Pathogen detection import

**CSV Format:**
```csv
sample_id,start_name,start_point,end_name,end_point,species,read_count,collection_date
25_01,Perth,"-31.95, 115.86",Bindoon,"-31.39, 116.09",Puccinia striiformis,3146,30/07/2025
```

**Processing:**
- Groups rows by `sample_id`
- Creates sampling routes if they don't exist
- Upserts pathogen detections (handles duplicates)
- Tracks upload metadata (filename, size, row count)
- Provides detailed success/error reporting

### 4. Database Schema Updates

**New Tables:**
- `users` - User authentication and roles
- `sample_uploads` - CSV upload tracking
- `gps_tracking_points` - GPS breadcrumb trails

**Updated Tables:**
- `sampling_routes` - Added:
  - `created_by` (user reference)
  - `collection_start_time`
  - `collection_end_time`

## Updated Files

### Admin Pages
- `src/app/admin/data/page.tsx`
  - Now uses `RoleGuard` instead of `AdminAuthGuard`
  - Includes `MetabarcodeUpload` component
  - Automatic route refresh after CSV upload

### Auth Guards
- Deprecated: `src/components/AdminAuthGuard.tsx` (kept for backward compatibility)
- New: `src/components/RoleGuard.tsx` (supports all three roles)

## Migration Instructions

### 1. Run Database Migrations
```bash
cd app/pathogen-monitor
supabase db reset  # Or apply migration manually
```

### 2. Create Initial Users
```sql
-- Example: Create test users (use proper password hashing in production!)
INSERT INTO users (email, password_hash, role, full_name, is_active) VALUES
  ('admin@spore.local', 'admin123', 'admin', 'Admin User', true),
  ('sampler@spore.local', 'sampler123', 'sampler', 'Field Sampler', true),
  ('viewer@spore.local', 'viewer123', 'viewer', 'Read-Only Viewer', true);
```

**⚠️ IMPORTANT:** The current password system is NOT secure (plain text). Before production:
- Implement proper bcrypt password hashing
- Use environment variables for initial admin credentials
- Consider integrating Supabase Auth for production-ready authentication

### 3. Update Environment Variables
No new environment variables needed, but consider adding:
```env
NEXT_PUBLIC_DEFAULT_MAP_CENTER="-31.9505,115.8605"
NEXT_PUBLIC_GPS_UPDATE_INTERVAL=30000
```

## Usage Guide

### For Samplers (Field Collection)

1. **Login** at `/login` with sampler credentials
2. Navigate to `/field` (auto-redirected after login)
3. Click **"Begin Sample"**
4. Enter sample ID (e.g., `26_01`)
5. Start driving - GPS tracks automatically
6. If GPS fails, click map to set positions manually
7. Click **"End Sample"** when done
8. Route saved with timestamps and GPS trail

### For Admins (Data Management)

1. **Login** at `/login` with admin credentials
2. Navigate to **Admin Dashboard** → **Manage Data**
3. **Option A - CSV Upload:**
   - Upload metabarcode CSV file
   - System processes all detections automatically
   - Review success/error report
4. **Option B - Manual Entry:**
   - Click "Add New Route" (same as before)
   - Manually enter pathogen detections

### For Viewers (Map Only)

1. **Login** at `/login` with viewer credentials
2. View map with all sampling routes
3. No edit access

## Future Enhancements

### Planned for Per-Sample CSV Storage
Currently all detections for a sample are in one CSV. Future plans:
1. Store individual CSV files per sample in Supabase Storage
2. Add `file_path` column to `sample_uploads` table
3. Implement file download/view from admin panel
4. Version control for re-uploads

### Security Improvements
- [ ] Implement bcrypt password hashing
- [ ] Add password reset flow
- [ ] Rate limiting on login attempts
- [ ] Session token encryption
- [ ] 2FA for admin accounts

### Field Collection Enhancements
- [ ] Offline mode with local storage sync
- [ ] Photo capture for sample locations
- [ ] Voice notes/comments
- [ ] Route preview before saving
- [ ] Export GPX files

### Data Management
- [ ] Bulk edit pathogen detections
- [ ] Data validation rules
- [ ] Duplicate detection warnings
- [ ] CSV export functionality
- [ ] Data versioning/audit trail

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create test users for each role
- [ ] Test login/logout flow
- [ ] Test role-based redirects
- [ ] Test field collection with GPS
- [ ] Test field collection with manual entry
- [ ] Test CSV upload with sample data
- [ ] Test manual route creation
- [ ] Verify viewer cannot access admin/field pages
- [ ] Verify sampler cannot access admin pages
- [ ] Test on mobile device for GPS accuracy

## Notes

- GPS tracking requires HTTPS in production (browser security requirement)
- Mobile browsers handle GPS permissions differently
- Manual entry fallback ensures system works everywhere
- CSV upload is idempotent (safe to re-upload)
- The migration includes dummy password hash - change before deployment!

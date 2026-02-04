-- User authentication and role-based access control
-- Roles: viewer (map only), sampler (map + field collection), admin (full access)
-- SAFE VERSION: Handles existing tables gracefully

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'sampler', 'admin')),
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Sample uploads metadata table (for tracking CSV uploads)
CREATE TABLE IF NOT EXISTS sample_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES sampling_routes(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    row_count INTEGER,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'completed',
    notes TEXT
);

-- GPS tracking points for field collection (optional, for route visualization)
CREATE TABLE IF NOT EXISTS gps_tracking_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES sampling_routes(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(10,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES users(id)
);

-- Add user reference to sampling routes (only if columns don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='sampling_routes' AND column_name='created_by') THEN
        ALTER TABLE sampling_routes ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='sampling_routes' AND column_name='collection_start_time') THEN
        ALTER TABLE sampling_routes ADD COLUMN collection_start_time TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='sampling_routes' AND column_name='collection_end_time') THEN
        ALTER TABLE sampling_routes ADD COLUMN collection_end_time TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Indexes for performance (CREATE INDEX IF NOT EXISTS requires PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sample_uploads_route ON sample_uploads(route_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_route ON gps_tracking_points(route_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_time ON gps_tracking_points(recorded_at);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_points ENABLE ROW LEVEL SECURITY;

-- Drop old policy only if it exists, create new one
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sampling_routes' AND policyname='Public read access') THEN
        DROP POLICY "Public read access" ON sampling_routes;
    END IF;
END $$;

-- Create policies (will skip if already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Public read user info') THEN
        CREATE POLICY "Public read user info" ON users FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sample_uploads' AND policyname='Public read sample uploads') THEN
        CREATE POLICY "Public read sample uploads" ON sample_uploads FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gps_tracking_points' AND policyname='Public read gps points') THEN
        CREATE POLICY "Public read gps points" ON gps_tracking_points FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sampling_routes' AND policyname='Public read sampling routes') THEN
        CREATE POLICY "Public read sampling routes" ON sampling_routes FOR SELECT USING (true);
    END IF;
END $$;

-- Insert a default admin user (only if doesn't exist)
INSERT INTO users (email, password_hash, role, full_name)
SELECT 'admin@spore.local', 'admin123', 'admin', 'System Administrator'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@spore.local');

-- Add comments for documentation
COMMENT ON TABLE users IS 'Application users with role-based access control';
COMMENT ON TABLE sample_uploads IS 'Metadata for metabarcode CSV file uploads';
COMMENT ON TABLE gps_tracking_points IS 'GPS breadcrumb trail for field collection routes';
COMMENT ON COLUMN users.role IS 'viewer: map only, sampler: map+field, admin: full access';

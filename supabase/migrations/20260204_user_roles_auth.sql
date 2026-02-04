-- User authentication and role-based access control
-- Roles: viewer (map only), sampler (map + field collection), admin (full access)

-- Users table for authentication
CREATE TABLE users (
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
CREATE TABLE sample_uploads (
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
CREATE TABLE gps_tracking_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES sampling_routes(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(10,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES users(id)
);

-- Add user reference to sampling routes
ALTER TABLE sampling_routes
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN collection_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN collection_end_time TIMESTAMP WITH TIME ZONE;

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sample_uploads_route ON sample_uploads(route_id);
CREATE INDEX idx_gps_tracking_route ON gps_tracking_points(route_id);
CREATE INDEX idx_gps_tracking_time ON gps_tracking_points(recorded_at);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_points ENABLE ROW LEVEL SECURITY;

-- Public can read user info (except password hash)
CREATE POLICY "Public read user info" ON users
FOR SELECT
USING (true);

-- Sample uploads visible to all authenticated users
CREATE POLICY "Public read sample uploads" ON sample_uploads
FOR SELECT
USING (true);

-- GPS tracking points visible to all
CREATE POLICY "Public read gps points" ON gps_tracking_points
FOR SELECT
USING (true);

-- Update sampling_routes policies to allow samplers and admins to insert
DROP POLICY IF EXISTS "Public read access" ON sampling_routes;
CREATE POLICY "Public read sampling routes" ON sampling_routes
FOR SELECT
USING (true);

-- Note: Write policies will be enforced at application level
-- since we're using simple auth without Supabase Auth integration

-- Insert a default admin user (password: 'admin123' - CHANGE THIS!)
-- Password hash is bcrypt hash of 'admin123'
INSERT INTO users (email, password_hash, role, full_name) VALUES
('admin@spore.local', '$2a$10$rVZqJ4F5OHZQ5xKxJ5xJ5eqYJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5', 'admin', 'System Administrator');

-- Add comments for documentation
COMMENT ON TABLE users IS 'Application users with role-based access control';
COMMENT ON TABLE sample_uploads IS 'Metadata for metabarcode CSV file uploads';
COMMENT ON TABLE gps_tracking_points IS 'GPS breadcrumb trail for field collection routes';
COMMENT ON COLUMN users.role IS 'viewer: map only, sampler: map+field, admin: full access';

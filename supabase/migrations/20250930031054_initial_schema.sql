-- Simple initial schema for pathogen monitoring
-- Start simple, build up later

-- Basic sampling routes table
CREATE TABLE sampling_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id VARCHAR(50) NOT NULL UNIQUE,
    start_name VARCHAR(255) NOT NULL,
    end_name VARCHAR(255) NOT NULL,
    start_latitude DECIMAL(10,8) NOT NULL,
    start_longitude DECIMAL(11,8) NOT NULL,
    end_latitude DECIMAL(10,8) NOT NULL,
    end_longitude DECIMAL(11,8) NOT NULL,
    collection_date DATE NOT NULL,
    year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM collection_date)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple pathogen species table
CREATE TABLE pathogen_species (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_name VARCHAR(255) NOT NULL UNIQUE,
    common_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple pathogen detections table
CREATE TABLE pathogen_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES sampling_routes(id) ON DELETE CASCADE,
    pathogen_species_id UUID REFERENCES pathogen_species(id),
    read_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_pathogen_per_route UNIQUE (route_id, pathogen_species_id)
);

-- Basic indexes
CREATE INDEX idx_sampling_routes_date ON sampling_routes(collection_date);
CREATE INDEX idx_sampling_routes_year ON sampling_routes(year);
CREATE INDEX idx_pathogen_detections_route ON pathogen_detections(route_id);

-- Allow public read access
ALTER TABLE sampling_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathogen_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathogen_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON sampling_routes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON pathogen_species FOR SELECT USING (true);
CREATE POLICY "Public read access" ON pathogen_detections FOR SELECT USING (true);

-- Insert basic pathogen species
INSERT INTO pathogen_species (species_name, common_name) VALUES
('Puccinia striiformis', 'Stripe Rust'),
('Puccinia graminis', 'Stem Rust'),
('Puccinia triticina', 'Leaf Rust'),
('Fusarium graminearum', 'Fusarium Head Blight'),
('Fusarium pseudograminearum', 'Crown Rot'),
('Septoria tritici', 'Septoria Leaf Blotch'),
('Pyrenophora tritici-repentis', 'Tan Spot'),
('Rhynchosporium secalis', 'Scald');
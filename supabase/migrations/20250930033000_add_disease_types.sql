-- Add disease types to pathogen species
-- This allows categorizing pathogens by disease type (rust, leaf spot, etc.)

-- Add disease_type column to pathogen_species
ALTER TABLE pathogen_species ADD COLUMN disease_type VARCHAR(100);

-- Update existing data with appropriate disease types
UPDATE pathogen_species SET disease_type = 'Rust' WHERE species_name IN (
    'Puccinia striiformis',
    'Puccinia graminis',
    'Puccinia triticina'
);

UPDATE pathogen_species SET disease_type = 'Fusarium' WHERE species_name IN (
    'Fusarium graminearum',
    'Fusarium pseudograminearum'
);

UPDATE pathogen_species SET disease_type = 'Leaf Spot' WHERE species_name IN (
    'Septoria tritici',
    'Pyrenophora tritici-repentis',
    'Rhynchosporium secalis'
);

-- Make disease_type required for new entries
ALTER TABLE pathogen_species ALTER COLUMN disease_type SET NOT NULL;

-- Add index for better performance
CREATE INDEX idx_pathogen_species_disease_type ON pathogen_species(disease_type);
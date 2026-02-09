# spore.net

**Crop Diseases and Where to Find Them**

A real-time pathogen monitoring and mapping platform for tracking crop diseases across Western Australia's wheat belt.

## Overview

spore.net is a web application designed to help researchers and agricultural professionals monitor, track, and visualize plant pathogen distributions across agricultural regions. The platform combines GPS-based field sampling with environmental DNA (eDNA) metabarcoding data to create an interactive map of pathogen detections.

## Key Features

### 🗺️ Interactive Pathogen Map
- Real-time visualization of pathogen detection sites across the WA wheat belt
- Color-coded pathogen circles showing species distribution and severity
- Filter by year, individual pathogen species, or disease type categories
- Click on samples to view detailed pathogen composition and metadata

### 📍 Field Sample Collection
- GPS-enabled route tracking for field sampling
- Record start and end locations with automatic coordinate capture
- Real-time GPS tracking during sample collection
- Session recovery for interrupted sampling
- Local storage backup to prevent data loss

### 📊 Data Management
- Upload metabarcoding results via CSV
- View and manage sampling routes with interactive map visualization
- Track pathogen detections with read counts for each sample
- Delete and manage historical data

### 🔬 Pathogen Categories
- **Rust Diseases**: Stripe rust, Stem rust, Leaf rust (*Puccinia* spp.)
- **Fusarium**: Crown rot, Head blight (*Fusarium* spp.)
- **Leaf Spot Diseases**: Tan spot, Septoria leaf blotch, Scald

## User Roles

- **Sampler**: Can collect field samples and view the map
- **Admin**: Full access including pathogen data management and uploads

## Technology Stack

- **Frontend**: Next.js 16 with React, TypeScript, Tailwind CSS
- **Mapping**: Leaflet with CARTO light basemap tiles
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Deployment**: Vercel
- **Authentication**: Custom JWT-based system

## Live Site

Visit [spore.net](https://spore.net) to access the application.

## About

This platform is part of ongoing research into crop disease surveillance using environmental DNA techniques in Western Australian agricultural systems.

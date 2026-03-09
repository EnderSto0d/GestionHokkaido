-- Migration: Add photo_settings JSONB column to escouades
-- Stores per-photo size/position settings for gallery customisation
-- Format: { "photo_1": { "scale": 100, "posX": 50, "posY": 50 }, ... }

ALTER TABLE escouades
ADD COLUMN IF NOT EXISTS photo_settings JSONB DEFAULT NULL;

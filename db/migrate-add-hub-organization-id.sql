-- Migration: Add hub_organization_id to contacts table
-- Date: 2025-12-27
-- Description: Adds support for linking contacts to Hub DB political organizations
--              and adds new contact_type 'political_organization'

-- Add hub_organization_id column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS hub_organization_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_hub_org ON contacts(hub_organization_id);

-- Note: contact_type now supports 'person', 'corporation', and 'political_organization'
-- No constraint change needed as contact_type is TEXT (not ENUM)

-- CapNorth Hub: Organizations and Entitlements Schema
-- Migration: 002_organizations_entitlements.sql
-- Run this in Supabase SQL Editor

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- URL-friendly name, e.g., "acme-corp"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ORG ENTITLEMENTS TABLE
-- Which modules each org has access to
-- ============================================
CREATE TABLE IF NOT EXISTS org_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN ('conversion', 'compliance')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, module_key)
);

-- ============================================
-- ADD organization_id TO user_profiles
-- (nullable for migration - existing users keep working)
-- ============================================
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ============================================
-- MIGRATION HELPER: Create orgs from existing user_profiles
-- Run this ONCE after creating the tables
-- ============================================
-- INSERT INTO organizations (name, slug)
-- SELECT DISTINCT 
--   organization as name,
--   LOWER(REGEXP_REPLACE(organization, '[^a-zA-Z0-9]', '-', 'g')) as slug
-- FROM user_profiles
-- WHERE organization IS NOT NULL AND organization != ''
-- ON CONFLICT (slug) DO NOTHING;

-- Then update user_profiles with organization_id:
-- UPDATE user_profiles up
-- SET organization_id = o.id
-- FROM organizations o
-- WHERE up.organization = o.name AND up.organization_id IS NULL;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_org_entitlements_org_id ON org_entitlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(organization_id);

-- ============================================
-- RLS POLICIES (Enable later when ready)
-- ============================================
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE org_entitlements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own organization
-- CREATE POLICY "Users can view own organization" ON organizations
--   FOR SELECT USING (
--     id IN (
--       SELECT organization_id FROM user_profiles WHERE id = auth.uid()
--     )
--   );

-- Policy: Users can only see entitlements for their org
-- CREATE POLICY "Users can view own org entitlements" ON org_entitlements
--   FOR SELECT USING (
--     organization_id IN (
--       SELECT organization_id FROM user_profiles WHERE id = auth.uid()
--     )
--   );

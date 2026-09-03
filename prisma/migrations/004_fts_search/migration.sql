-- Full-text search via tsvector + GIN indexes
-- Migration: 004 (adds FTS support to Profile, Landmark, Address, BusinessProfile)

-- 1. Profile — search on firstName, lastName, profession
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_profile_search_vector ON "Profile" USING GIN (search_vector);

CREATE OR REPLACE FUNCTION sync_profile_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW."firstName", '') || ' ' ||
    coalesce(NEW."lastName", '') || ' ' ||
    coalesce(NEW.profession, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_search_vector ON "Profile";
CREATE TRIGGER trg_sync_profile_search_vector
  BEFORE INSERT OR UPDATE OF "firstName", "lastName", profession ON "Profile"
  FOR EACH ROW EXECUTE FUNCTION sync_profile_search_vector();

-- 2. Landmark — search on name, description
ALTER TABLE "Landmark" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_landmark_search_vector ON "Landmark" USING GIN (search_vector);

CREATE OR REPLACE FUNCTION sync_landmark_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_landmark_search_vector ON "Landmark";
CREATE TRIGGER trg_sync_landmark_search_vector
  BEFORE INSERT OR UPDATE OF name, description ON "Landmark"
  FOR EACH ROW EXECUTE FUNCTION sync_landmark_search_vector();

-- 3. Address — search on label, avenue, quartier, city
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_address_search_vector ON "Address" USING GIN (search_vector);

CREATE OR REPLACE FUNCTION sync_address_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.label, '') || ' ' ||
    coalesce(NEW.avenue, '') || ' ' ||
    coalesce(NEW.quartier, '') || ' ' ||
    coalesce(NEW.city, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_address_search_vector ON "Address";
CREATE TRIGGER trg_sync_address_search_vector
  BEFORE INSERT OR UPDATE OF label, avenue, quartier, city ON "Address"
  FOR EACH ROW EXECUTE FUNCTION sync_address_search_vector();

-- 4. BusinessProfile — search on name, description, sector, city
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_business_profile_search_vector ON "BusinessProfile" USING GIN (search_vector);

CREATE OR REPLACE FUNCTION sync_business_profile_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.sector, '') || ' ' ||
    coalesce(NEW.city, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_business_profile_search_vector ON "BusinessProfile";
CREATE TRIGGER trg_sync_business_profile_search_vector
  BEFORE INSERT OR UPDATE OF name, description, sector, city ON "BusinessProfile"
  FOR EACH ROW EXECUTE FUNCTION sync_business_profile_search_vector();

-- Re-index all existing rows
UPDATE "Profile" SET "firstName" = "firstName" WHERE "firstName" IS NOT NULL;
UPDATE "Landmark" SET name = name WHERE name IS NOT NULL;
UPDATE "Address" SET city = city WHERE city IS NOT NULL;
UPDATE "BusinessProfile" SET name = name WHERE name IS NOT NULL;

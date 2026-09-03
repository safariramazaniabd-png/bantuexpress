-- Ajout de colonnes geography(Point, 4326) pour les requêtes spatiales PostGIS
-- Les colonnes Float existantes sont conservées pour la compatibilité ORM.

-- UserPosition
ALTER TABLE "UserPosition" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);
UPDATE "UserPosition" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_position_location ON "UserPosition" USING GIST (location);

CREATE OR REPLACE FUNCTION sync_user_position_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_position_location ON "UserPosition";
CREATE TRIGGER trg_sync_user_position_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "UserPosition"
  FOR EACH ROW EXECUTE FUNCTION sync_user_position_location();

-- Landmark
ALTER TABLE "Landmark" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);
UPDATE "Landmark" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landmark_location ON "Landmark" USING GIST (location);

CREATE OR REPLACE FUNCTION sync_landmark_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_landmark_location ON "Landmark";
CREATE TRIGGER trg_sync_landmark_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "Landmark"
  FOR EACH ROW EXECUTE FUNCTION sync_landmark_location();

-- Address
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);
UPDATE "Address" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_address_location ON "Address" USING GIST (location);

CREATE OR REPLACE FUNCTION sync_address_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_address_location ON "Address";
CREATE TRIGGER trg_sync_address_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "Address"
  FOR EACH ROW EXECUTE FUNCTION sync_address_location();

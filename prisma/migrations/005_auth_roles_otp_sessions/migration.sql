-- Migration M1 (partie 1) : extension de l'enum UserRole avec les nouveaux
-- types de compte. Isolée dans sa propre migration car PostgreSQL interdit
-- d'utiliser une valeur d'enum ADD VALUE dans la même transaction que son
-- ajout (restriction P12+). Les tables associées vivent dans 006.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'NGO';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'POLICE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FIREFIGHTER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AMBULANCE';

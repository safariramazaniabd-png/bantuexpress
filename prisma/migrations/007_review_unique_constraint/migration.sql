-- Contrainte unique sur Review (userId, entityType, entityId) : garantit au plus
-- un avis par utilisateur et par entité, au niveau base de données (anti-TOCTOU).
--
-- Additive et non destructive. Si des doublons existent déjà en base, cette
-- migration échoue EXPLICITEMENT lors de `prisma migrate deploy` (set -euo pipefail) :
-- la stratégie est d'échouer fort plutôt que de supprimer/tronquer des données.
-- Déduplication manuelle préalable le cas échéant :
--   SELECT "userId", "entityType", "entityId", COUNT(*)
--   FROM "Review" GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX "Review_userId_entityType_entityId_key"
  ON "Review"("userId", "entityType", "entityId");
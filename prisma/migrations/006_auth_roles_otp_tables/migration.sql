-- Migration M1 (partie 2) : tables Role, UserRoleAssignment, OtpCode,
-- PasswordHistory + seed des 11 types de compte + rétro-synchronisation.

-- Enums pour le canal et la finalité des codes OTP.
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'VERIFY_EMAIL', 'VERIFY_PHONE', 'WHATSAPP');

-- Table Role : catalogue des types de compte (11).
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_slug_key" ON "Role"("slug");
CREATE INDEX "Role_slug_idx" ON "Role"("slug");

-- Table UserRoleAssignment : multi-rôles par utilisateur (unique user+role).
CREATE TABLE "UserRoleAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleId_key" ON "UserRoleAssignment"("userId", "roleId");
CREATE INDEX "UserRoleAssignment_roleId_idx" ON "UserRoleAssignment"("roleId");

ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Table OtpCode : codes de vérification hachés, par canal et finalité.
CREATE TABLE "OtpCode" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "identifier" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpCode_identifier_purpose_createdAt_idx" ON "OtpCode"("identifier", "purpose", "createdAt");
CREATE INDEX "OtpCode_userId_idx" ON "OtpCode"("userId");

ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Table PasswordHistory : historise les mots de passe (anti-réutilisation).
CREATE TABLE "PasswordHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordHistory_userId_createdAt_idx" ON "PasswordHistory"("userId", "createdAt");

ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed de référence des 11 types de compte (INSERT ... ON CONFLICT DO NOTHING).
INSERT INTO "Role" ("id", "slug", "name", "description", "isPublic") VALUES
  ('0be00ad7-f2e2-4834-aeab-438ada8aadc5', 'individual', 'Particulier', 'Compte personnel', true),
  ('59f9d0ae-0605-4fb2-8715-2cbd8ac810d7', 'entreprise', 'Entreprise', 'Profil professionnel d''entreprise', true),
  ('a62a8d0a-d88f-4ce3-a6b9-5e6b2f954d9f', 'administration', 'Administration', 'Compte d''administration publique', true),
  ('15657df5-bd3a-4598-9e70-a30e7b942840', 'ong', 'ONG', 'Organisation non gouvernementale', true),
  ('bf83f79b-317e-43f1-b3a8-65e9c80c4718', 'livreur', 'Livreur', 'Livreur indépendant', true),
  ('3a118099-7854-4541-ab7f-9f61632df4b7', 'transporteur', 'Transporteur', 'Transporteur de marchandises', true),
  ('ce6fdbb7-aee3-4b46-82cb-3a377915c243', 'agence-livraison', 'Agence de livraison', 'Société de livraison', true),
  ('cc14d3e2-f9a9-4966-b04f-c8695680b4bd', 'urgence', 'Urgence', 'Service d''urgence', false),
  ('69c3335b-2435-41fa-9218-70582deeec24', 'police', 'Police', 'Force de police', false),
  ('ee155432-efda-4e57-ac76-0323bb3fc9f2', 'pompiers', 'Pompiers', 'Service d''incendie et de secours', false),
  ('a15013f1-9f38-4eab-ad65-ac0144dc7097', 'ambulance', 'Ambulance', 'Service ambulancier médical', false)
ON CONFLICT ("slug") DO NOTHING;

-- Rétro-synchronisation : assigner à chaque utilisateur existant le rôle
-- correspondant à sa valeur User.role actuelle (rôle primaire).
INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId")
SELECT gen_random_uuid(), u."id", r."id"
FROM "User" u
JOIN "Role" r ON (
  (u."role" = 'INDIVIDUAL' AND r."slug" = 'individual') OR
  (u."role" = 'PROFESSIONAL' AND r."slug" = 'entreprise') OR
  (u."role" = 'ADMIN' AND r."slug" = 'administration') OR
  (u."role" = 'EMERGENCY' AND r."slug" = 'urgence') OR
  (u."role" = 'COURIER' AND r."slug" = 'livreur') OR
  (u."role" = 'TRANSPORTER' AND r."slug" = 'transporteur') OR
  (u."role" = 'DELIVERY_AGENCY' AND r."slug" = 'agence-livraison') OR
  (u."role" = 'NGO' AND r."slug" = 'ong') OR
  (u."role" = 'POLICE' AND r."slug" = 'police') OR
  (u."role" = 'FIREFIGHTER' AND r."slug" = 'pompiers') OR
  (u."role" = 'AMBULANCE' AND r."slug" = 'ambulance')
)
ON CONFLICT ("userId", "roleId") DO NOTHING;

# ============================================================================
# BantuExpress — Image base PostgreSQL + PostGIS
# ----------------------------------------------------------------------------
# L'extension `uuid-ossp` (nécessitée par la migration Prisma `001_initial_schema`)
# est DÉJÀ fournie par l'image officielle `postgis/postgis:16-3.4`
# (paquet `postgresql-16` — fichier /usr/share/postgresql/16/extension/uuid-ossp.control).
#
# NB : le nom de l'extension est `uuid-ossp` (tiret), et non `uuid_ossp` (tiret
# bas). La migration Prisma a été corrigée en conséquence.
#
# Ce Dockerfile est volontairement minimal : il garantit simplement la présence
# de la base conteneurisée sans ajout inutile. Si besoin d'extensions
# supplémentaires, les installer ici.
# ============================================================================
FROM postgis/postgis:16-3.4

# Vérification documentaire : l'extension doit être disponible (pas installée
# dans une base précise, mais disponible pour CREATE EXTENSION).
RUN ls -la /usr/share/postgresql/16/extension/uuid-ossp.control

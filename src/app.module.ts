import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import { validateEnv } from './config/env.validation';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentitiesModule } from './modules/identities/identities.module';
import { GeoModule } from './modules/geo/geo.module';
import { SyncModule } from './modules/sync/sync.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { LandmarksModule } from './modules/landmarks/landmarks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig],
      validate: validateEnv,
    }),

    // Protection anti-abus de base (Module 22) - 100 requetes / minute /
    // IP par defaut. Des limites plus fines par route (ex: tentatives de
    // connexion, verification OTP) seront ajoutees dans le module Auth
    // complet, via @Throttle() route par route.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // DatabaseModule est @Global() - une seule instance de PrismaService
    // (donc un seul pool de connexions PostgreSQL) pour toute l'application.
    DatabaseModule,

    // AuditModule est @Global() - importe une seule fois ici, disponible
    // partout ensuite sans reimport.
    AuditModule,

    AuthModule,
    IdentitiesModule,
    GeoModule,
    SyncModule,
    DeliveryModule,
    NotificationsModule,
    HealthModule,
    AddressesModule,
    LandmarksModule,
  ],
  providers: [
    // Garde anti-abus globale
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Filtre d'exception global - reponse d'erreur uniforme sur toute l'API
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Journalisation automatique des routes @AuditResource(...)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

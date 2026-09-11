import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RolesGuard } from './common/guards/roles.guard';

import { AppController } from './app.controller';


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
import { SearchModule } from './modules/search/search.module';
import { QrCodesModule } from './modules/qrcodes/qrcodes.module';
import { BusinessProfilesModule } from './modules/business-profiles/business-profiles.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { AdminModule } from './modules/admin/admin.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { EventsModule } from './modules/events/events.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { MessagingModule } from './modules/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig],
      validate: validateEnv,
    }),

    // Protection anti-abus de base (Module 22) - 100 requetes / minute /
    // IP par defaut (limite configurable via THROTTLE_LIMIT). Des limites
    // plus fines par route (ex: tentatives de connexion, verification OTP)
    // sont ajoutees via @Throttle() route par route.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        { ttl: 60_000, limit: configService.get<number>('THROTTLE_LIMIT') ?? 100 },
      ],
    }),

    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
    }),

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
    SearchModule,
    QrCodesModule,
    BusinessProfilesModule,
    EmergencyModule,
    AdminModule,
    FavoritesModule,
    ReviewsModule,
    EventsModule,
    CategoriesModule,
    SharingModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [
    // Garde anti-abus globale
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Garde des rôles globale - vérifie @Roles() sur les contrôleurs
    { provide: APP_GUARD, useClass: RolesGuard },

    // Filtre d'exception global - reponse d'erreur uniforme sur toute l'API
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Journalisation automatique des routes @AuditResource(...)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

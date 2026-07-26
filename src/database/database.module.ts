import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module global exportant PrismaService.
 *
 * Avant ce module, chaque module metier declarait PrismaService dans
 * ses propres `providers`, ce qui creait une instance - et donc un pool
 * de connexions PostgreSQL - par module au lieu d'un pool unique
 * partage. Corrige ici : DatabaseModule est importe une seule fois dans
 * AppModule, et son caractere @Global() rend PrismaService injectable
 * partout sans reimport ni redeclaration.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

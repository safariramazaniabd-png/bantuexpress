import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generate() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BantuExpress API')
    .setDescription('Plateforme numérique d\'adressage et de localisation pour la RDC et l\'Afrique de l\'Est')
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Development')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  writeFileSync('openapi.json', JSON.stringify(document, null, 2), 'utf-8');

  const logger = new Logger('GenerateOpenApi');
  logger.log('openapi.json generated successfully');

  await app.close();
}

generate().catch((error) => {
  const logger = new Logger('GenerateOpenApi');
  logger.error((error as Error).message);
  process.exit(1);
});

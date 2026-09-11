import { Controller, Get, RequestMethod } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Index')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Racine de l’API', description: 'Point d’entrée public de l’API' })
  @ApiOkResponse({ description: 'Métadonnées du service' })
  @Get()
  index() {
    return {
      service: 'BantuExpress API',
      version: '1.0',
      prefix: '/api/v1',
      health: '/health',
      documentation: '/api/docs',
    };
  }
}
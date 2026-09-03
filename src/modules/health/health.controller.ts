import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Vérifier l\'état du service', description: 'Retourne l\'état de santé de l\'API et de sa base de données.' })
  @ApiOkResponse({ description: 'Le service est opérationnel. La base de données peut être "up" ou "down".' })
  async check() {
    return this.healthService.check();
  }
}

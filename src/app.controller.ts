import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './modules/health/health.service';

@ApiTags('Index')
@Controller()
export class AppController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'État de santé', description: 'GET / sert la sonde de santé (identique à /health)' })
  @ApiOkResponse({ description: 'Pays de santé du service et de la base' })
  @Get()
  check() {
    return this.healthService.check();
  }
}

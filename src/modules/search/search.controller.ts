import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SuggestionQueryDto } from './dto/search-query.dto';

@ApiTags('Recherche')
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({ summary: 'Recherche unifiée', description: 'Recherche parmi les personnes, points de repère, adresses et entreprises. Supporte la recherche plein texte, le filtre par catégorie/ville/province et la recherche géolocalisée (lat/lng/radius).' })
  @ApiOkResponse({ description: 'Résultats de recherche paginés' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('search')
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @ApiOperation({ summary: 'Suggestions', description: 'Autocomplete pour la barre de recherche. Retourne les correspondances par préfixe (min 2 caractères).' })
  @ApiOkResponse({ description: 'Liste de suggestions (texte, type, entityId optionnel)' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('search/suggestions')
  async suggest(@Query() query: SuggestionQueryDto) {
    return this.searchService.suggest(query);
  }
}

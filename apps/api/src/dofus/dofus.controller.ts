import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { DofusService, ItemMin, RecipeMin } from './dofus.service';

@Controller('api')
export class DofusController {
  constructor(private readonly service: DofusService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('items/search')
  searchItems(@Query('q') q = '', @Query('limit') limit = '50') {
    return this.service.searchItems(q, Number(limit) || 50);
  }

  @Get('items/by-ids')
  byIds(@Query('ids') ids = '') {
    const list = ids
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    return this.service.getItemsByIds(list);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    const item = this.service.getItem(Number(id));
    if (!item) throw new NotFoundException(`Item ${id} não encontrado`);
    return item;
  }

  @Get('recipes/search')
  searchRecipes(@Query('q') q = '', @Query('limit') limit = '50') {
    return this.service.searchRecipes(q, Number(limit) || 50);
  }

  @Get('recipes')
  getRecipes() {
    return this.service.getRecipes();
  }

  @Get('recipes/ids')
  getRecipeIds() {
    return this.service.getRecipeIds();
  }

  @Get('recipes/:resultId')
  getRecipe(@Param('resultId') resultId: string) {
    const recipe = this.service.getRecipe(Number(resultId));
    if (!recipe) throw new NotFoundException(`Receita ${resultId} não encontrada`);
    return recipe;
  }

  @Get('jobs')
  getJobs() {
    return this.service.getJobs();
  }

  @Get('characteristics')
  getCharacteristics() {
    return this.service.getCharacteristics();
  }

  @Get('runes')
  getRunes() {
    return this.service.getRunes();
  }

  @Get('prices')
  getPrices() {
    return this.service.getPrices();
  }

  @Get('drops')
  getDrops() {
    return this.service.getDrops();
  }

  @Get('drops/:itemId')
  getDropsForItem(@Param('itemId') itemId: string) {
    return this.service.getDropsForItem(Number(itemId));
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArchivesService } from './archives.service';
import {
  CreateNiloTypeDto,
  UpdateNiloTypeDto,
  CreateProcessStepDto,
  UpdateProcessStepDto,
  CreateArtistDto,
  UpdateArtistDto,
} from './dto/archive.dto';

@Controller('admin/archives')
export class AdminArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get('nilo-types')
  async getAllNiloTypes() {
    return this.archivesService.findAllNiloTypes();
  }

  @Get('nilo-types/:id')
  async getNiloTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findNiloTypeById(id);
  }

  @Post('nilo-types')
  async createNiloType(@Body() dto: CreateNiloTypeDto) {
    return this.archivesService.createNiloType(dto);
  }

  @Patch('nilo-types/:id')
  async updateNiloType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNiloTypeDto,
  ) {
    return this.archivesService.updateNiloType(id, dto);
  }

  @Delete('nilo-types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNiloType(@Param('id', ParseIntPipe) id: number) {
    await this.archivesService.deleteNiloType(id);
  }

  @Patch('nilo-types/reorder')
  async reorderNiloTypes(@Body() items: { id: number; sortOrder: number }[]) {
    await this.archivesService.reorderNiloTypes(items);
  }

  @Get('process-steps')
  async getAllProcessSteps() {
    return this.archivesService.findAllProcessSteps();
  }

  @Get('process-steps/:id')
  async getProcessStepById(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findProcessStepById(id);
  }

  @Post('process-steps')
  async createProcessStep(@Body() dto: CreateProcessStepDto) {
    return this.archivesService.createProcessStep(dto);
  }

  @Patch('process-steps/:id')
  async updateProcessStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcessStepDto,
  ) {
    return this.archivesService.updateProcessStep(id, dto);
  }

  @Delete('process-steps/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProcessStep(@Param('id', ParseIntPipe) id: number) {
    await this.archivesService.deleteProcessStep(id);
  }

  @Get('artists')
  async getAllArtists() {
    return this.archivesService.findAllArtists();
  }

  @Get('artists/:id')
  async getArtistById(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findArtistById(id);
  }

  @Post('artists')
  async createArtist(@Body() dto: CreateArtistDto) {
    return this.archivesService.createArtist(dto);
  }

  @Patch('artists/:id')
  async updateArtist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArtistDto,
  ) {
    return this.archivesService.updateArtist(id, dto);
  }

  @Delete('artists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArtist(@Param('id', ParseIntPipe) id: number) {
    await this.archivesService.deleteArtist(id);
  }

  @Patch('artists/reorder')
  async reorderArtists(@Body() items: { id: number; sortOrder: number }[]) {
    await this.archivesService.reorderArtists(items);
  }
}

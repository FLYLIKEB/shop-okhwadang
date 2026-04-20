import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AttributesService } from './attributes.service';
import { CreateAttributeTypeDto, UpdateAttributeTypeDto } from './dto/attribute-type.dto';
import { CreateProductAttributeDto, UpdateProductAttributeDto, SetProductAttributesDto } from './dto/product-attribute.dto';
import { AttributeType } from './entities/attribute-type.entity';
import { ProductAttribute } from './entities/product-attribute.entity';

@ApiTags('Attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  // ─── Attribute Types ───────────────────────────────────────────────

  @Get('types')
  @Public()
  @ApiOperation({ summary: '모든 속성 유형 조회' })
  @ApiQuery({ name: 'locale', required: false, description: '言語コード (ko, en)' })
  async findAllTypes(@Query('locale') locale?: string): Promise<AttributeType[]> {
    return this.attributesService.findAllAttributeTypes(locale);
  }

  @Get('types/filterable')
  @Public()
  @ApiOperation({ summary: '필터 가능한 속성 유형만 조회' })
  @ApiQuery({ name: 'locale', required: false, description: '言語コード (ko, en)' })
  async findFilterableTypes(@Query('locale') locale?: string): Promise<AttributeType[]> {
    return this.attributesService.getFilterableAttributes(locale);
  }

  @Get('types/:id')
  @Public()
  @ApiOperation({ summary: '속성 유형 상세 조회' })
  @ApiQuery({ name: 'locale', required: false, description: '言語コード (ko, en)' })
  async findTypeById(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
  ): Promise<AttributeType> {
    return this.attributesService.findAttributeTypeById(id, locale);
  }

  @Get('types/code/:code')
  @Public()
  @ApiOperation({ summary: '속성 유형 코드로 조회' })
  @ApiQuery({ name: 'locale', required: false, description: '言語コード (ko, en)' })
  async findTypeByCode(
    @Param('code') code: string,
    @Query('locale') locale?: string,
  ): Promise<AttributeType | null> {
    return this.attributesService.findAttributeTypeByCode(code, locale);
  }

  @Get('types/:code/values')
  @Public()
  @ApiOperation({ summary: '특정 타입의 가능한 값 목록 조회' })
  async getTypeValues(@Param('code') code: string): Promise<string[]> {
    return this.attributesService.getAttributeValuesByTypeCode(code);
  }

  @Post('types')
  @ApiBearerAuth()
  @ApiOperation({ summary: '속성 유형 생성 (관리자)' })
  async createType(@Body() dto: CreateAttributeTypeDto): Promise<AttributeType> {
    return this.attributesService.createAttributeType(dto);
  }

  @Patch('types/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '속성 유형 수정 (관리자)' })
  async updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeTypeDto,
  ): Promise<AttributeType> {
    return this.attributesService.updateAttributeType(id, dto);
  }

  @Delete('types/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '속성 유형 삭제 (관리자)' })
  async deleteType(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.attributesService.deleteAttributeType(id);
  }

  // ─── Product Attributes ─────────────────────────────────────────────

  @Get('products/:productId')
  @Public()
  @ApiOperation({ summary: '상품 속성 조회' })
  async findByProductId(@Param('productId', ParseIntPipe) productId: number): Promise<ProductAttribute[]> {
    return this.attributesService.findAttributesByProductId(productId);
  }

  @Post('products')
  @ApiBearerAuth()
  @ApiOperation({ summary: '상품 속성 생성 (관리자)' })
  async create(@Body() dto: CreateProductAttributeDto): Promise<ProductAttribute> {
    return this.attributesService.createProductAttribute(dto);
  }

  @Patch('products/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '상품 속성 수정 (관리자)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductAttributeDto,
  ): Promise<ProductAttribute> {
    return this.attributesService.updateProductAttribute(id, dto);
  }

  @Delete('products/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '상품 속성 삭제 (관리자)' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.attributesService.deleteProductAttribute(id);
  }

  @Post('products/:productId/set')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '상품 속성 일괄 설정 (관리자)' })
  async setProductAttributes(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: SetProductAttributesDto,
  ): Promise<ProductAttribute[]> {
    return this.attributesService.setProductAttributes(productId, dto.attributes);
  }
}

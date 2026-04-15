import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttributeType, AttributeInputType } from './entities/attribute-type.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { CreateAttributeTypeDto, UpdateAttributeTypeDto } from './dto/attribute-type.dto';
import { CreateProductAttributeDto, UpdateProductAttributeDto } from './dto/product-attribute.dto';

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  constructor(
    @InjectRepository(AttributeType)
    private readonly attributeTypeRepository: Repository<AttributeType>,
    @InjectRepository(ProductAttribute)
    private readonly productAttributeRepository: Repository<ProductAttribute>,
  ) {}

  // ─── Attribute Types ────────────────────────────────────────────────

  async findAllAttributeTypes(): Promise<AttributeType[]> {
    return this.attributeTypeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findAttributeTypeById(id: number): Promise<AttributeType> {
    const type = await this.attributeTypeRepository.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(`AttributeType ID ${id} not found`);
    }
    return type;
  }

  async findAttributeTypeByCode(code: string): Promise<AttributeType | null> {
    return this.attributeTypeRepository.findOne({ where: { code } });
  }

  async createAttributeType(dto: CreateAttributeTypeDto): Promise<AttributeType> {
    const existing = await this.attributeTypeRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`AttributeType with code '${dto.code}' already exists`);
    }

    const type = this.attributeTypeRepository.create({
      code: dto.code,
      name: dto.name,
      nameKo: dto.nameKo ?? null,
      nameEn: dto.nameEn ?? null,
      nameJa: dto.nameJa ?? null,
      nameZh: dto.nameZh ?? null,
      inputType: dto.inputType ?? AttributeInputType.TEXT,
      isFilterable: dto.isFilterable ?? false,
      isSearchable: dto.isSearchable ?? false,
      validValues: dto.validValues ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.attributeTypeRepository.save(type);
  }

  async updateAttributeType(id: number, dto: UpdateAttributeTypeDto): Promise<AttributeType> {
    const type = await this.findAttributeTypeById(id);

    if (dto.code !== undefined && dto.code !== type.code) {
      const existing = await this.attributeTypeRepository.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`AttributeType with code '${dto.code}' already exists`);
      }
    }

    Object.assign(type, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.nameKo !== undefined && { nameKo: dto.nameKo }),
      ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
      ...(dto.nameJa !== undefined && { nameJa: dto.nameJa }),
      ...(dto.nameZh !== undefined && { nameZh: dto.nameZh }),
      ...(dto.inputType !== undefined && { inputType: dto.inputType }),
      ...(dto.isFilterable !== undefined && { isFilterable: dto.isFilterable }),
      ...(dto.isSearchable !== undefined && { isSearchable: dto.isSearchable }),
      ...(dto.validValues !== undefined && { validValues: dto.validValues }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return this.attributeTypeRepository.save(type);
  }

  async deleteAttributeType(id: number): Promise<void> {
    const type = await this.findAttributeTypeById(id);
    await this.attributeTypeRepository.remove(type);
  }

  // ─── Product Attributes ────────────────────────────────────────────

  async findAttributesByProductId(productId: number): Promise<ProductAttribute[]> {
    return this.productAttributeRepository.find({
      where: { productId },
      relations: ['attributeType'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findAttributesByProductIds(productIds: number[]): Promise<Map<number, ProductAttribute[]>> {
    if (!productIds.length) return new Map();

    const attrs = await this.productAttributeRepository
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.attributeType', 'at')
      .where('pa.product_id IN (:...productIds)', { productIds })
      .orderBy('pa.sort_order', 'ASC')
      .getMany();

    const map = new Map<number, ProductAttribute[]>();
    for (const attr of attrs) {
      const list = map.get(attr.productId) ?? [];
      list.push(attr);
      map.set(attr.productId, list);
    }
    return map;
  }

  async createProductAttribute(dto: CreateProductAttributeDto): Promise<ProductAttribute> {
    const attr = this.productAttributeRepository.create({
      productId: dto.productId,
      attributeTypeId: dto.attributeTypeId,
      value: dto.value,
      displayValue: dto.displayValue ?? dto.value,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.productAttributeRepository.save(attr);
  }

  async createOrUpdateProductAttribute(
    productId: number,
    attributeTypeId: number,
    dto: CreateProductAttributeDto,
  ): Promise<ProductAttribute> {
    const existing = await this.productAttributeRepository.findOne({
      where: { productId, attributeTypeId },
    });

    if (existing) {
      Object.assign(existing, {
        value: dto.value,
        displayValue: dto.displayValue ?? dto.value,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      });
      return this.productAttributeRepository.save(existing);
    }

    return this.createProductAttribute({ ...dto, productId });
  }

  async updateProductAttribute(id: number, dto: UpdateProductAttributeDto): Promise<ProductAttribute> {
    const attr = await this.productAttributeRepository.findOne({ where: { id } });
    if (!attr) {
      throw new NotFoundException(`ProductAttribute ID ${id} not found`);
    }

    Object.assign(attr, {
      ...(dto.value !== undefined && { value: dto.value }),
      ...(dto.displayValue !== undefined && { displayValue: dto.displayValue }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return this.productAttributeRepository.save(attr);
  }

  async deleteProductAttribute(id: number): Promise<void> {
    const attr = await this.productAttributeRepository.findOne({ where: { id } });
    if (!attr) {
      throw new NotFoundException(`ProductAttribute ID ${id} not found`);
    }
    await this.productAttributeRepository.remove(attr);
  }

  async deleteAttributesByProductId(productId: number): Promise<void> {
    await this.productAttributeRepository.delete({ productId });
  }

  async setProductAttributes(
    productId: number,
    attributes: Array<{ attributeTypeId: number; value: string; displayValue?: string; sortOrder?: number }>,
  ): Promise<ProductAttribute[]> {
    // Delete existing
    await this.deleteAttributesByProductId(productId);

    if (!attributes.length) return [];

    // Create new
    const entities = attributes.map((attr) =>
      this.productAttributeRepository.create({
        productId,
        attributeTypeId: attr.attributeTypeId,
        value: attr.value,
        displayValue: attr.displayValue ?? attr.value,
        sortOrder: attr.sortOrder ?? 0,
      }),
    );

    return this.productAttributeRepository.save(entities);
  }

  // ─── Filtering ──────────────────────────────────────────────────────

  async getFilterableAttributes(): Promise<AttributeType[]> {
    return this.attributeTypeRepository.find({
      where: { isFilterable: true, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getAttributeValuesByTypeCode(code: string): Promise<string[]> {
    const type = await this.findAttributeTypeByCode(code);
    if (!type) {
      return [];
    }
    if (type.validValues && type.validValues.length > 0) {
      return type.validValues;
    }

    // Fetch unique values from product_attributes
    const result = await this.productAttributeRepository
      .createQueryBuilder('pa')
      .innerJoin('pa.attributeType', 'at', 'at.code = :code', { code })
      .select('DISTINCT pa.value', 'value')
      .orderBy('pa.value', 'ASC')
      .getRawMany();

    return result.map((r) => r.value);
  }
}

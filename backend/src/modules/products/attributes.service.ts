import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttributeType, AttributeInputType } from './entities/attribute-type.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { Product } from './entities/product.entity';
import { AttributeValueOptionEntity } from './entities/attribute-value-option.entity';
import { CreateAttributeTypeDto, UpdateAttributeTypeDto } from './dto/attribute-type.dto';
import {
  AttributeValueOption,
  CreateProductAttributeDto,
  LinkAttributeValueProductDto,
  ManagedAttributeValueOption,
  UpdateAttributeValueOptionDto,
  UpdateProductAttributeDto,
} from './dto/product-attribute.dto';
import { applyLocale } from '../../common/utils/locale.util';

const CANONICAL_ATTRIBUTE_DISPLAY_VALUES: Record<string, Record<string, string>> = {
  clay_type: {
    junni: '주니',
    danji: '단니',
    jani: '자니',
    heugni: '흑니',
    cheongsu: '청수니',
    qinghuini: '청회니',
    qingshuini: '청수니',
    nokni: '녹니',
    hongwei_zhuni: '홍위주니',
    benshan_luni: '본산녹니',
    old_qingshuini: '노청수니',
    old_duanni: '노단니',
    tiechengzao_hongni: '철성조홍니',
    old_zini: '노자니',
    dicaoqing: '저조청',
    jiangponi: '강파니',
    yubaini: '옥백니',
    hongni: '홍니',
    wuni: '오니',
  },
  teapot_shape: {
    seoshi: '서시',
    seokpyo: '석표',
    juhu: '주형',
    bianping: '편평',
    inwang: '인왕',
    deokjong: '덕종',
    supeong: '수평',
    pinggai_lianzi: '평개연자호',
    lianzi: '연자호',
    fanggu: '방고호',
    longdan: '용단',
    banyue: '반월',
    xubian: '허편',
    hanwa: '한와호',
    tieqiu: '철구호',
    banhu: '반호',
    julunzhu: '거륜주',
    yixing: '이형호',
  },
};

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  constructor(
    @InjectRepository(AttributeType)
    private readonly attributeTypeRepository: Repository<AttributeType>,
    @InjectRepository(ProductAttribute)
    private readonly productAttributeRepository: Repository<ProductAttribute>,
    @InjectRepository(AttributeValueOptionEntity)
    private readonly attributeValueOptionRepository: Repository<AttributeValueOptionEntity>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private applyLocaleToAttributeType(entity: AttributeType, locale?: string): AttributeType {
    // ko 로케일: name 컬럼이 영문일 수 있으므로 nameKo 우선 적용
    if (!locale || locale === 'ko') {
      return entity.nameKo ? { ...entity, name: entity.nameKo } : entity;
    }
    return applyLocale(entity, locale, ['name']);
  }

  // ─── Attribute Types ────────────────────────────────────────────────

  async findAllAttributeTypes(locale?: string): Promise<AttributeType[]> {
    const types = await this.attributeTypeRepository.find({
      where: { isActive: true },
      relations: ['parent', 'children'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return types.map((t) => this.applyLocaleToAttributeType(t, locale));
  }

  async findAttributeTypeById(id: number, locale?: string): Promise<AttributeType> {
    const type = await this.attributeTypeRepository.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(`AttributeType ID ${id} not found`);
    }
    return this.applyLocaleToAttributeType(type, locale);
  }

  async findAttributeTypeByCode(code: string, locale?: string): Promise<AttributeType | null> {
    const type = await this.attributeTypeRepository.findOne({ where: { code } });
    if (!type) return null;
    return this.applyLocaleToAttributeType(type, locale);
  }

  async createAttributeType(dto: CreateAttributeTypeDto): Promise<AttributeType> {
    const existing = await this.attributeTypeRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`AttributeType with code '${dto.code}' already exists`);
    }

    await this.validateAttributeTypeLinks(null, dto.parentId, dto.relatedTypeIds);

    const type = this.attributeTypeRepository.create({
      code: dto.code,
      name: dto.name,
      nameKo: dto.nameKo ?? null,
      nameEn: dto.nameEn ?? null,
      inputType: dto.inputType ?? AttributeInputType.TEXT,
      isFilterable: dto.isFilterable ?? false,
      isSearchable: dto.isSearchable ?? false,
      validValues: dto.validValues ?? null,
      parentId: dto.parentId ?? null,
      relatedTypeIds: dto.relatedTypeIds ?? null,
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

    await this.validateAttributeTypeLinks(id, dto.parentId, dto.relatedTypeIds);

    Object.assign(type, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.nameKo !== undefined && { nameKo: dto.nameKo }),
      ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
      ...(dto.inputType !== undefined && { inputType: dto.inputType }),
      ...(dto.isFilterable !== undefined && { isFilterable: dto.isFilterable }),
      ...(dto.isSearchable !== undefined && { isSearchable: dto.isSearchable }),
      ...(dto.validValues !== undefined && { validValues: dto.validValues }),
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.relatedTypeIds !== undefined && { relatedTypeIds: dto.relatedTypeIds }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return this.attributeTypeRepository.save(type);
  }

  async deleteAttributeType(id: number): Promise<void> {
    const type = await this.findAttributeTypeById(id);
    await this.attributeTypeRepository.remove(type);
  }

  private async validateAttributeTypeLinks(
    currentId: number | null,
    parentId?: number | null,
    relatedTypeIds?: number[] | null,
  ): Promise<void> {
    if (parentId !== undefined && parentId !== null) {
      if (currentId !== null && parentId === currentId) {
        throw new BadRequestException('AttributeType cannot be its own parent');
      }

      let parent = await this.attributeTypeRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException(`Parent AttributeType ID ${parentId} not found`);
      }

      const visited = new Set<number>();
      while (parent?.parentId) {
        if (currentId !== null && parent.parentId === currentId) {
          throw new BadRequestException('AttributeType parent cycle is not allowed');
        }
        if (visited.has(parent.parentId)) {
          throw new BadRequestException('AttributeType parent cycle is not allowed');
        }
        visited.add(parent.parentId);
        parent = await this.attributeTypeRepository.findOne({ where: { id: parent.parentId } });
      }
    }

    if (relatedTypeIds !== undefined && relatedTypeIds !== null) {
      if (currentId !== null && relatedTypeIds.includes(currentId)) {
        throw new BadRequestException('AttributeType cannot relate to itself');
      }
      const uniqueIds = [...new Set(relatedTypeIds)];
      if (uniqueIds.length !== relatedTypeIds.length) {
        throw new BadRequestException('relatedTypeIds must not contain duplicates');
      }
      for (const relatedId of uniqueIds) {
        const related = await this.attributeTypeRepository.findOne({ where: { id: relatedId } });
        if (!related) {
          throw new NotFoundException(`Related AttributeType ID ${relatedId} not found`);
        }
      }
    }
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

  async updateProductAttribute(
    id: number,
    dto: UpdateProductAttributeDto,
  ): Promise<ProductAttribute> {
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
    attributes: Array<{
      attributeTypeId: number;
      value: string;
      displayValue?: string;
      sortOrder?: number;
    }>,
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

  private async findAttributeTypeByCodeOrThrow(code: string): Promise<AttributeType> {
    const type = await this.attributeTypeRepository.findOne({ where: { code } });
    if (!type) {
      throw new NotFoundException(`AttributeType code ${code} not found`);
    }
    return type;
  }

  private async getDisplayValueMap(type: AttributeType): Promise<Map<string, string | null>> {
    const rows = await this.productAttributeRepository
      .createQueryBuilder('pa')
      .select('pa.value', 'value')
      .addSelect('pa.display_value', 'displayValue')
      .where('pa.attribute_type_id = :attributeTypeId', { attributeTypeId: type.id })
      .orderBy('pa.value', 'ASC')
      .getRawMany<{ value: string; displayValue: string | null }>();

    const displayValueByValue = new Map<string, string | null>();
    for (const row of rows) {
      const displayValue = row.displayValue?.trim() || null;
      const existing = displayValueByValue.get(row.value);
      if (!existing || (displayValue && displayValue !== row.value)) {
        displayValueByValue.set(row.value, displayValue);
      }
    }
    return displayValueByValue;
  }

  private async findOrCreateValueOption(
    type: AttributeType,
    value: string,
    displayValue?: string,
  ): Promise<AttributeValueOptionEntity> {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      throw new BadRequestException('속성값은 비어 있을 수 없습니다.');
    }

    let option = await this.attributeValueOptionRepository.findOne({
      where: { attributeTypeId: type.id, value: normalizedValue },
    });

    if (!option) {
      option = this.attributeValueOptionRepository.create({
        attributeTypeId: type.id,
        value: normalizedValue,
        displayValue: displayValue?.trim() || normalizedValue,
        sortOrder: 0,
        isActive: true,
      });
    }

    return option;
  }

  // ─── Attribute Value Options ───────────────────────────────────────

  async getManagedAttributeValueOptions(code: string): Promise<ManagedAttributeValueOption[]> {
    const type = await this.findAttributeTypeByCodeOrThrow(code);
    const options = await this.attributeValueOptionRepository.find({
      where: { attributeTypeId: type.id },
      order: { sortOrder: 'ASC', value: 'ASC' },
    });
    const displayValueByValue = await this.getDisplayValueMap(type);
    const canonicalDisplayValues = CANONICAL_ATTRIBUTE_DISPLAY_VALUES[code] ?? {};
    const values = Array.from(
      new Set([
        ...(type.validValues ?? []),
        ...options.map((option) => option.value),
        ...displayValueByValue.keys(),
      ].map((value) => value.trim()).filter(Boolean)),
    );
    const optionByValue = new Map(options.map((option) => [option.value, option]));

    const productRows = await this.productAttributeRepository
      .createQueryBuilder('pa')
      .innerJoin('pa.product', 'product')
      .select('pa.value', 'value')
      .addSelect('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.slug', 'slug')
      .where('pa.attribute_type_id = :attributeTypeId', { attributeTypeId: type.id })
      .orderBy('product.name', 'ASC')
      .getRawMany<{ value: string; id: string; name: string; slug: string }>();

    const productsByValue = new Map<string, ManagedAttributeValueOption['products']>();
    for (const row of productRows) {
      const products = productsByValue.get(row.value) ?? [];
      products.push({ id: Number(row.id), name: row.name, slug: row.slug });
      productsByValue.set(row.value, products);
    }

    return values.map((value) => {
      const option = optionByValue.get(value);
      const products = productsByValue.get(value) ?? [];
      return {
        id: option?.id ?? null,
        value,
        displayValue:
          option?.displayValue ?? displayValueByValue.get(value) ?? canonicalDisplayValues[value] ?? null,
        sortOrder: option?.sortOrder ?? 999,
        isActive: option?.isActive ?? true,
        productCount: products.length,
        products,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value));
  }

  async updateAttributeValueOption(
    code: string,
    value: string,
    dto: UpdateAttributeValueOptionDto,
  ): Promise<ManagedAttributeValueOption> {
    const type = await this.findAttributeTypeByCodeOrThrow(code);
    const option = await this.findOrCreateValueOption(type, value, dto.displayValue);

    if (dto.displayValue !== undefined) {
      const displayValue = dto.displayValue.trim();
      if (!displayValue) {
        throw new BadRequestException('표시 이름은 비어 있을 수 없습니다.');
      }
      option.displayValue = displayValue;
    }
    if (dto.sortOrder !== undefined) option.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) option.isActive = dto.isActive;

    await this.attributeValueOptionRepository.save(option);

    if (dto.displayValue !== undefined) {
      await this.productAttributeRepository.update(
        { attributeTypeId: type.id, value: option.value },
        { displayValue: option.displayValue },
      );
    }

    const options = await this.getManagedAttributeValueOptions(code);
    const updated = options.find((item) => item.value === option.value);
    if (!updated) {
      throw new NotFoundException(`Attribute value ${option.value} not found`);
    }
    return updated;
  }

  async linkProductToAttributeValue(
    code: string,
    value: string,
    dto: LinkAttributeValueProductDto,
  ): Promise<ManagedAttributeValueOption> {
    const type = await this.findAttributeTypeByCodeOrThrow(code);
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Product ID ${dto.productId} not found`);
    }

    const option = await this.findOrCreateValueOption(type, value);
    await this.attributeValueOptionRepository.save(option);

    const existing = await this.productAttributeRepository.findOne({
      where: { productId: dto.productId, attributeTypeId: type.id },
    });

    if (existing) {
      Object.assign(existing, {
        value: option.value,
        displayValue: option.displayValue,
      });
      await this.productAttributeRepository.save(existing);
    } else {
      await this.productAttributeRepository.save(
        this.productAttributeRepository.create({
          productId: dto.productId,
          attributeTypeId: type.id,
          value: option.value,
          displayValue: option.displayValue,
          sortOrder: 0,
        }),
      );
    }

    const options = await this.getManagedAttributeValueOptions(code);
    const updated = options.find((item) => item.value === option.value);
    if (!updated) {
      throw new NotFoundException(`Attribute value ${option.value} not found`);
    }
    return updated;
  }

  async unlinkProductFromAttributeValue(
    code: string,
    value: string,
    productId: number,
  ): Promise<ManagedAttributeValueOption> {
    const type = await this.findAttributeTypeByCodeOrThrow(code);
    await this.productAttributeRepository.delete({
      productId,
      attributeTypeId: type.id,
      value,
    });
    const options = await this.getManagedAttributeValueOptions(code);
    const updated = options.find((item) => item.value === value);
    if (!updated) {
      throw new NotFoundException(`Attribute value ${value} not found`);
    }
    return updated;
  }

  // ─── Filtering ──────────────────────────────────────────────────────

  async getFilterableAttributes(locale?: string): Promise<AttributeType[]> {
    const types = await this.attributeTypeRepository.find({
      where: { isFilterable: true, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return types.map((t) => this.applyLocaleToAttributeType(t, locale));
  }

  async getAttributeValuesByTypeCode(code: string): Promise<AttributeValueOption[]> {
    const type = await this.findAttributeTypeByCode(code);
    if (!type) {
      return [];
    }

    const displayValueByValue = await this.getDisplayValueMap(type);
    const options = await this.attributeValueOptionRepository.find({
      where: { attributeTypeId: type.id, isActive: true },
      order: { sortOrder: 'ASC', value: 'ASC' },
    });
    const optionByValue = new Map(options.map((option) => [option.value, option.displayValue]));
    const values = [...(type.validValues ?? []), ...options.map((option) => option.value), ...displayValueByValue.keys()];

    const canonicalDisplayValues = CANONICAL_ATTRIBUTE_DISPLAY_VALUES[code] ?? {};

    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).map(
      (value) => ({
        value,
        displayValue:
          optionByValue.get(value) ?? displayValueByValue.get(value) ?? canonicalDisplayValues[value] ?? null,
      }),
    );
  }
}

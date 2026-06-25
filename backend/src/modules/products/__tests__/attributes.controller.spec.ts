import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AttributesController } from '../attributes.controller';
import { AttributesService } from '../attributes.service';

interface TestRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: number; role: string };
}

class HeaderRoleAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const testRequest = context.switchToHttp().getRequest<TestRequest>();
    const roleHeader = testRequest.headers['x-test-role'];
    const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
    testRequest.user = { id: 1, role: role ?? 'user' };
    return true;
  }
}

describe('AttributesController RBAC', () => {
  let app: INestApplication;

  const attributesService = {
    findAllAttributeTypes: jest.fn().mockResolvedValue([]),
    getFilterableAttributes: jest.fn().mockResolvedValue([]),
    findAttributeTypeById: jest.fn().mockResolvedValue({ id: 1, code: 'clay' }),
    findAttributeTypeByCode: jest.fn().mockResolvedValue({ id: 1, code: 'clay' }),
    getAttributeValuesByTypeCode: jest.fn().mockResolvedValue([]),
    createAttributeType: jest.fn().mockResolvedValue({ id: 1, code: 'clay' }),
    updateAttributeType: jest.fn().mockResolvedValue({ id: 1, code: 'clay', name: 'updated' }),
    deleteAttributeType: jest.fn().mockResolvedValue(undefined),
    findAttributesByProductId: jest.fn().mockResolvedValue([]),
    createProductAttribute: jest.fn().mockResolvedValue({ id: 1, productId: 1, attributeTypeId: 1, value: 'zhuni' }),
    updateProductAttribute: jest.fn().mockResolvedValue({ id: 1, value: 'duanni' }),
    deleteProductAttribute: jest.fn().mockResolvedValue(undefined),
    setProductAttributes: jest.fn().mockResolvedValue([{ id: 1, productId: 1, attributeTypeId: 1, value: 'zhuni' }]),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttributesController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: AttributesService, useValue: attributesService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(new HeaderRoleAuthGuard(), module.get(RolesGuard));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const mutationRequests = [
    {
      label: 'POST /api/attributes/types',
      send: () => request(app.getHttpServer()).post('/api/attributes/types').send({ code: 'clay', name: '니료' }),
      successStatus: 201,
    },
    {
      label: 'PATCH /api/attributes/types/:id',
      send: () => request(app.getHttpServer()).patch('/api/attributes/types/1').send({ name: '수정' }),
      successStatus: 200,
    },
    {
      label: 'DELETE /api/attributes/types/:id',
      send: () => request(app.getHttpServer()).delete('/api/attributes/types/1'),
      successStatus: 204,
    },
    {
      label: 'POST /api/attributes/products',
      send: () => request(app.getHttpServer()).post('/api/attributes/products').send({ productId: 1, attributeTypeId: 1, value: 'zhuni' }),
      successStatus: 201,
    },
    {
      label: 'PATCH /api/attributes/products/:id',
      send: () => request(app.getHttpServer()).patch('/api/attributes/products/1').send({ value: 'duanni' }),
      successStatus: 200,
    },
    {
      label: 'DELETE /api/attributes/products/:id',
      send: () => request(app.getHttpServer()).delete('/api/attributes/products/1'),
      successStatus: 204,
    },
    {
      label: 'POST /api/attributes/products/:productId/set',
      send: () => request(app.getHttpServer()).post('/api/attributes/products/1/set').send({ attributes: [{ attributeTypeId: 1, value: 'zhuni' }] }),
      successStatus: 200,
    },
  ];

  describe('ordinary authenticated user', () => {
    it.each(mutationRequests)('$label -> 403', async ({ send }) => {
      await send().set('x-test-role', 'user').expect(403);
    });
  });

  describe.each(['admin', 'super_admin'])('%s user', (role) => {
    it.each(mutationRequests)('$label -> success', async ({ send, successStatus }) => {
      await send().set('x-test-role', role).expect(successStatus);
    });
  });
});

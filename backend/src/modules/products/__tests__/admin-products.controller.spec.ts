import { AdminProductsController } from '../admin-products.controller';
import { ProductStatus } from '../entities/product.entity';
import { ProductsService } from '../products.service';

describe('AdminProductsController', () => {
  it('관리자 목록 조회는 status 필터를 관리자 권한으로 전달한다', async () => {
    const productsService = {
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    };
    const controller = new AdminProductsController(productsService as unknown as ProductsService);

    await controller.findAll({ status: 'draft', page: 2, limit: 20 });

    expect(productsService.findAll).toHaveBeenCalledWith(
      { status: 'draft', page: 2, limit: 20 },
      true,
    );
  });

  it.each([ProductStatus.DRAFT, ProductStatus.HIDDEN])(
    '관리자 상세 조회는 %s 상품을 관리자 권한으로 조회한다',
    async (status) => {
      const product = { id: 10, name: '비공개 상품', status };
      const productsService = {
        findOne: jest.fn().mockResolvedValue(product),
      };
      const controller = new AdminProductsController(productsService as unknown as ProductsService);

      await expect(controller.findOne(10, undefined)).resolves.toBe(product);

      expect(productsService.findOne).toHaveBeenCalledWith(10, true, undefined);
    },
  );

  it('관리자 상세 조회는 locale 파라미터를 전달한다', async () => {
    const productsService = {
      findOne: jest.fn().mockResolvedValue({ id: 11, name: 'Localized' }),
    };
    const controller = new AdminProductsController(productsService as unknown as ProductsService);

    await controller.findOne(11, 'en');

    expect(productsService.findOne).toHaveBeenCalledWith(11, true, 'en');
  });
});

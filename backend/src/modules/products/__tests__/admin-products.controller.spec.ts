import { AdminProductsController } from '../admin-products.controller';
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
});

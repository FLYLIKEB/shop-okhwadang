import { Test, TestingModule } from '@nestjs/testing';
import { ShippingFeeCalculatorService } from '../services/shipping-fee-calculator.service';
import { SettingsService } from '../../settings/settings.service';

describe('ShippingFeeCalculatorService', () => {
  let service: ShippingFeeCalculatorService;

  const mockSettingsService = {
    getNumber: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSettingsService.getNumber.mockImplementation((key: string, defaultValue: number) => {
      if (key === 'free_shipping_threshold') return Promise.resolve(50000);
      if (key === 'shipping_base_fee') return Promise.resolve(3000);
      if (key === 'remote_area_surcharge') return Promise.resolve(4000);
      return Promise.resolve(defaultValue);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingFeeCalculatorService,
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<ShippingFeeCalculatorService>(ShippingFeeCalculatorService);
  });

  it('free shipping threshold 미만이면 기본 배송비를 부과한다', async () => {
    const result = await service.calculate(30000, '04524');

    expect(result.shippingFee).toBe(3000);
    expect(result.isFreeShipping).toBe(false);
    expect(result.isRemoteArea).toBe(false);
  });

  it('제주(63 prefix) 우편번호는 도서산간 추가비를 부과한다', async () => {
    const result = await service.calculate(30000, '63124');

    expect(result.shippingFee).toBe(7000);
    expect(result.isRemoteArea).toBe(true);
  });

  it('무료배송 임계 이상이면 기본 배송비를 0으로 처리한다', async () => {
    const result = await service.calculate(50000, '04524');

    expect(result.shippingFee).toBe(0);
    expect(result.isFreeShipping).toBe(true);
  });
});

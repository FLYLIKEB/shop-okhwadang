import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from '../dto/create-order.dto';

const validPayload = {
  items: [{ productId: 1, productOptionId: null, quantity: 1 }],
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  zipcode: '12345',
  address: '서울특별시 강남구',
  orderLocale: 'en',
};

describe('CreateOrderDto', () => {
  it('allows checkout marketingConsent under whitelist validation', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validPayload,
      marketingConsent: true,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.marketingConsent).toBe(true);
  });

  it('accepts orderLocale under whitelist validation', async () => {
    const dto = plainToInstance(CreateOrderDto, validPayload);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.orderLocale).toBe('en');
  });

  it('still rejects unknown checkout payload fields', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validPayload,
      unknownConsent: true,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'unknownConsent' }),
      ]),
    );
  });
});

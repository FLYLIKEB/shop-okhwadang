import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationDispatchHelper } from '../notification-dispatch.helper';

describe('NotificationDispatchHelper', () => {
  let helper: NotificationDispatchHelper;
  const findOne = jest.fn();
  const logger: Pick<Logger, 'warn'> = { warn: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    } as unknown as DataSource;
    helper = new NotificationDispatchHelper(dataSource);
  });

  it('await 모드에서 user 조회 후 알림을 발송한다', async () => {
    findOne.mockResolvedValue({ id: 10, email: 'user@test.com', name: '홍길동' });
    const send = jest.fn().mockResolvedValue(undefined);

    await helper.dispatch({
      event: 'order.confirmed',
      userId: 10,
      resourceId: 42,
      mode: 'await',
      logger,
      send,
    });

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { id: true, email: true, name: true },
    });
    expect(send).toHaveBeenCalledWith({ id: 10, email: 'user@test.com', name: '홍길동' });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('email 없는 user는 발송을 건너뛴다', async () => {
    findOne.mockResolvedValue({ id: 10, email: '', name: '홍길동' });
    const send = jest.fn();

    await helper.dispatch({
      event: 'order.confirmed',
      userId: 10,
      resourceId: 42,
      mode: 'await',
      logger,
      send,
    });

    expect(send).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('user 조회 실패 시 공통 필드(event,userId,resourceId)로 warn 로그를 남긴다', async () => {
    findOne.mockRejectedValue(new Error('db failed'));

    await helper.dispatch({
      event: 'order.confirmed',
      userId: 10,
      resourceId: 42,
      mode: 'await',
      logger,
      send: jest.fn(),
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=order.confirmed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('userId=10'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('resourceId=42'));
  });

  it('fire-and-forget 모드에서 발송 실패 시 공통 필드로 warn 로그를 남긴다', async () => {
    findOne.mockResolvedValue({ id: 10, email: 'user@test.com', name: '홍길동' });
    const send = jest.fn().mockRejectedValue(new Error('smtp failed'));

    await helper.dispatch({
      event: 'payment.confirmed',
      userId: 10,
      resourceId: 99,
      mode: 'fire-and-forget',
      logger,
      send,
    });

    await Promise.resolve();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=payment.confirmed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('userId=10'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('resourceId=99'));
  });
});

import { OrderEventEmitter } from '../order-event.emitter';
import { OrderCompletedEvent } from '../events/order-completed.event';

describe('OrderEventEmitter', () => {
  const event = new OrderCompletedEvent(1, 2, 'ORD-2', true, 'member', 'effect-2');

  it('awaits async handlers and propagates failures', async () => {
    const emitter = new OrderEventEmitter();
    const completed = jest.fn();
    emitter.onOrderCompleted(async () => {
      await Promise.resolve();
      completed();
    });
    emitter.onOrderCompleted(async () => {
      throw new Error('coupon failed');
    });

    await expect(emitter.emitOrderCompleted(event)).rejects.toThrow('coupon failed');
    expect(completed).toHaveBeenCalledTimes(1);
  });
});

export class OrderCompletedEvent {
  constructor(
    public readonly userId: number | null,
    public readonly orderId: number,
    public readonly orderNumber: string,
    public readonly isFirstPurchase: boolean,
    public readonly customerType: 'member' | 'guest',
  ) {}
}

export const ORDER_COMPLETED_EVENT = 'order.completed';

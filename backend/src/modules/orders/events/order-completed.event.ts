export class OrderCompletedEvent {
  constructor(
    public readonly userId: number,
    public readonly orderId: number,
    public readonly orderNumber: string,
    public readonly isFirstPurchase: boolean,
  ) {}
}

export const ORDER_COMPLETED_EVENT = 'order.completed';

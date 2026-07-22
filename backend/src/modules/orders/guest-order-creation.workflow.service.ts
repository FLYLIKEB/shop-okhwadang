import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  OrderCreationWorkflowService,
  OrderLocale,
  OrderPostCommitPayload,
} from './order-creation.workflow.service';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';

export interface GuestOrderPostCommitPayload extends OrderPostCommitPayload {
  guestEmailNormalized: string;
  orderLocale: OrderLocale;
}

@Injectable()
export class GuestOrderCreationWorkflowService {
  constructor(
    private readonly orderCreationWorkflow: OrderCreationWorkflowService,
  ) {}

  assertCreatePayload(dto: CreateGuestOrderDto): void {
    this.orderCreationWorkflow.assertCreatePayload(dto);
  }

  async runCreateOrderTransaction(
    manager: EntityManager,
    dto: CreateGuestOrderDto,
  ): Promise<GuestOrderPostCommitPayload> {
    const { orderItems, subtotalAmount, shippingItemPolicies } = await this.orderCreationWorkflow.validateAndReserveStock(
      manager,
      dto,
    );

    const shippingFee = await this.orderCreationWorkflow.calculateShippingFee(
      subtotalAmount,
      dto.zipcode,
      shippingItemPolicies,
    );
    const totalPayable = subtotalAmount + shippingFee;
    const guestEmailNormalized = this.normalizeGuestEmail(dto.guestEmail);

    const savedOrder = await this.orderCreationWorkflow.saveOrder(manager, {
      userId: null,
      totalAmount: totalPayable,
      discountAmount: 0,
      shippingFee,
      pointsUsed: 0,
      guestEmailNormalized,
      orderLocale: dto.orderLocale,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      zipcode: dto.zipcode,
      address: dto.address,
      addressDetail: dto.addressDetail ?? null,
      memo: dto.memo ?? null,
    });

    await this.orderCreationWorkflow.savePolicyConsent(manager, null, savedOrder, dto);
    await this.orderCreationWorkflow.saveOrderItems(manager, orderItems, Number(savedOrder.id));

    return {
      savedOrder,
      totalPayable,
      recipientName: dto.recipientName,
      guestEmailNormalized,
      orderLocale: dto.orderLocale,
    };
  }

  private normalizeGuestEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CheckoutPricingAuthorityInput,
  CheckoutPricingPreviewResult,
  OrderCreationWorkflowService,
} from '../orders/order-creation.workflow.service';

@Injectable()
export class CheckoutPricingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly orderCreationWorkflow: OrderCreationWorkflowService,
  ) {}

  async preview(
    userId: number | null,
    input: CheckoutPricingAuthorityInput,
  ): Promise<CheckoutPricingPreviewResult> {
    this.orderCreationWorkflow.assertCreatePayload(input);

    return this.dataSource.transaction((manager) =>
      this.orderCreationWorkflow.previewPricing(manager, userId, input),
    );
  }
}

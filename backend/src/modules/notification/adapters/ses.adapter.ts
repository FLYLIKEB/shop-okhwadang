import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailProvider, EmailSendResult } from '../interfaces/email-provider.interface';

/**
 * AWS SES stub adapter.
 *
 * Skeleton only — wire up `@aws-sdk/client-ses` when SES is selected in production.
 * Kept as a stub to avoid adding a dependency until the provider is actually chosen.
 */
@Injectable()
export class SesEmailAdapter implements EmailProvider {
  private readonly logger = new Logger(SesEmailAdapter.name);

  constructor() {
    this.logger.warn(
      'SesEmailAdapter is a stub. Install @aws-sdk/client-ses and implement send() before use.',
    );
  }

  async send(_message: EmailMessage): Promise<EmailSendResult> {
    throw new Error('SesEmailAdapter is not implemented. Configure Resend or provide an SES implementation.');
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type NotificationDispatchMode = 'await' | 'fire-and-forget';

export interface NotificationDispatchRecipient {
  id?: number;
  email: string;
  name: string;
}

type NotificationDispatchTarget =
  | { userId: number; recipient?: never }
  | { userId?: never; recipient: NotificationDispatchRecipient };

interface NotificationDispatchParams {
  event: string;
  resourceId: number | string;
  mode: NotificationDispatchMode;
  logger: Pick<Logger, 'warn'>;
  send: (recipient: NotificationDispatchRecipient) => Promise<void>;
  propagateFailure?: boolean;
}

type NotificationDispatchRequest = NotificationDispatchParams & NotificationDispatchTarget;

@Injectable()
export class NotificationDispatchHelper {
  constructor(private readonly dataSource: DataSource) {}

  async dispatch(params: NotificationDispatchRequest): Promise<void> {
    const {
      event,
      resourceId,
      mode,
      logger,
      send,
    } = params;

    const failureTarget = this.getFailureTarget(params);

    try {
      const recipient = await this.resolveRecipient(params);
      if (!recipient?.email) {
        return;
      }

      const sendTask = send(recipient);

      if (mode === 'await') {
        await sendTask;
        return;
      }

      void sendTask.catch((err) => {
        logger.warn(this.buildFailureMessage(event, failureTarget, resourceId, err));
      });
    } catch (err) {
      logger.warn(this.buildFailureMessage(event, failureTarget, resourceId, err));
      if (params.propagateFailure) throw err;
    }
  }

  private getFailureTarget(params: NotificationDispatchRequest): string {
    const userId = this.getUserTargetId(params);
    if (userId !== null) {
      return `userId=${userId}`;
    }

    return params.recipient?.email
      ? `recipientEmail=${params.recipient.email}`
      : 'recipient=unresolved';
  }

  private resolveRecipient(params: NotificationDispatchRequest): Promise<NotificationDispatchRecipient | null> {
    const userId = this.getUserTargetId(params);
    if (userId !== null) {
      return this.resolveUserRecipient(userId);
    }

    return Promise.resolve(params.recipient ?? null);
  }

  private getUserTargetId(params: NotificationDispatchRequest): number | null {
    const userId = (params as { userId?: unknown }).userId;
    if (typeof userId === 'number' && Number.isFinite(userId)) {
      return userId;
    }
    if (typeof userId === 'string' && /^\d+$/.test(userId)) {
      return Number(userId);
    }
    return null;
  }

  private async resolveUserRecipient(userId: number): Promise<NotificationDispatchRecipient | null> {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user?.email) {
      return null;
    }

    return {
      id: Number(user.id),
      email: user.email,
      name: user.name,
    };
  }

  private buildFailureMessage(
    event: string,
    target: string,
    resourceId: number | string,
    err: unknown,
  ): string {
    return `[notification-dispatch] failed event=${event} ${target} resourceId=${resourceId} error=${String(err)}`;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type NotificationDispatchMode = 'await' | 'fire-and-forget';

export interface NotificationDispatchRecipient {
  id: number;
  email: string;
  name: string;
}

interface NotificationDispatchParams {
  event: string;
  userId: number;
  resourceId: number | string;
  mode: NotificationDispatchMode;
  logger: Pick<Logger, 'warn'>;
  send: (recipient: NotificationDispatchRecipient) => Promise<void>;
}

@Injectable()
export class NotificationDispatchHelper {
  constructor(private readonly dataSource: DataSource) {}

  async dispatch(params: NotificationDispatchParams): Promise<void> {
    const {
      event,
      userId,
      resourceId,
      mode,
      logger,
      send,
    } = params;

    try {
      const userRepository = this.dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user?.email) {
        return;
      }

      const recipient: NotificationDispatchRecipient = {
        id: Number(user.id),
        email: user.email,
        name: user.name,
      };

      const sendTask = send(recipient);

      if (mode === 'await') {
        await sendTask;
        return;
      }

      void sendTask.catch((err) => {
        logger.warn(this.buildFailureMessage(event, userId, resourceId, err));
      });
    } catch (err) {
      logger.warn(this.buildFailureMessage(event, userId, resourceId, err));
    }
  }

  private buildFailureMessage(
    event: string,
    userId: number,
    resourceId: number | string,
    err: unknown,
  ): string {
    return `[notification-dispatch] failed event=${event} userId=${userId} resourceId=${resourceId} error=${String(err)}`;
  }
}

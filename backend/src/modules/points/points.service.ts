import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointHistory } from '../coupons/entities/point-history.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
  ) {}

  async getUserPointBalance(userId: number): Promise<number> {
    const latest = await this.pointHistoryRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return latest ? latest.balance : 0;
  }
}

import { Injectable } from '@nestjs/common';

export interface DashboardStats {
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  totalRevenue: number;
}

@Injectable()
export class AdminService {
  getDashboardStats(): DashboardStats {
    return {
      totalOrders: 0,
      totalUsers: 0,
      totalProducts: 0,
      totalRevenue: 0,
    };
  }
}

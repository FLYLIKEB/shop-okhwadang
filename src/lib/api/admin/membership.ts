import { apiClient } from '../core';

export interface AdminMembershipTier {
  id: number;
  name: string;
  minAmount: number;
  pointRate: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type RawMembershipTier = Omit<AdminMembershipTier, 'minAmount' | 'pointRate'> & {
  minAmount: number | string;
  pointRate: number | string;
};

function toMembershipTier(tier: RawMembershipTier): AdminMembershipTier {
  return {
    ...tier,
    minAmount: Number(tier.minAmount),
    pointRate: Number(tier.pointRate),
  };
}

export const adminMembershipApi = {
  getTiers: async (): Promise<AdminMembershipTier[]> => {
    const tiers = await apiClient.get<RawMembershipTier[]>('/admin/membership-tiers');
    return tiers.map(toMembershipTier);
  },
};

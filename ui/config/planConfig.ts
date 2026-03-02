export type PlanType = 'free' | 'pro' | 'premium';

export interface PlanLimits {
  properties: number;
  tenants: number;
  rooms: number;
  staff: number;
}

export interface PlanConfig {
  currentPlan: PlanType;
  limits: PlanLimits;
  usage: {
    properties: number;
    tenants: number;
    rooms: number;
    staff: number;
  };
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    properties: 2,
    tenants: 20,
    rooms: 30,
    staff: 4,
  },
  pro: {
    properties: 10,
    tenants: 100,
    rooms: 30,
    staff: 8,
  },
  premium: {
    properties: 999,
    tenants: 999,
    rooms: 30,
    staff: 15,
  },
};

export const planConfig: PlanConfig = {
  currentPlan: 'free',
  limits: PLAN_LIMITS.free,
  usage: {
    properties: 8,
    tenants: 142,
    rooms: 15,
    staff: 0,
  },
};

export const isLimitReached = (type: 'properties' | 'tenants' | 'rooms' | 'staff'): boolean => {
  return planConfig.usage[type] >= planConfig.limits[type];
};

export const getUsagePercentage = (type: 'properties' | 'tenants' | 'rooms'): number => {
  const limit = planConfig.limits[type];
  if (limit === 999) return 10;
  return Math.min((planConfig.usage[type] / limit) * 100, 100);
};

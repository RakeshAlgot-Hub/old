export type PlanType = 'free' | 'pro' | 'premium';

export interface PlanLimits {
  properties: number;
  tenants: number;
  rooms: number;
}

export interface PlanConfig {
  currentPlan: PlanType;
  limits: PlanLimits;
  usage: {
    properties: number;
    tenants: number;
    rooms: number;
  };
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    properties: 2,
    tenants: 20,
    rooms: 30,
  },
  pro: {
    properties: 10,
    tenants: 100,
    rooms: 30,
  },
  premium: {
    properties: 999,
    tenants: 999,
    rooms: 30,
  },
};

export const planConfig: PlanConfig = {
  currentPlan: 'free',
  limits: PLAN_LIMITS.free,
  usage: {
    properties: 8,
    tenants: 142,
    rooms: 15,
  },
};

export const isLimitReached = (type: 'properties' | 'tenants' | 'rooms'): boolean => {
  return planConfig.usage[type] >= planConfig.limits[type];
};

export const getUsagePercentage = (type: 'properties' | 'tenants' | 'rooms'): number => {
  const limit = planConfig.limits[type];
  if (limit === 999) return 10;
  return Math.min((planConfig.usage[type] / limit) * 100, 100);
};

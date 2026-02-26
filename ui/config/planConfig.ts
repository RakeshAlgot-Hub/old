export type PlanType = 'free' | 'pro' | 'premium';

export interface PlanLimits {
  properties: number;
  tenants: number;
  smsCredits: number;
}

export interface PlanConfig {
  currentPlan: PlanType;
  limits: PlanLimits;
  usage: {
    properties: number;
    tenants: number;
    smsCredits: number;
  };
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    properties: 2,
    tenants: 20,
    smsCredits: 50,
  },
  pro: {
    properties: 10,
    tenants: 100,
    smsCredits: 500,
  },
  premium: {
    properties: 999,
    tenants: 999,
    smsCredits: 999,
  },
};

export const planConfig: PlanConfig = {
  currentPlan: 'free',
  limits: PLAN_LIMITS.free,
  usage: {
    properties: 8,
    tenants: 142,
    smsCredits: 35,
  },
};

export const isLimitReached = (type: 'properties' | 'tenants' | 'smsCredits'): boolean => {
  return planConfig.usage[type] >= planConfig.limits[type];
};

export const getUsagePercentage = (type: 'properties' | 'tenants' | 'smsCredits'): number => {
  const limit = planConfig.limits[type];
  if (limit === 999) return 10;
  return Math.min((planConfig.usage[type] / limit) * 100, 100);
};

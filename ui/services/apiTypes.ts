export interface Owner {
  id: string;
  email: string;
  name: string;
  phone: string;
  location: string;
  createdAt: string;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyStats {
  propertyId: string;
  totalBeds: number;
  occupiedBeds: number;
  occupancy: number;
}

export interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  bed: string;
  rent: string;
  status: 'paid' | 'due' | 'overdue';
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  tenantName: string;
  property: string;
  bed: string;
  amount: string;
  status: 'paid' | 'due' | 'overdue';
  date: string | null;
  dueDate: string;
  method: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'inactive' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface Usage {
  ownerId: string;
  properties: number;
  tenants: number;
  smsCredits: number;
  updatedAt: string;
}

export interface PlanLimits {
  properties: number;
  tenants: number;
  smsCredits: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Owner;
  tokens: AuthTokens;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  message: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ResendOTPResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

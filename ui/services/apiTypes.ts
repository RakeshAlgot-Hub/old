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

export type BillingFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface BillingConfig {
  status: 'paid' | 'due' | 'overdue';
  billingCycle: 'monthly' | 'day-wise';
  anchorDate: string;
  method?: string;
}

export interface Tenant {
  id: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  name: string;
  documentId: string;
  phone: string;
  rent: string;
  joinDate: string;
  billingConfig?: BillingConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  // property field removed
  bed: string;
  amount: string;
  status: 'paid' | 'due' | 'overdue';
  dueDate?: string; // received from backend, optional
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
  documentId: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  documentId: string;
}

export interface VerifyOTPRequest {
  documentId: string;
  otp: string;
}

export interface VerifyOTPResponse {
  message: string;
}

export interface ResendOTPRequest {
  documentId: string;
}

export interface ResendOTPResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  documentId: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  documentId: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  floor: string;
  price: number;
  numberOfBeds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bed {
  id: string;
  propertyId: string;
  roomId: string;
  bedNumber: string;
  status: 'available' | 'occupied' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayCheckoutSession {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentRequest {
  payment_id: string;
  order_id: string;
  signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  subscription: Subscription;
}

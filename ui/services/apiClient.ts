import {
  Owner,
  Property,
  Tenant,
  Payment,
  Subscription,
  Usage,
  PlanLimits,
  Room,
  Bed,
  Staff,
  ApiResponse,
  PaginatedResponse,
  LoginCredentials,
  LoginResponse,
  GoogleSignInRequest,
  GoogleAuthResponse,
  EmailSendOTPRequest,
  EmailSendOTPResponse,
  EmailVerifyOTPRequest,
  EmailVerifyOTPResponse,
  RegisterCredentials,
  RegisterResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  ResendOTPRequest,
  ResendOTPResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ApiError,
  RazorpayCheckoutSession,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  DashboardStats,
  QuotaWarningsResponse,
  ArchivedResourcesResponse,
  PlanMetadata,
} from './apiTypes';
import { encryptedTokenStorage } from './encryptedTokenStorage';
import { dataCache } from './dataCache';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  endpoint: string;
  body?: any;
  requiresAuth?: boolean;
}

// Request deduplication cache to prevent duplicate in-flight requests
const inFlightRequests = new Map<string, Promise<any>>();

function getRequestKey(method: HttpMethod, endpoint: string, body?: any): string {
  // Only deduplicate GET/read requests, not mutations
  if (method !== 'GET') {
    return '';
  }
  return `${method}:${endpoint}`;
}

function getCacheKey(method: HttpMethod, endpoint: string): string {
  // Only cache GET requests
  if (method !== 'GET') {
    return '';
  }
  return `api:${endpoint}`;
}

async function refreshAccessToken() {
  const refreshToken = await encryptedTokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or user is deleted - clear tokens
        await encryptedTokenStorage.clearTokens();
      }
      return null;
    }
    
    const responseData = await response.json();
    const data = responseData?.data;
    
    if (data?.tokens?.accessToken && data?.tokens?.refreshToken && data?.tokens?.expiresAt) {
      await encryptedTokenStorage.setAccessToken(data.tokens.accessToken);
      await encryptedTokenStorage.setRefreshToken(data.tokens.refreshToken);
      await encryptedTokenStorage.setTokenExpiry(data.tokens.expiresAt);
      return {
        accessToken: data.tokens.accessToken,
        user: data.user || null,
      };
    }
    return null;
  } catch (error: any) {
    // On network error, don't clear tokens - user might be offline
    return null;
  }
}

async function request<T>(
  method: HttpMethod,
  endpoint: string,
  body?: any,
  requiresAuth: boolean = false
): Promise<ApiResponse<T> | PaginatedResponse<T>> {
  // Check for duplicate request (deduplication)
  const requestKey = getRequestKey(method, endpoint, body);
  if (requestKey && inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey)!;
  }

  const requestPromise = _performRequest<T>(method, endpoint, body, requiresAuth);

  // Store in-flight request
  if (requestKey) {
    inFlightRequests.set(requestKey, requestPromise);
  }

  // Remove from cache once complete
  return requestPromise.finally(() => {
    if (requestKey) {
      inFlightRequests.delete(requestKey);
    }
  });
}

async function _performRequest<T>(
  method: HttpMethod,
  endpoint: string,
  body?: any,
  requiresAuth: boolean = false
): Promise<ApiResponse<T> | PaginatedResponse<T>> {
  let triedRefresh = false;
  const cacheKey = getCacheKey(method, endpoint);

  while (true) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (requiresAuth) {
        const token = await encryptedTokenStorage.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      const config: RequestInit = {
        method,
        headers,
      };
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(body);
      }
      const response = await fetch(url, config);
      let responseData: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      if (!response.ok) {
        if (response.status === 401 && requiresAuth && !triedRefresh) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            triedRefresh = true;
            continue; // retry with new token
          }
        }
        if (response.status === 401) {
          const error: ApiError = {
            code: 'UNAUTHORIZED',
            message: responseData?.detail || 'Authentication required. Please login again.',
            details: { status: 401 },
          };
          throw error;
        }
        if (response.status === 403) {
          const error: ApiError = {
            code: responseData?.code || 'FORBIDDEN',
            message: responseData?.detail || responseData?.message || 'Access denied',
            details: responseData?.details || { status: 403 },
          };
          throw error;
        }
        if (response.status === 429) {
          const error: ApiError = {
            code: 'TOO_MANY_REQUESTS',
            message: responseData?.detail || responseData?.message || 'Too many attempts. Please try again later.',
            details: { status: 429 },
          };
          throw error;
        }
        if (response.status === 402) {
          const error: ApiError = {
            code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
            message: responseData?.detail || responseData?.message || 'You have reached your plan limit. Please upgrade to continue.',
            details: { status: 402, ...responseData?.details },
          };
          throw error;
        }
        const error: ApiError = {
          code: responseData?.code || 'API_ERROR',
          message: responseData?.detail || responseData?.message || `HTTP ${response.status}: ${response.statusText}`,
          details: responseData?.details || { status: response.status },
        };
        throw error;
      }
      let result: ApiResponse<T> | PaginatedResponse<T>;
      if (typeof responseData === 'string') {
        result = {
          data: responseData as T,
          meta: {
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse<T>;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        result = {
          data: responseData.data,
          meta: responseData.meta || {
            total: responseData.data.length,
            page: 1,
            pageSize: responseData.data.length,
            hasMore: false,
          },
        } as PaginatedResponse<T>;
      } else if (responseData.data) {
        result = {
          data: responseData.data,
          meta: responseData.meta || {
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse<T>;
      } else {
        result = {
          data: responseData,
          meta: {
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse<T>;
      }

      // Cache successful GET responses
      if (cacheKey) {
        await dataCache.set(cacheKey, result);
      }

      return result;
    } catch (error: any) {
      // If it's a known API error (not network), rethrow it
      if (error.code && error.message) {
        throw error;
      }

      // Network error - try to return cached data
      if (cacheKey) {
        const cachedData = await dataCache.get<ApiResponse<T> | PaginatedResponse<T>>(cacheKey);
        if (cachedData) {
          console.warn(`Using cached data for ${endpoint} due to network error`);
          return cachedData;
        }
      }

      // No cache available - throw network error
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network request failed',
        details: { originalError: error },
      };
      throw apiError;
    }
  }
}

export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<LoginResponse>> {
    return await request<LoginResponse>('POST', '/auth/login', credentials, false) as ApiResponse<LoginResponse>;
  },

  async refreshToken(refreshToken: string): Promise<any> {
    return await request<any>('POST', '/auth/refresh', { refreshToken }, false);
  },

  async googleSignIn(payload: GoogleSignInRequest): Promise<ApiResponse<GoogleAuthResponse>> {
    return await request<GoogleAuthResponse>('POST', '/auth/google', payload, false) as ApiResponse<GoogleAuthResponse>;
  },

  async sendEmailOTP(
    data: EmailSendOTPRequest
  ): Promise<ApiResponse<EmailSendOTPResponse>> {
    return await request<EmailSendOTPResponse>('POST', '/auth/email/send-otp', data, false) as ApiResponse<EmailSendOTPResponse>;
  },

  async verifyEmailOTP(
    data: EmailVerifyOTPRequest
  ): Promise<ApiResponse<EmailVerifyOTPResponse>> {
    return await request<EmailVerifyOTPResponse>('POST', '/auth/email/verify-otp', data, false) as ApiResponse<EmailVerifyOTPResponse>;
  },

  async register(
    credentials: RegisterCredentials
  ): Promise<ApiResponse<RegisterResponse>> {
    return await request<RegisterResponse>('POST', '/auth/register', credentials, false) as ApiResponse<RegisterResponse>;
  },

  async resendVerification(
    email: string
  ): Promise<ApiResponse<{ message: string }>> {
    return await request<{ message: string }>('POST', '/auth/resend-verification', { email }, false) as ApiResponse<{ message: string }>;
  },

  async verifyOTP(
    data: VerifyOTPRequest
  ): Promise<ApiResponse<VerifyOTPResponse>> {
    return await request<VerifyOTPResponse>('POST', '/auth/verify-otp', data, false) as ApiResponse<VerifyOTPResponse>;
  },

  async resendOTP(
    data: ResendOTPRequest
  ): Promise<ApiResponse<ResendOTPResponse>> {
    return await request<ResendOTPResponse>('POST', '/auth/resend-otp', data, false) as ApiResponse<ResendOTPResponse>;
  },

  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ApiResponse<ForgotPasswordResponse>> {
    return await request<ForgotPasswordResponse>('POST', '/auth/forgot-password', data, false) as ApiResponse<ForgotPasswordResponse>;
  },

  async verifyResetOTP(
    data: VerifyOTPRequest
  ): Promise<ApiResponse<VerifyOTPResponse>> {
    return await request<VerifyOTPResponse>('POST', '/auth/verify-reset-otp', data, false) as ApiResponse<VerifyOTPResponse>;
  },

  async resetPassword(
    data: ResetPasswordRequest
  ): Promise<ApiResponse<ResetPasswordResponse>> {
    return await request<ResetPasswordResponse>('POST', '/auth/reset-password', data, false) as ApiResponse<ResetPasswordResponse>;
  },

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    // Get refresh token before making logout request
    const refreshToken = await encryptedTokenStorage.getRefreshToken();
    if (!refreshToken) {
      // If no refresh token, just return success (already logged out locally)
      return {
        data: { success: true },
        meta: { timestamp: new Date().toISOString() },
      } as ApiResponse<{ success: boolean }>;
    }
    
    // Send logout request with refresh token to blacklist it on server
    // requiresAuth: false because logout endpoint is public and only needs refresh token in body
    try {
      const result = await request<{ success: boolean }>('POST', '/auth/logout', { refreshToken }, false) as ApiResponse<{ success: boolean }>;
      return result;
    } catch (error: any) {
      // Even if logout fails on server, we still clear tokens locally
      // This allows users to logout if offline
      return {
        data: { success: true },
        meta: { timestamp: new Date().toISOString() },
      } as ApiResponse<{ success: boolean }>;
    }
  },

  async getCurrentUser(): Promise<ApiResponse<Owner>> {
    return await request<Owner>('GET', '/auth/me', undefined, true) as ApiResponse<Owner>;
  },
};

export const propertyService = {
  async getProperties(): Promise<PaginatedResponse<Property>> {
    return await request<Property>('GET', '/properties', undefined, true) as PaginatedResponse<Property>;
  },

  async createProperty(
    data: Partial<Property>
  ): Promise<ApiResponse<Property>> {
    return await request<Property>('POST', '/properties', data, true) as ApiResponse<Property>;
  },

  async updateProperty(
    id: string,
    data: Partial<Property>
  ): Promise<ApiResponse<Property>> {
    return await request<Property>('PATCH', `/properties/${id}`, data, true) as ApiResponse<Property>;
  },

  async deleteProperty(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/properties/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },
};

export const tenantService = {
  async getTenants(propertyId?: string, search?: string, status?: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<Tenant>> {
    let endpoint = '/tenants?';
    const params: string[] = [];
    
    if (propertyId) params.push(`property_id=${encodeURIComponent(propertyId)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    params.push(`page=${page}`);
    params.push(`page_size=${pageSize}`);
    
    endpoint += params.join('&');
    return await request<Tenant>('GET', endpoint, undefined, true) as PaginatedResponse<Tenant>;
  },

  async getTenantById(id: string): Promise<ApiResponse<Tenant>> {
    return await request<Tenant>('GET', `/tenants/${id}`, undefined, true) as ApiResponse<Tenant>;
  },

  async createTenant(data: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    return await request<Tenant>('POST', '/tenants', data, true) as ApiResponse<Tenant>;
  },

  async updateTenant(
    id: string,
    data: Partial<Tenant>
  ): Promise<ApiResponse<Tenant>> {
    return await request<Tenant>('PATCH', `/tenants/${id}`, data, true) as ApiResponse<Tenant>;
  },

  async deleteTenant(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/tenants/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },
};

export const paymentService = {
  async getPayments(
    propertyId?: string,
    options?: {
      tenantId?: string;
      status?: 'paid' | 'due';
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<Payment>> {
    const params: string[] = [];
    if (propertyId) params.push(`propertyId=${encodeURIComponent(propertyId)}`);
    if (options?.tenantId) params.push(`tenantId=${encodeURIComponent(options.tenantId)}`);
    if (options?.status) params.push(`status=${encodeURIComponent(options.status)}`);
    if (options?.page) params.push(`page=${options.page}`);
    if (options?.pageSize) params.push(`page_size=${options.pageSize}`);
    if (options?.startDate) params.push(`startDate=${encodeURIComponent(options.startDate)}`);
    if (options?.endDate) params.push(`endDate=${encodeURIComponent(options.endDate)}`);

    let endpoint = '/payments';
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    return await request<Payment>('GET', endpoint, undefined, true) as PaginatedResponse<Payment>;
  },

  async getPaymentById(id: string): Promise<ApiResponse<Payment>> {
    return await request<Payment>('GET', `/payments/${id}`, undefined, true) as ApiResponse<Payment>;
  },

  async recordPayment(data: Partial<Payment>): Promise<ApiResponse<Payment>> {
    return await request<Payment>('POST', '/payments', data, true) as ApiResponse<Payment>;
  },

  async updatePayment(
    id: string,
    data: Partial<Payment>
  ): Promise<ApiResponse<Payment>> {
    return await request<Payment>('PATCH', `/payments/${id}`, data, true) as ApiResponse<Payment>;
  },

  async getPaymentStats(): Promise<
    ApiResponse<{
      collected: string;
      pending: string;
    }>
  > {
    return await request<{
      collected: string;
      pending: string;
    }>('GET', '/payments/stats', undefined, true) as ApiResponse<{
      collected: string;
      pending: string;
    }>;
  },

  async getPaymentMethods(): Promise<ApiResponse<{ data: string[] }>> {
    return await request<{ data: string[] }>('GET', '/payments/methods', undefined, true) as ApiResponse<{ data: string[] }>;
  },
};

export const subscriptionService = {
  async getSubscription(): Promise<ApiResponse<Subscription>> {
    return await request<Subscription>('GET', '/subscription', undefined, true) as ApiResponse<Subscription>;
  },

  async getAllSubscriptions(): Promise<ApiResponse<{ count: number; subscriptions: Subscription[] }>> {
    return await request<{ count: number; subscriptions: Subscription[] }>('GET', '/subscription/all', undefined, true) as ApiResponse<{ count: number; subscriptions: Subscription[] }>;
  },

  async initializeSubscriptions(): Promise<ApiResponse<{ success: boolean; message: string; subscriptions_created: number; plans_created: string[] }>> {
    return await request<{ success: boolean; message: string; subscriptions_created: number; plans_created: string[] }>('POST', '/subscription/initialize', {}, true) as ApiResponse<{ success: boolean; message: string; subscriptions_created: number; plans_created: string[] }>;
  },

  async getUsage(): Promise<ApiResponse<Usage>> {
    return await request<Usage>('GET', '/subscription/usage', undefined, true) as ApiResponse<Usage>;
  },

  async getLimits(
    plan: string
  ): Promise<ApiResponse<PlanLimits>> {
    return await request<PlanLimits>('GET', `/subscription/limits/${plan}`, undefined, true) as ApiResponse<PlanLimits>;
  },

  async getPlans(): Promise<ApiResponse<{ plans: PlanMetadata[] }>> {
    const response = await request<any>('GET', '/subscription/plans', undefined, true) as ApiResponse<any>;
    const rawData = response.data;
    const plansArray = Array.isArray(rawData) ? rawData : (rawData?.plans || []);

    const normalizedPlans: PlanMetadata[] = plansArray.map((plan: any) => ({
      ...plan,
      periods: (plan?.periods || []).map((period: any) => ({
        ...period,
        period: Number(period.period),
      })),
    }));

    return {
      ...response,
      data: {
        plans: normalizedPlans,
      },
    } as ApiResponse<{ plans: PlanMetadata[] }>;
  },

  async updateSubscription(
    plan: string,
    period: number = 1
  ): Promise<ApiResponse<Subscription>> {
    return await request<Subscription>('POST', '/subscription/upgrade', { plan, period }, true) as ApiResponse<Subscription>;
  },

  async createCheckoutSession(
    plan: string,
    period: number = 1,
    couponCode?: string
  ): Promise<ApiResponse<RazorpayCheckoutSession>> {
    const payload: any = { plan, period };
    if (couponCode) {
      payload.coupon_code = couponCode;
    }
    return await request<RazorpayCheckoutSession>('POST', '/subscription/create-checkout-session', payload, true) as ApiResponse<RazorpayCheckoutSession>;
  },

  async verifyPayment(
    data: VerifyPaymentRequest
  ): Promise<ApiResponse<VerifyPaymentResponse>> {
    return await request<VerifyPaymentResponse>('POST', '/subscription/verify-payment', data, true) as ApiResponse<VerifyPaymentResponse>;
  },

  async getQuotaWarnings(): Promise<ApiResponse<QuotaWarningsResponse>> {
    return await request<QuotaWarningsResponse>('GET', '/subscription/quota-warnings', undefined, true) as ApiResponse<QuotaWarningsResponse>;
  },

  async getArchivedResources(): Promise<ApiResponse<ArchivedResourcesResponse>> {
    return await request<ArchivedResourcesResponse>('GET', '/subscription/archived-resources', undefined, true) as ApiResponse<ArchivedResourcesResponse>;
  },

  async recoverArchivedResources(): Promise<ApiResponse<{ success: boolean; restored_resources: any }>> {
    return await request<{ success: boolean; restored_resources: any }>('POST', '/subscription/recover-archived-resources', {}, true) as ApiResponse<{ success: boolean; restored_resources: any }>;
  },

  async enableAutoRenewal(): Promise<ApiResponse<{ success: boolean; message: string; autoRenewal: boolean }>> {
    return await request<{ success: boolean; message: string; autoRenewal: boolean }>('POST', '/subscription/auto-renewal/enable', {}, true) as ApiResponse<{ success: boolean; message: string; autoRenewal: boolean }>;
  },

  async disableAutoRenewal(): Promise<ApiResponse<{ success: boolean; message: string; autoRenewal: boolean }>> {
    return await request<{ success: boolean; message: string; autoRenewal: boolean }>('POST', '/subscription/auto-renewal/disable', {}, true) as ApiResponse<{ success: boolean; message: string; autoRenewal: boolean }>;
  },

  async cancelSubscription(): Promise<ApiResponse<Subscription>> {
    return await request<Subscription>('POST', '/subscription/cancel', {}, true) as ApiResponse<Subscription>;
  },
};

export const couponService = {
  async validateCoupon(
    code: string,
    amount?: number,
    plan?: string
  ): Promise<ApiResponse<{ isValid: boolean; message: string; originalAmount?: number; discountAmount?: number; finalAmount?: number }>> {
    const params = new URLSearchParams();
    if (amount !== undefined) params.append('amount', amount.toString());
    if (plan) params.append('plan', plan);
    
    return await request<{ isValid: boolean; message: string; originalAmount?: number; discountAmount?: number; finalAmount?: number }>(
      'GET',
      `/coupons/validate/${encodeURIComponent(code)}?${params.toString()}`,
      undefined,
      false
    ) as ApiResponse<{ isValid: boolean; message: string; originalAmount?: number; discountAmount?: number; finalAmount?: number }>;
  },

  async applyCoupon(
    code: string,
    amount: number,
    plan?: string
  ): Promise<ApiResponse<{ isValid: boolean; message: string; originalAmount: number; discountAmount: number; finalAmount: number }>> {
    return await request<{ isValid: boolean; message: string; originalAmount: number; discountAmount: number; finalAmount: number }>(
      'POST',
      '/coupons/apply',
      { code, amount, plan },
      false
    ) as ApiResponse<{ isValid: boolean; message: string; originalAmount: number; discountAmount: number; finalAmount: number }>;
  },
};

export const roomService = {
  async getRooms(propertyId?: string, search?: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<Room>> {
    let endpoint = '/rooms/?';
    const params: string[] = [];
    
    if (propertyId) params.push(`property_id=${encodeURIComponent(propertyId)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    params.push(`page=${page}`);
    params.push(`page_size=${pageSize}`);
    
    endpoint += params.join('&');
    return await request<Room>('GET', endpoint, undefined, true) as PaginatedResponse<Room>;
  },

  async getRoomById(id: string): Promise<ApiResponse<Room>> {
    return await request<Room>('GET', `/rooms/${id}`, undefined, true) as ApiResponse<Room>;
  },

  async createRoom(data: Partial<Room>): Promise<ApiResponse<Room>> {
    const response = await request<Room>('POST', '/rooms', data, true) as ApiResponse<Room>;
    if (data.propertyId) {
      const propertyId = encodeURIComponent(data.propertyId);
      await dataCache.remove(`api:/beds/available-by-property?property_id=${propertyId}`);
    }
    return response;
  },

  async updateRoom(
    id: string,
    data: Partial<Room>
  ): Promise<ApiResponse<Room>> {
    const response = await request<Room>('PATCH', `/rooms/${id}`, data, true) as ApiResponse<Room>;
    if (data.propertyId) {
      const propertyId = encodeURIComponent(data.propertyId);
      await dataCache.remove(`api:/beds/available-by-property?property_id=${propertyId}`);
    }
    return response;
  },

  async deleteRoom(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/rooms/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },
};

export const bedService = {
  async getAvailableBedsByProperty(propertyId: string): Promise<ApiResponse<Array<{ room: Room; availableBeds: Bed[] }>>> {
    return await request<Array<{ room: Room; availableBeds: Bed[] }>>(
      'GET', 
      `/beds/available-by-property?property_id=${encodeURIComponent(propertyId)}`, 
      undefined, 
      true
    ) as ApiResponse<Array<{ room: Room; availableBeds: Bed[] }>>;
  },

  async getBeds(roomId?: string, propertyId?: string, status?: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<Bed>> {
    let endpoint = '/beds?';
    const params: string[] = [];
    
    if (roomId) params.push(`room_id=${encodeURIComponent(roomId)}`);
    if (propertyId) params.push(`property_id=${encodeURIComponent(propertyId)}`);
    if (status) params.push(`status_filter=${encodeURIComponent(status)}`);
    params.push(`page=${page}`);
    params.push(`page_size=${pageSize}`);
    
    endpoint += params.join('&');
    return await request<Bed>('GET', endpoint, undefined, true) as PaginatedResponse<Bed>;
  },

  async getBedById(id: string): Promise<ApiResponse<Bed>> {
    return await request<Bed>('GET', `/beds/${id}`, undefined, true) as ApiResponse<Bed>;
  },

  async createBed(data: Partial<Bed>): Promise<ApiResponse<Bed>> {
    const response = await request<Bed>('POST', '/beds', data, true) as ApiResponse<Bed>;
    if (data.propertyId) {
      const propertyId = encodeURIComponent(data.propertyId);
      await dataCache.remove(`api:/beds/available-by-property?property_id=${propertyId}`);
    }
    return response;
  },

  async updateBed(
    id: string,
    data: Partial<Bed>
  ): Promise<ApiResponse<Bed>> {
    const response = await request<Bed>('PATCH', `/beds/${id}`, data, true) as ApiResponse<Bed>;
    if (data.propertyId) {
      const propertyId = encodeURIComponent(data.propertyId);
      await dataCache.remove(`api:/beds/available-by-property?property_id=${propertyId}`);
    }
    return response;
  },

  async deleteBed(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/beds/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },
};

export const staffService = {
  async getStaff(propertyId?: string, search?: string, role?: string, status?: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<Staff>> {
    let endpoint = '/staff?';
    const params: string[] = [];
    
    if (propertyId) params.push(`property_id=${encodeURIComponent(propertyId)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (role) params.push(`role=${encodeURIComponent(role)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    params.push(`page=${page}`);
    params.push(`page_size=${pageSize}`);
    
    endpoint += params.join('&');
    return await request<Staff>('GET', endpoint, undefined, true) as PaginatedResponse<Staff>;
  },

  async getStaffById(id: string): Promise<ApiResponse<Staff>> {
    return await request<Staff>('GET', `/staff/${id}`, undefined, true) as ApiResponse<Staff>;
  },

  async createStaff(data: Partial<Staff>): Promise<ApiResponse<Staff>> {
    return await request<Staff>('POST', '/staff', data, true) as ApiResponse<Staff>;
  },

  async updateStaff(
    id: string,
    data: Partial<Staff>
  ): Promise<ApiResponse<Staff>> {
    return await request<Staff>('PATCH', `/staff/${id}`, data, true) as ApiResponse<Staff>;
  },

  async deleteStaff(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/staff/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },

  async getArchivedStaff(propertyId?: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<Staff>> {
    let endpoint = '/staff/archived/list?';
    const params: string[] = [];
    
    if (propertyId) params.push(`property_id=${encodeURIComponent(propertyId)}`);
    params.push(`page=${page}`);
    params.push(`page_size=${pageSize}`);
    
    endpoint += params.join('&');
    return await request<Staff>('GET', endpoint, undefined, true) as PaginatedResponse<Staff>;
  },

  async restoreStaff(id: string): Promise<ApiResponse<Staff>> {
    return await request<Staff>('POST', `/staff/${id}/restore`, {}, true) as ApiResponse<Staff>;
  },
};

export const dashboardService = {
  async getStats(propertyId?: string): Promise<ApiResponse<DashboardStats>> {
    let endpoint = '/dashboard/stats';
    if (propertyId) {
      endpoint += `?property_id=${encodeURIComponent(propertyId)}`;
    }
    return await request<DashboardStats>('GET', endpoint, undefined, true) as ApiResponse<DashboardStats>;
  },
};

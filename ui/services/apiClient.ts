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
  ApiResponse,
  PaginatedResponse,
  LoginCredentials,
  LoginResponse,
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
} from './apiTypes';
import { tokenStorage } from './tokenStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  endpoint: string;
  body?: any;
  requiresAuth?: boolean;
}

async function request<T>(
  method: HttpMethod,
  endpoint: string,
  body?: any,
  requiresAuth: boolean = false
): Promise<ApiResponse<T> | PaginatedResponse<T>> {
  try {
    const url = `${BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requiresAuth) {
      const token = await tokenStorage.getAccessToken();
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
      if (response.status === 401) {
        const error: ApiError = {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please login again.',
          details: { status: 401 },
        };
        throw error;
      }

      if (response.status === 403) {
        const error: ApiError = {
          code: responseData?.code || 'FORBIDDEN',
          message: responseData?.message || 'Access denied',
          details: responseData?.details || { status: 403 },
        };
        throw error;
      }

      const error: ApiError = {
        code: responseData?.code || 'API_ERROR',
        message: responseData?.message || `HTTP ${response.status}: ${response.statusText}`,
        details: responseData?.details || { status: response.status },
      };
      throw error;
    }

    if (typeof responseData === 'string') {
      return {
        data: responseData as T,
        meta: {
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse<T>;
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return {
        data: responseData.data,
        meta: responseData.meta || {
          total: responseData.data.length,
          page: 1,
          pageSize: responseData.data.length,
          hasMore: false,
        },
      } as PaginatedResponse<T>;
    }

    if (responseData.data) {
      return {
        data: responseData.data,
        meta: responseData.meta || {
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse<T>;
    }

    return {
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse<T>;

  } catch (error: any) {
    if (error.code && error.message) {
      throw error;
    }

    const apiError: ApiError = {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network request failed',
      details: { originalError: error },
    };
    throw apiError;
  }
}

export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<LoginResponse>> {
    return await request<LoginResponse>('POST', '/auth/login', credentials, false) as ApiResponse<LoginResponse>;
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
    return await request<{ success: boolean }>('POST', '/auth/logout', undefined, true) as ApiResponse<{ success: boolean }>;
  },

  async getCurrentUser(): Promise<ApiResponse<Owner>> {
    return await request<Owner>('GET', '/auth/me', undefined, true) as ApiResponse<Owner>;
  },
};

export const propertyService = {
  async getProperties(): Promise<PaginatedResponse<Property>> {
    return await request<Property>('GET', '/properties', undefined, true) as PaginatedResponse<Property>;
  },

  async getPropertyById(id: string): Promise<ApiResponse<Property>> {
    return await request<Property>('GET', `/properties/${id}`, undefined, true) as ApiResponse<Property>;
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
  async getTenants(): Promise<PaginatedResponse<Tenant>> {
    return await request<Tenant>('GET', '/tenants', undefined, true) as PaginatedResponse<Tenant>;
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
  async getPayments(): Promise<PaginatedResponse<Payment>> {
    return await request<Payment>('GET', '/payments', undefined, true) as PaginatedResponse<Payment>;
  },

  async getPaymentById(id: string): Promise<ApiResponse<Payment>> {
    return await request<Payment>('GET', `/payments/${id}`, undefined, true) as ApiResponse<Payment>;
  },

  async recordPayment(data: Partial<Payment>): Promise<ApiResponse<Payment>> {
    return await request<Payment>('POST', '/payments', data, true) as ApiResponse<Payment>;
  },

  async getPaymentStats(): Promise<
    ApiResponse<{
      collected: string;
      pending: string;
      overdue: string;
    }>
  > {
    return await request<{
      collected: string;
      pending: string;
      overdue: string;
    }>('GET', '/payments/stats', undefined, true) as ApiResponse<{
      collected: string;
      pending: string;
      overdue: string;
    }>;
  },
};

export const subscriptionService = {
  async getSubscription(): Promise<ApiResponse<Subscription>> {
    return await request<Subscription>('GET', '/subscription', undefined, true) as ApiResponse<Subscription>;
  },

  async getUsage(): Promise<ApiResponse<Usage>> {
    return await request<Usage>('GET', '/subscription/usage', undefined, true) as ApiResponse<Usage>;
  },

  async getLimits(
    plan: 'free' | 'pro' | 'premium'
  ): Promise<ApiResponse<PlanLimits>> {
    return await request<PlanLimits>('GET', `/subscription/limits/${plan}`, undefined, true) as ApiResponse<PlanLimits>;
  },

  async updateSubscription(
    plan: 'free' | 'pro' | 'premium'
  ): Promise<ApiResponse<Subscription>> {
    return await request<Subscription>('POST', '/subscription/upgrade', { plan }, true) as ApiResponse<Subscription>;
  },
};

export const roomService = {
  async getRooms(): Promise<PaginatedResponse<Room>> {
    return await request<Room>('GET', '/rooms', undefined, true) as PaginatedResponse<Room>;
  },

  async getRoomById(id: string): Promise<ApiResponse<Room>> {
    return await request<Room>('GET', `/rooms/${id}`, undefined, true) as ApiResponse<Room>;
  },

  async createRoom(data: Partial<Room>): Promise<ApiResponse<Room>> {
    return await request<Room>('POST', '/rooms', data, true) as ApiResponse<Room>;
  },

  async updateRoom(
    id: string,
    data: Partial<Room>
  ): Promise<ApiResponse<Room>> {
    return await request<Room>('PATCH', `/rooms/${id}`, data, true) as ApiResponse<Room>;
  },

  async deleteRoom(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/rooms/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },
};

export const bedService = {
  async getBeds(): Promise<PaginatedResponse<Bed>> {
    return await request<Bed>('GET', '/beds', undefined, true) as PaginatedResponse<Bed>;
  },

  async getBedById(id: string): Promise<ApiResponse<Bed>> {
    return await request<Bed>('GET', `/beds/${id}`, undefined, true) as ApiResponse<Bed>;
  },

  async createBed(data: Partial<Bed>): Promise<ApiResponse<Bed>> {
    return await request<Bed>('POST', '/beds', data, true) as ApiResponse<Bed>;
  },

  async updateBed(
    id: string,
    data: Partial<Bed>
  ): Promise<ApiResponse<Bed>> {
    return await request<Bed>('PATCH', `/beds/${id}`, data, true) as ApiResponse<Bed>;
  },

  async deleteBed(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return await request<{ success: boolean }>('DELETE', `/beds/${id}`, undefined, true) as ApiResponse<{ success: boolean }>;
  },
};

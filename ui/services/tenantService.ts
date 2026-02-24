
import { getApi, handleApiError } from '@/lib/api';

export interface CreateTenantRequest {
  propertyId: string;
  unitId: string;
  fullName: string;
  documentId: string;
  phoneNumber: string;
  checkInDate: string;
  depositAmount: string;
  rentType: 'monthly' | 'daywise';
  nextDueDate: string;
  status?: 'stay' | 'vacate';
  address?: string;
  profilePictureUrl?: string;
  paymentStatus?: 'paid' | 'due';
}

export interface TenantResponse {
  id: string;
  propertyId: string;
  unitId: string;
  fullName: string;
  documentId: string;
  phoneNumber: string;
  checkInDate: string;
  depositAmount: string;
  rentType: 'monthly' | 'daywise';
  nextDueDate: string;
  status: 'stay' | 'vacate';
  profilePictureUrl?: string;
  address?: string;
}

export interface PaginatedTenantResponse {
  data: TenantResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantQueryParams {
  propertyId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const tenantService = {
  async createTenant(data: CreateTenantRequest): Promise<TenantResponse> {
    try {
      const api = getApi();
      const response = await api.post<TenantResponse>('/tenants', data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getTenantsByProperty(propertyId: string, params?: Omit<TenantQueryParams, 'propertyId'>): Promise<PaginatedTenantResponse> {
    try {
      const api = getApi();
      const response = await api.get<PaginatedTenantResponse>('/tenants', {
        params: {
          propertyId,
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
          status: params?.status
        }
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      // Stop repeated requests on 403/429
      if (apiError.statusCode === 403 || apiError.statusCode === 429) {
        throw { ...apiError, stopRetry: true };
      }
      throw apiError;
    }
  },
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      const api = getApi();
      await api.delete(`/tenants/${tenantId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updateTenant(tenantId: string, data: Partial<CreateTenantRequest>): Promise<TenantResponse> {
    try {
      const api = getApi();
      const response = await api.patch<TenantResponse>(`/tenants/${tenantId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
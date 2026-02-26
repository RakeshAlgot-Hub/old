# HTTP Request Infrastructure

This document describes the HTTP request engine added to the service layer.

## Overview

A reusable HTTP request function has been added to `services/apiClient.ts` that provides a standardized way to make API calls. This infrastructure is ready for use but **all existing mock services remain unchanged**.

## Core Components

### BASE_URL Constant

```typescript
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
```

- Reads from environment variable `EXPO_PUBLIC_API_URL`
- Falls back to `http://localhost:3000/api` if not set
- Configure in `.env` file for your backend

### Request Function

```typescript
async function request<T>(
  method: HttpMethod,
  endpoint: string,
  body?: any,
  requiresAuth: boolean = false
): Promise<ApiResponse<T> | PaginatedResponse<T>>
```

#### Parameters

- `method`: HTTP method (GET, POST, PUT, PATCH, DELETE)
- `endpoint`: API endpoint path (e.g., '/auth/login')
- `body`: Request body for POST/PUT/PATCH requests
- `requiresAuth`: Whether to attach Authorization header

#### Features

1. **URL Construction**: Builds full URL using BASE_URL + endpoint
2. **JSON Headers**: Automatically sets Content-Type and Accept headers
3. **Authentication**: Attaches Bearer token from tokenStorage when requiresAuth=true
4. **Response Parsing**: Handles JSON and text responses
5. **Error Normalization**: Converts backend errors to ApiError shape
6. **Status Code Handling**:
   - 401: Throws UNAUTHORIZED error
   - 403: Preserves upgrade_required code if present
   - Other errors: Normalized to ApiError format
7. **Response Structure**: Returns { data, meta } format matching existing types

#### Error Handling

**401 Unauthorized**:
```typescript
{
  code: 'UNAUTHORIZED',
  message: 'Authentication required. Please login again.',
  details: { status: 401 }
}
```

**403 Forbidden**:
```typescript
{
  code: responseData?.code || 'FORBIDDEN',
  message: responseData?.message || 'Access denied',
  details: responseData?.details || { status: 403 }
}
```

**Network Errors**:
```typescript
{
  code: 'NETWORK_ERROR',
  message: error.message || 'Network request failed',
  details: { originalError: error }
}
```

## Usage Examples

### Example 1: Authenticated GET Request

```typescript
// Inside a service method (future implementation)
async getProperties(): Promise<PaginatedResponse<Property>> {
  return await request<Property>('GET', '/properties', undefined, true);
}
```

### Example 2: Unauthenticated POST Request

```typescript
async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
  return await request<LoginResponse>('POST', '/auth/login', credentials, false);
}
```

### Example 3: Authenticated POST with Body

```typescript
async createProperty(data: Partial<Property>): Promise<ApiResponse<Property>> {
  return await request<Property>('POST', '/properties', data, true);
}
```

### Example 4: Authenticated DELETE

```typescript
async deleteProperty(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return await request<{ success: boolean }>('DELETE', `/properties/${id}`, undefined, true);
}
```

## Environment Configuration

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For production:

```bash
EXPO_PUBLIC_API_URL=https://api.yourbackend.com
```

## Type Definitions

Environment variable types are defined in `types/env.d.ts`:

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: string;
    }
  }
}
```

## Current State

- HTTP infrastructure is **fully implemented**
- All mock services **remain unchanged**
- No screens modified
- TypeScript compilation successful
- Ready for Part 2: Service method migration

## Next Steps (Part 2)

When ready to connect to real backend:

1. Replace mock implementations with HTTP calls
2. Use `request()` function in each service method
3. Map backend response to expected types
4. Handle errors appropriately
5. Test with real backend endpoints

## Important Notes

- The `request()` function is ready but not yet used
- All existing mock services continue to work
- No breaking changes to any components
- Safe area system untouched
- Navigation system untouched
- UI completely unchanged

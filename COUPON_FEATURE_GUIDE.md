# Coupon/Discount Feature - Implementation Guide

## Overview
A comprehensive coupon system has been added to support:
- **Percentage-based discounts** (e.g., 50% off)
- **Fixed amount discounts** (e.g., ₹50 off)
- **Usage limits** (e.g., max 100 uses)
- **Expiration dates**
- **Minimum amount requirements**
- **Plan-specific coupons** (optional)

---

## Database Schema

### Coupons Collection
```javascript
{
    code: "SAVE50",                          // Unique coupon code (case-insensitive)
    discountType: "percentage",              // "percentage" or "fixed"
    discountValue: 50,                       // 0-100 for percentage, paise amount for fixed
    description: "Save 50% on all plans",    // Optional description
    maxUsageCount: 100,                      // Null = unlimited
    usageCount: 0,                           // Current usage count
    expiresAt: "2026-12-31T23:59:59",        // ISO format, null = never expires
    minAmount: 0,                            // Minimum order amount in paise to apply
    applicablePlans: ["pro", "premium"],     // Empty array = all plans
    isActive: true,                          // Enable/disable coupon
    createdAt: "2026-03-04T10:00:00",
    updatedAt: "2026-03-04T10:00:00"
}
```

### Razorpay Orders Update
Added `coupon_code` field to track which coupon was applied:
```javascript
{
    order_id: "order_xxx",
    user_id: "user_123",
    plan: "pro",
    period: 3,
    amount: 20000,                  // After discount
    currency: "INR",
    status: "created",
    receipt: "sub_pro_3m_user_123",
    coupon_code: "SAVE50",          // NEW: Applied coupon
    payment_id: null,
    signature: null,
    created_at: "2026-03-04T...",
    updated_at: "2026-03-04T..."
}
```

---

## API Endpoints

### Admin Endpoints (Require Authentication)

#### 1. **POST `/api/v1/coupons/admin/create`**
Create a new coupon

**Request:**
```json
{
    "code": "SAVE50",
    "discountType": "percentage",
    "discountValue": 50,
    "description": "Save 50% on all plans",
    "maxUsageCount": 100,
    "expiresAt": "2026-12-31T23:59:59",
    "minAmount": 0,
    "applicablePlans": ["pro", "premium"]
}
```

**Response (201 Created):**
```json
{
    "data": {
        "code": "SAVE50",
        "discountType": "percentage",
        "discountValue": 50,
        "description": "Save 50% on all plans",
        "maxUsageCount": 100,
        "usageCount": 0,
        "expiresAt": "2026-12-31T23:59:59",
        "minAmount": 0,
        "applicablePlans": ["pro", "premium"],
        "isActive": true,
        "createdAt": "2026-03-04T10:00:00",
        "updatedAt": "2026-03-04T10:00:00"
    },
    "message": "Coupon 'SAVE50' created successfully"
}
```

**Error Responses:**
- `400` - Invalid coupon code, discount type, or values
- `400` - Coupon code already exists

---

#### 2. **GET `/api/v1/coupons/admin/list`**
List all coupons with optional filtering

**Query Parameters:**
- `is_active` (optional): Filter by active status (true/false)

**Response:**
```json
{
    "data": [
        {
            "code": "SAVE50",
            "discountType": "percentage",
            "discountValue": 50,
            ...
        }
    ],
    "total": 1
}
```

---

#### 3. **GET `/api/v1/coupons/admin/{code}`**
Get coupon details and statistics

**Response:**
```json
{
    "data": {
        "coupon": {
            "code": "SAVE50",
            "discountType": "percentage",
            "discountValue": 50,
            ...
        },
        "stats": {
            "code": "SAVE50",
            "discountType": "percentage",
            "discountValue": 50,
            "totalUsage": 45,
            "maxUsage": 100,
            "usagePercentage": 45,
            "isActive": true,
            "expiresAt": "2026-12-31T23:59:59",
            "createdAt": "2026-03-04T10:00:00"
        }
    }
}
```

---

#### 4. **PATCH `/api/v1/coupons/admin/{code}`**
Update coupon (admin only)

**Request:**
```json
{
    "isActive": false,
    "maxUsageCount": 200,
    "expiresAt": "2027-12-31T23:59:59",
    "discountValue": 40
}
```

**Updatable Fields:**
- `isActive`
- `discountValue`
- `maxUsageCount`
- `expiresAt`
- `minAmount`
- `applicablePlans`
- `description`

---

#### 5. **DELETE `/api/v1/coupons/admin/{code}`**
Delete coupon

**Response:**
```json
{
    "data": {
        "code": "SAVE50"
    },
    "message": "Coupon 'SAVE50' deleted successfully"
}
```

---

### Public Endpoints

#### 6. **GET `/api/v1/coupons/validate/{code}`**
Validate coupon and calculate discount (no authentication required)

**Query Parameters:**
- `code` (path): Coupon code
- `amount` (required): Order amount in paise
- `plan` (optional): Plan name

**Example:** `GET /api/v1/coupons/validate/SAVE50?amount=7900&plan=pro`

**Response (Valid):**
```json
{
    "data": {
        "isValid": true,
        "message": "Coupon applied successfully",
        "originalAmount": 7900,
        "discountAmount": 3950,
        "finalAmount": 3950,
        "discountPercentage": 50
    }
}
```

**Response (Invalid):**
```json
{
    "data": {
        "isValid": false,
        "message": "Coupon has expired",
        "originalAmount": 7900,
        "discountAmount": 0,
        "finalAmount": 7900,
        "discountPercentage": null
    }
}
```

**Validation Rules:**
- Coupon must exist
- Coupon must be active
- Not expired (if expiry date set)
- Usage limit not reached (if limit set)
- Order amount >= minimum amount required
- If plan specified, coupon must apply to that plan (if applicablePlans not empty)

---

#### 7. **POST `/api/v1/coupons/apply`**
Apply coupon to payment (authenticated)

**Request:**
```json
{
    "code": "SAVE50",
    "amount": 7900,
    "plan": "pro"
}
```

**Response:**
```json
{
    "data": {
        "isValid": true,
        "message": "Coupon applied successfully",
        "originalAmount": 7900,
        "discountAmount": 3950,
        "finalAmount": 3950,
        "discountPercentage": 50
    }
}
```

---

## Subscription Integration

### Updated Checkout Flow

#### 1. **POST `/api/v1/subscription/create-checkout-session`**
Now accepts optional coupon code

**Request:**
```json
{
    "plan": "pro",
    "period": 3,
    "coupon_code": "SAVE50"
}
```

**Response:**
```json
{
    "data": {
        "razorpayOrderId": "order_xxx",
        "amount": 10000,                    // Final amount (after discount)
        "originalAmount": 20000,            // Original price
        "discountAmount": 10000,            // Discount applied
        "couponCode": "SAVE50",
        "currency": "INR",
        "keyId": "rzp_live_xxx"
    }
}
```

**Features:**
- Auto-validates coupon before creating order
- Calculates final amount with discount
- Returns both original and discounted amounts
- Returns coupon code in response

---

#### 2. **POST `/api/v1/subscription/verify-payment`**
Now increments coupon usage on successful payment

**Request:**
```json
{
    "payment_id": "pay_xxx",
    "order_id": "order_xxx",
    "signature": "signature_xxx"
}
```

**Response:**
```json
{
    "data": {
        "success": true,
        "subscription": "pro",
        "period": 3,
        "couponApplied": true,
        "couponCode": "SAVE50"
    }
}
```

**Logic:**
1. Verify payment signature
2. Update subscription
3. **Increment coupon usage count** if coupon was used
4. Return success response with coupon info

---

## Feature Examples

### Example 1: Percentage Discount
```json
{
    "code": "SPRING50",
    "discountType": "percentage",
    "discountValue": 50,
    "expiresAt": "2026-03-31T23:59:59",
    "maxUsageCount": 500,
    "applicablePlans": []  // All plans
}
```
- Pro plan annual (₹600): → ₹300
- Premium plan annual (₹1200): → ₹600

---

### Example 2: Fixed Amount Discount
```json
{
    "code": "SAVE100",
    "discountType": "fixed",
    "discountValue": 10000,  // ₹100 off
    "minAmount": 20000,      // Only on orders >= ₹200
    "applicablePlans": ["pro", "premium"]
}
```
- Pro plan monthly (₹79): Not eligible (below ₹200)
- Pro plan annual (₹600): → ₹500
- Premium plan annual (₹1200): → ₹1100

---

### Example 3: Limited Time, Limited Usage
```json
{
    "code": "BLACKFRIDAY",
    "discountType": "percentage",
    "discountValue": 75,
    "expiresAt": "2026-11-29T23:59:59",
    "maxUsageCount": 50,
    "minAmount": 0,
    "applicablePlans": ["premium"]  // Premium only
}
```
- Used 45/50 times
- Expires in 8 months
- Premium plans get 75% discount

---

## Frontend Integration

### 1. Add Coupon Input to Checkout

```typescript
interface CheckoutData {
    plan: string;
    period: number;
    couponCode?: string;
}

// Before creating checkout session
const handleApplyCoupon = async (code: string) => {
    const response = await subscriptionService.validateCoupon(code, amount, plan);
    if (response.data.isValid) {
        setDiscountInfo({
            code: code,
            discount: response.data.discountAmount,
            finalAmount: response.data.finalAmount
        });
    }
};
```

### 2. Update Checkout Session

```typescript
const checkoutData = {
    plan: selectedPlan,
    period: selectedPeriod,
    coupon_code: appliedCoupon?.code  // Include if available
};

const session = await subscriptionService.createCheckoutSession(checkoutData);
// session.data.amount is now the discounted amount
```

### 3. Display Discount Details

```typescript
return (
    <>
        <Text>Original Price: ₹{session.originalAmount / 100}</Text>
        {session.discountAmount > 0 && (
            <>
                <Text>Discount: -₹{session.discountAmount / 100}</Text>
                <Text style={styles.finalPrice}>
                    Final: ₹{session.amount / 100}
                </Text>
            </>
        )}
    </>
);
```

---

## Admin Dashboard Features

### Coupon Management
1. **Create Coupons** - Set up new promotional codes
2. **List Coupons** - View all active/inactive coupons
3. **View Stats** - See usage statistics and effectiveness
4. **Update Coupons** - Modify discount, limits, or disable
5. **Delete Coupons** - Remove old/expired coupons

### Monitoring
- Track coupon usage rates
- Monitor discount amounts
- Identify popular coupons
- Check expiration dates

---

## Business Logic

### Validation Sequence (in `validate_coupon`)
1. ✓ Coupon exists?
2. ✓ Coupon is active?
3. ✓ Not expired?
4. ✓ Usage limit not reached?
5. ✓ Order amount meets minimum?
6. ✓ Plan is applicable (if restricted)?
7. ✓ Calculate discount

### Discount Calculation
**Percentage:**
```
discount = (amount × discountValue) / 100
finalAmount = amount - discount
```

**Fixed:**
```
discount = min(discountValue, amount)  // Can't discount more than amount
finalAmount = amount - discount
```

---

## Error Handling

### Common Errors

| Error | Message | HTTP Code |
|-------|---------|-----------|
| Invalid code | "Coupon not found" | 400 |
| Inactive | "Coupon is inactive" | 400 |
| Expired | "Coupon has expired" | 400 |
| Limit reached | "Coupon usage limit reached" | 400 |
| Min amount | "Minimum order amount XXX paise required" | 400 |
| Wrong plan | "Coupon not applicable for XXX plan" | 400 |
| Invalid type | "discountType must be 'percentage' or 'fixed'" | 400 |
| Invalid % value | "Percentage discount must be between 0 and 100" | 400 |
| Code exists | "Coupon code 'XXX' already exists" | 400 |

---

## Testing Checklist

- [ ] Create percentage coupon
- [ ] Create fixed amount coupon
- [ ] Set expiration date (past and future)
- [ ] Set usage limit and verify increment
- [ ] Test coupon on different plans
- [ ] Test minimum amount requirement
- [ ] Apply coupon to checkout
- [ ] Verify payment with coupon
- [ ] Check coupon usage incremented
- [ ] Update coupon settings
- [ ] Delete coupon
- [ ] List coupons with filtering
- [ ] View usage statistics
- [ ] Test invalid coupons
- [ ] Test expired coupons
- [ ] Test limit reached scenario

---

## Performance Considerations

### Indexes
- `code`: Unique index for fast lookups
- `isActive`: For filtering active coupons
- `expiresAt`: For checking expiration
- `createdAt`: For sorting/auditing

### Query Optimization
- Coupon validation uses single indexed lookup
- Admin list queries use indexed filtering
- Scheduled cleanup can be added for expired coupons

---

## Future Enhancements

1. **Tiered Coupons** - Different discounts for different amounts
2. **User Limits** - Max uses per user
3. **Referral System** - Auto-generate coupons for referrals
4. **Campaign Tracking** - Link coupons to marketing campaigns
5. **A/B Testing** - Test different discount rates
6. **Scheduled Coupons** - Set future activation dates
7. **Bulk Operations** - Create multiple coupons at once


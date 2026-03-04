# Dynamic Subscription System - Implementation Summary

## Overview
The subscription system has been upgraded from fixed 3-plan, 30-day billing to a fully **dynamic, period-based system** that supports:
- **Multiple billing periods** (1, 3, 6, 12 months, etc.)
- **Dynamic plan creation** (add any custom plans beyond pro/premium)
- **Period-based pricing** (different prices for different durations)
- **Flexible subscription management**

---

## Schema Changes

### Subscription Model
**Added `period` field** to track billing period in months:
```python
class Subscription(BaseModel):
    ownerId: str
    plan: str                          # Now accepts any plan name (not just 'free', 'pro', 'premium')
    period: int = 1                    # NEW: Billing period in months (0 for free, 1/3/6/12 for paid)
    status: Literal['active', 'inactive', 'cancelled'] = 'active'
    price: int                         # Price in paise for THIS period (not per-month)
    currentPeriodStart: str
    currentPeriodEnd: str
    propertyLimit: int
    roomLimit: int
    tenantLimit: int
    staffLimit: int
    createdAt: str
    updatedAt: str
```

---

## Backend Changes

### 1. Dynamic Subscription Plans Structure
**File:** `api/app/services/subscription_service.py`

**Old structure:** Single price per plan
```python
'pro': {'properties': 3, 'tenants': 150, 'rooms': 50, 'staff': 5, 'price': 7900}
```

**New structure:** Period-based pricing
```python
'pro': {
    'properties': 3,
    'tenants': 150,
    'rooms': 50,
    'staff': 5,
    'periods': {
        1: 7900,      # ₹79/month
        3: 20000,     # ₹200 (approx ₹66/month)
        6: 35000,     # ₹350 (approx ₹58/month)
        12: 60000,    # ₹600 (approx ₹50/month)
    }
}
```

### 2. New Helper Functions

#### `get_available_periods(plan: str) -> list`
Returns available billing periods for a plan.
- Free plan: `[0]` (not charged)
- Pro/Premium: `[1, 3, 6, 12]`

#### `get_plan_price(plan: str, period: int) -> int`
Returns price in paise for a specific plan and period.

#### `get_all_plans() -> list`
Returns all plans with their features and pricing tiers for UI display:
```json
[
    {
        "name": "pro",
        "properties": 3,
        "tenants": 150,
        "rooms": 50,
        "staff": 5,
        "periods": [
            {"period": 1, "price": 7900, "priceText": "₹79", "pricePerMonth": 7900},
            {"period": 3, "price": 20000, "priceText": "₹200", "pricePerMonth": 6666},
            ...
        ]
    }
]
```

### 3. Updated SubscriptionService Methods

#### `update_subscription(owner_id, plan, period=1)`
Now accepts period parameter and calculates:
- Correct billing period end date based on months
- Price for the selected period
- Deactivates other subscriptions automatically

Example:
```python
await SubscriptionService.update_subscription(user_id, "pro", 3)
# Activates 3-month pro plan at ₹200
```

#### `get_plan_limits(plan: str)`
Returns only features (properties, tenants, rooms, staff), not pricing.

#### `create_default_subscriptions(owner_id)`
Creates subscriptions with dynamic periods (uses 1st available period for each plan).

### 4. New API Endpoints

#### GET `/subscription/plans`
Returns all available plans with pricing tiers:
```json
{
    "data": [
        {
            "name": "pro",
            "properties": 3,
            "tenants": 150,
            "rooms": 50,
            "staff": 5,
            "periods": [
                {"period": 1, "price": 7900, "priceText": "₹79", "pricePerMonth": 7900},
                {"period": 3, "price": 20000, "priceText": "₹200", "pricePerMonth": 6666},
                {"period": 6, "price": 35000, "priceText": "₹350", "pricePerMonth": 5833},
                {"period": 12, "price": 60000, "priceText": "₹600", "pricePerMonth": 5000}
            ]
        }
    ]
}
```

### 5. Updated Payment Request/Response Formats

#### POST `/subscription/upgrade`
**Request:**
```json
{
    "plan": "pro",
    "period": 3
}
```
**Response includes period:**
```json
{
    "data": {
        "plan": "pro",
        "period": 3,
        "price": 20000,
        "currentPeriodEnd": "2026-06-04T..."
    }
}
```

#### POST `/subscription/create-checkout-session`
**Request:**
```json
{
    "plan": "premium",
    "period": 6
}
```

#### POST `/subscription/verify-payment`
**Response includes period:**
```json
{
    "data": {
        "success": true,
        "subscription": "premium",
        "period": 6
    }
}
```

### 6. RazorpayOrder Model Update
**File:** `api/app/models/razorpay_order.py`

Added `period` field to track the billing period:
```python
class RazorpayOrder(BaseModel):
    order_id: str
    user_id: str
    plan: str
    period: int = 1          # NEW: Billing period in months
    amount: int
    currency: str
    status: str
    receipt: str
    payment_id: Optional[str] = None
    signature: Optional[str] = None
    created_at: str
    updated_at: str
```

### 7. RazorpayService Updates
**File:** `api/app/services/razorpay_service.py`

#### `create_order(user_id, plan, period, amount, currency, receipt)`
Now accepts period parameter and includes it in the order document.

#### `verify_payment()` Response
Now returns dict with both plan and period:
```python
return True, {"plan": "pro", "period": 3}
```

---

## Features

### 1. **Flexible Billing Periods**
Users can choose:
- 1 month at ₹79
- 3 months at ₹200 (saves ~₹37)
- 6 months at ₹350 (saves ~₹124)
- 12 months at ₹600 (saves ~₹348)

### 2. **Dynamic Plan Addition**
Add custom plans easily:
```python
'starter': {
    'properties': 2,
    'tenants': 100,
    'rooms': 40,
    'staff': 4,
    'periods': {
        1: 4900,
        3: 12000,
        6: 20000,
        12: 35000,
    }
}
```

### 3. **Automatic Period Calculation**
Period end date is automatically calculated:
- 1 month → 30 days
- 3 months → 90 days
- 6 months → 180 days
- 12 months → 365 days

### 4. **Smart Subscription Management**
- Only one subscription per user is "active"
- Other plans stay "inactive" until user upgrades
- Subscription status automatically managed on upgrade/downgrade

---

## Database Changes

### Existing Collections
No migration needed - the `period` field defaults to appropriate values:
- Free plan subscriptions: `period=0`
- Paid subscriptions: `period=1` (first available)

### Backward Compatibility
Old subscriptions without `period` field will default based on plan:
- `"plan": "free"` → period 0
- `"plan": "pro"` → period 1
- `"plan": "premium"` → period 1

---

## Frontend Integration

### New UI Requirements

1. **Plan Comparison Screen**
   - Display all plans with multiple period options
   - Show price per month for transparency
   - Add period selector (radio buttons/tabs)

2. **Checkout Flow**
   - Include selected period in payment request
   - Display total amount and period duration

3. **Subscription Status**
   - Show current plan, period, and renewal date
   - Display "Auto-renews in X days"

### Example UI Data Usage
```typescript
interface Plan {
    name: string;
    properties: number;
    tenants: number;
    rooms: number;
    staff: number;
    periods: Array<{
        period: number;      // in months
        price: number;       // in paise
        priceText: string;   // formatted (₹79)
        pricePerMonth: number;  // for display
    }>;
}
```

---

## Rollout Checklist

- [ ] Database backup before migration
- [ ] Deploy backend changes
- [ ] Update frontend to use new `/subscription/plans` endpoint
- [ ] Add period selector to upgrade UI
- [ ] Test checkout flow with multiple periods
- [ ] Verify Razorpay integration handles period correctly
- [ ] Update user documentation
- [ ] Monitor for any subscription-related issues

---

## Example Migration Path

**Before:**
```python
# POST /subscription/upgrade
{"plan": "pro"}
# Result: 30-day pro plan at ₹79
```

**After:**
```python
# Option 1: Monthly (default)
{"plan": "pro", "period": 1}  # ₹79 for 1 month

# Option 2: Quarterly
{"plan": "pro", "period": 3}  # ₹200 for 3 months

# Option 3: Annual
{"plan": "pro", "period": 12} # ₹600 for 12 months
```

---

## Configuration

To customize periods and pricing, edit `DEFAULT_SUBSCRIPTION_PLANS` in:
**File:** `api/app/services/subscription_service.py`

Example:
```python
'premium': {
    'properties': 5,
    'tenants': 200,
    'rooms': 70,
    'staff': 7,
    'periods': {
        1: 12900,     # ₹129
        2: 23000,     # ₹230 (new period)
        3: 35000,     # ₹350
        6: 65000,     # ₹650
        12: 120000,   # ₹1200
    }
}
```

---

## Testing Checklist

- [ ] Test upgrade with different periods
- [ ] Verify period end dates are calculated correctly
- [ ] Test Razorpay order creation with periods
- [ ] Test payment verification with period
- [ ] Verify subscription status after payment
- [ ] Test downgrade from multi-period subscription
- [ ] Test cancellation
- [ ] Verify usage limits don't change based on period
- [ ] Test archived resources on downgrade


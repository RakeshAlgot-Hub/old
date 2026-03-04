# Admin-Managed Subscription Plans & Coupons System

## Overview

The subscription system now uses **database-stored plans** that can be managed by administrators. This replaces hardcoded plan definitions and allows dynamic plan creation without code changes.

Both **Subscription Plans** and **Coupons** are now stored in MongoDB collections and can be managed via admin API endpoints.

---

## Architecture

### Collections

#### 1. **`plans` Collection** (NEW)
Stores all subscription plans with their features and pricing.

**Schema:**
```javascript
{
  "_id": ObjectId,
  "name": "pro",                     // Unique identifier
  "display_name": "Pro Plan",        // Human-readable name
  "description": "For growing businesses",
  "properties": 3,                   // Feature limits
  "tenants": 999,
  "rooms": 999,
  "staff": 999,
  "periods": {                       // Period -> Price mapping
    "1": 7900,                       // ₹79/month
    "3": 20000,                      // ₹200 for 3 months
    "6": 35000,
    "12": 60000
  },
  "is_active": true,                 // Availability flag
  "sort_order": 1,                   // Display order
  "created_at": ISODate,
  "updated_at": ISODate
}
```

**Indexes:**
- `name` (unique)
- `is_active`
- `sort_order`
- `created_at`

#### 2. **`coupons` Collection** (Already Exists)
Stores discount codes with usage tracking.

**Schema:**
```javascript
{
  "_id": ObjectId,
  "code": "SAVE50",
  "discount_type": "percentage",     // or "fixed"
  "discount_value": 50,              // 50% or ₹50
  "usage_limit": 100,
  "usage_count": 0,
  "min_amount": 5000,               // Minimum order amount (paise)
  "plan_restrictions": ["pro"],     // Applicable plans
  "expires_at": ISODate,
  "is_active": true,
  "created_at": ISODate
}
```

**Indexes:**
- `code` (unique)
- `is_active`
- `expires_at`
- `created_at`

---

## Backend Implementation

### Files Created/Modified

#### NEW FILES:
1. **`api/app/models/plan_schema.py`** - Plan data models
   - `PlanBase` - Base plan structure
   - `PlanCreate` - Creation schema
   - `PlanUpdate` - Update schema  
   - `Plan` - Full plan with DB fields
   - Validators for name and periods

2. **`api/app/services/plan_service.py`** - Plan management service
   - `create_plan()` - Create new plan
   - `get_plan_by_name()` - Fetch by name
   - `get_all_plans(active_only)` - List plans
   - `update_plan()` - Update existing plan
   - `delete_plan()` - Delete (with safety checks)
   - `activate_plan()` / `deactivate_plan()` - Toggle availability
   - `get_plan_price()` - Get period price
   - `get_available_periods()` - List periods
   - `create_default_plans()` - Initialize defaults
   - `get_plan_stats()` - Usage statistics

3. **`api/app/routes/plan.py`** - Admin API endpoints
   - `POST /admin/plans` - Create plan
   - `GET /admin/plans` - List all plans
   - `GET /admin/plans/stats` - Get statistics
   - `GET /admin/plans/{name}` - Get specific plan
   - `PATCH /admin/plans/{name}` - Update plan
   - `DELETE /admin/plans/{name}` - Delete plan (with safety)
   - `POST /admin/plans/{name}/activate` - Activate
   - `POST /admin/plans/{name}/deactivate` - Deactivate
   - `POST /admin/plans/initialize` - Create defaults

#### MODIFIED FILES:
1. **`api/app/services/subscription_service.py`**
   - Removed `DEFAULT_SUBSCRIPTION_PLANS` constant
   - Updated all methods to fetch plans from database
   - `get_subscription()` - Fetches free plan from DB
   - `update_subscription()` - Fetches plan data from DB
   - `get_all_plans()` - Now async, queries DB
   - `get_plan_limits()` - Now async, queries DB
   - `cancel_subscription()` - Fetches free plan from DB
   - `check_downgrade_eligibility()` - Fetches free plan from DB
   - `create_default_subscriptions()` - Fetches plans from DB

2. **`api/app/routes/subscription.py`**
   - Updated `get_all_plans()` route to await async call
   - Updated `get_limits()` route to await async call

3. **`api/app/main.py`**
   - Added `plan` router import
   - Registered `/admin/plans` router
   - Created indexes for `plans` collection

---

## Admin API Documentation

### Plan Management Endpoints

All endpoints require authentication. In production, add admin role check.

#### 1. Create New Plan
```http
POST /api/v1/admin/plans
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "starter",
  "display_name": "Starter Plan",
  "description": "Perfect for small property owners",
  "properties": 2,
  "tenants": 50,
  "rooms": 20,
  "staff": 3,
  "periods": {
    "1": 4900,    // ₹49/month
    "3": 12000,   // ₹120 for 3 months
    "6": 20000
  },
  "is_active": true,
  "sort_order": 1
}
```

**Response:**
```json
{
  "id": "65abc123...",
  "name": "starter",
  "display_name": "Starter Plan",
  "description": "Perfect for small property owners",
  "properties": 2,
  "tenants": 50,
  "rooms": 20,
  "staff": 3,
  "periods": {
    "1": 4900,
    "3": 12000,
    "6": 20000
  },
  "is_active": true,
  "sort_order": 1,
  "created_at": "2024-03-04T10:30:00",
  "updated_at": "2024-03-04T10:30:00"
}
```

#### 2. List All Plans
```http
GET /api/v1/admin/plans?active_only=false
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "name": "free",
    "display_name": "Free Plan",
    "properties": 1,
    "periods": {"0": 0},
    "is_active": true,
    ...
  },
  {
    "name": "pro",
    "display_name": "Pro Plan",
    "properties": 3,
    "periods": {
      "1": 7900,
      "3": 20000,
      "6": 35000,
      "12": 60000
    },
    "is_active": true,
    ...
  }
]
```

#### 3. Get Plan Statistics
```http
GET /api/v1/admin/plans/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_plans": 4,
  "active_plans": 3,
  "inactive_plans": 1,
  "usage_by_plan": {
    "free": 150,
    "pro": 45,
    "premium": 12
  }
}
```

#### 4. Update Plan
```http
PATCH /api/v1/admin/plans/pro
Content-Type: application/json
Authorization: Bearer <token>

{
  "periods": {
    "1": 8900,     // Update prices
    "3": 22000,
    "6": 38000,
    "12": 65000
  },
  "description": "Updated description"
}
```

**Response:** Updated plan object

#### 5. Activate/Deactivate Plan
```http
POST /api/v1/admin/plans/starter/activate
Authorization: Bearer <token>
```

```http
POST /api/v1/admin/plans/starter/deactivate
Authorization: Bearer <token>
```

**Response:** Updated plan object

#### 6. Delete Plan
```http
DELETE /api/v1/admin/plans/starter
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Plan 'starter' deleted successfully"
}
```

**Safety:** Cannot delete plans with active subscriptions

#### 7. Initialize Default Plans
```http
POST /api/v1/admin/plans/initialize
Authorization: Bearer <token>
```

Creates default free, pro, premium plans if `plans` collection is empty.

**Response:**
```json
{
  "success": true,
  "message": "Created 3 default plans",
  "plans_created": 3
}
```

---

## How It Works

### 1. Admin Setup (First Time)

```bash
# Step 1: Initialize default plans
curl -X POST https://api.example.com/api/v1/admin/plans/initialize \
  -H "Authorization: Bearer <admin_token>"

# Response: Creates free, pro, premium plans in database
```

### 2. Admin Creates Custom Plan

```bash
# Step 2: Create a custom plan
curl -X POST https://api.example.com/api/v1/admin/plans \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "enterprise",
    "display_name": "Enterprise",
    "description": "For large operations",
    "properties": 999,
    "tenants": 999,
    "rooms": 999,
    "staff": 999,
    "periods": {
      "1": 29900,
      "12": 300000
    },
    "is_active": true,
    "sort_order": 3
  }'
```

### 3. Property Owners See the Plans

When property owners access the subscription screen:
1. Frontend calls `GET /api/v1/subscription/plans`
2. Backend queries `plans` collection for active plans
3. Returns all active plans with period pricing
4. UI displays plans dynamically

### 4. Property Owner Subscribes

1. Selects plan (e.g., "enterprise")
2. Selects period (e.g., 12 months)
3. Optionally enters coupon code
4. Proceeds to payment
5. Subscription created with selected plan/period

---

## Benefits

### For Admins
✅ **Dynamic Pricing**: Change prices anytime without code deployment
✅ **Easy Plan Creation**: Add new plans via API or database
✅ **Usage Tracking**: See which plans are popular
✅ **A/B Testing**: Create temporary promotional plans
✅ **Seasonal Pricing**: Update prices for different seasons
✅ **Deactivation**: Hide plans without deleting data

### For Property Owners
✅ **More Options**: Access all admin-created plans
✅ **Transparent Pricing**: See all period options upfront
✅ **Flexible Billing**: Choose commitment that fits budget
✅ **Discount Codes**: Apply coupons for savings

### For Developers
✅ **No Code Changes**: Add plans via API/DB
✅ **Clean Architecture**: Separation of data and code
✅ **Type Safety**: Pydantic validation on all operations
✅ **Scalability**: Support unlimited plan variations

---

## Database Operations

### View All Plans (MongoDB)
```javascript
db.plans.find().pretty()
```

### Add Plan Manually (MongoDB)
```javascript
db.plans.insertOne({
  "name": "vip",
  "display_name": "VIP Plan",
  "description": "Exclusive features",
  "properties": 10,
  "tenants": 999,
  "rooms": 999,
  "staff": 999,
  "periods": {
    "1": 49900,   // ₹499/month
    "12": 500000  // ₹5000/year
  },
  "is_active": true,
  "sort_order": 4,
  "created_at": new Date(),
  "updated_at": new Date()
})
```

### Update Pricing (MongoDB)
```javascript
db.plans.updateOne(
  { "name": "pro" },
  { 
    "$set": {
      "periods": {
        "1": 9900,
        "3": 25000,
        "6": 45000,
        "12": 80000
      },
      "updated_at": new Date()
    }
  }
)
```

### Deactivate Plan (MongoDB)
```javascript
db.plans.updateOne(
  { "name": "old_plan" },
  { "$set": { "is_active": false, "updated_at": new Date() } }
)
```

### Check Plan Usage (MongoDB)
```javascript
db.subscriptions.aggregate([
  { "$match": { "status": "active" } },
  { "$group": { "_id": "$plan", "count": { "$sum": 1 } } }
])
```

---

## Coupon Management

Coupons are already in the database. Admin can manage via:

### Create Coupon (MongoDB)
```javascript
db.coupons.insertOne({
  "code": "SUMMER50",
  "discount_type": "percentage",
  "discount_value": 50,
  "usage_limit": 100,
  "usage_count": 0,
  "min_amount": 10000,              // ₹100 minimum
  "plan_restrictions": ["pro", "premium"],
  "expires_at": new Date("2026-08-31"),
  "is_active": true,
  "created_at": new Date()
})
```

### Existing Coupon Endpoints
```http
POST /api/v1/coupons                    # Create coupon
GET /api/v1/coupons                     # List all
GET /api/v1/coupons/{code}              # Get specific
PATCH /api/v1/coupons/{code}            # Update
DELETE /api/v1/coupons/{code}           # Delete
POST /coupons/validate                  # Validate (public)
POST /coupons/apply                     # Apply (public)
```

---

## Usage Examples

### Example 1: Add New "Business" Plan

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/admin/plans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "business",
    "display_name": "Business Plan",
    "description": "For medium-sized operations",
    "properties": 5,
    "tenants": 999,
    "rooms": 999,
    "staff": 999,
    "periods": {
      "1": 19900,
      "3": 50000,
      "6": 90000,
      "12": 150000
    },
    "is_active": true,
    "sort_order": 2
  }'
```

**Result:**
- Plan immediately available in `GET /subscription/plans`
- Property owners can select it in UI
- No frontend or backend code changes needed

### Example 2: Update Pro Plan Pricing

**Via API:**
```bash
curl -X PATCH http://localhost:8000/api/v1/admin/plans/pro \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "periods": {
      "1": 9900,
      "3": 25000,
      "6": 45000,
      "12": 80000
    }
  }'
```

**Result:**
- New pricing reflected immediately
- Existing subscriptions unaffected (grandfathered)
- New subscriptions use new pricing

### Example 3: Create Limited-Time Plan

**Via API:**
```bash
# Create plan
curl -X POST http://localhost:8000/api/v1/admin/plans \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "flash_sale",
    "display_name": "Flash Sale - 50% Off",
    "properties": 3,
    "tenants": 999,
    "rooms": 999,
    "staff": 999,
    "periods": {"1": 3950},
    "is_active": true,
    "sort_order": 0
  }'

# Later: Deactivate
curl -X POST http://localhost:8000/api/v1/admin/plans/flash_sale/deactivate \
  -H "Authorization: Bearer <token>"
```

---

## Admin Workflow

### Initial Setup
1. Deploy backend with updated code
2. Call `POST /admin/plans/initialize` to create default plans
3. Verify plans created: `GET /admin/plans`
4. Plans now visible to all users

### Creating New Plan
1. Design plan features and pricing
2. Call `POST /admin/plans` with plan data
3. Verify creation: `GET /admin/plans/{name}`
4. Plan immediately available to users

### Updating Pricing
1. Call `PATCH /admin/plans/{name}` with new periods
2. Changes take effect immediately
3. Check stats: `GET /admin/plans/stats`

### Managing Plan Lifecycle
1. Create plan with `is_active: true`
2. Monitor usage via stats endpoint
3. Deactivate when needed (doesn't affect existing users)
4. Delete only if no active subscriptions

---

## Safety Features

### Plan Deletion Protection
```python
# Cannot delete if active subscriptions exist
DELETE /admin/plans/pro
→ Error: "Cannot delete plan 'pro'. 45 active subscription(s) are using this plan"
```

**Recommendation:** Deactivate instead of delete

### Free Plan Protection
```python
# Cannot deactivate free plan
POST /admin/plans/free/deactivate
→ Error: "Cannot deactivate the 'free' plan"
```

### Period Validation
```python
# Creating plan with invalid periods
{
  "periods": {
    "0": 1000  # Error: Period 0 must have price 0
  }
}
→ ValidationError
```

---

## Migration Guide

### For Existing Systems

#### Step 1: Deploy Updated Code
Deploy all backend files (models, services, routes)

#### Step 2: Create Plans Collection
```bash
curl -X POST http://localhost:8000/api/v1/admin/plans/initialize
```

This creates:
- Free plan (1 property, period 0)
- Pro plan (3 properties, 1/3/6/12 months)
- Premium plan (5 properties, 1/3/6/12 months)

#### Step 3: Verify Plans
```bash
curl http://localhost:8000/api/v1/subscription/plans
```

Should return all plans with period options.

#### Step 4: Test Subscription Flow
1. User views plans (should show 3 plans)
2. User selects plan + period
3. User enters coupon (optional)
4. User completes payment
5. Subscription updated with correct plan/period

### No Data Migration Needed
- Existing subscriptions continue working
- Plans fetched from DB on-demand
- Fallback to default values if plan not found

---

## Best Practices

### 1. Plan Naming
- Use lowercase, no spaces (e.g., "pro", "business", "enterprise")
- Keep names short and memorable
- Don't change plan names (create new instead)

### 2. Pricing Strategy
- Always offer multiple periods
- Provide discounts for longer commitments
- Example: 1mo=₹79, 3mo=₹66/mo, 12mo=₹50/mo (37% savings)

### 3. Plan Lifecycle
```
Create → Test → Activate → Monitor → Deactivate → Archive
```

- Test plans first with `is_active: false`
- Activate when ready for users
- Monitor usage via stats endpoint
- Deactivate instead of deleting
- Keep for historical data

### 4. Feature Limits
- Use 999 for "unlimited" features
- Set realistic limits for paid plans
- Free plan should have minimal limits
- Consider resource costs when setting limits

### 5. Sort Order
```
0 = Featured (e.g., limited-time offers)
1 = Free
2 = Basic paid
3 = Mid-tier
4 = Premium
...
```

---

## Troubleshooting

### Issue: "Plan not found"
**Check:**
```javascript
db.plans.findOne({ "name": "plan_name" })
```

**Fix:** Create plan or activate it

### Issue: "No plans available"
**Check:**
```javascript
db.plans.countDocuments({ "is_active": true })
```

**Fix:**
```bash
POST /admin/plans/initialize
```

### Issue: "Cannot delete plan"
**Check:**
```javascript
db.subscriptions.countDocuments({ "plan": "plan_name", "status": "active" })
```

**Fix:** Deactivate instead of delete

### Issue: "Plans not showing in UI"
**Check:**
1. Backend returns data: `GET /subscription/plans`
2. Is plan active: `db.plans.findOne({ "name": "x" })`
3. Check network tab for errors

---

## Security Considerations

### Authentication
- All admin endpoints require `get_current_user` dependency
- TODO: Add `require_admin_role` middleware in production

### Validation
- Pydantic validators on plan creation
- Period validation (0 must be free)
- Price validation (non-negative)
- Name uniqueness enforced

### Safety Checks
- Cannot delete plans with active users
- Cannot deactivate free plan
- Usage tracking prevents overuse

---

## Performance Considerations

### Database Queries
- Indexes on `name` (unique) for fast lookups
- Index on `is_active` for filtering
- Index on `sort_order` for display ordering

### Caching
- Plans change infrequently
- Consider caching `get_all_plans()` result
- Invalidate cache on plan updates

### Scalability
- MongoDB aggregation for stats
- Efficient queries with proper indexes
- Async operations throughout

---

## Future Enhancements

### Phase 2 Ideas
- [ ] Plan versioning (grandfathering old users)
- [ ] Dynamic feature flags per plan
- [ ] Usage-based pricing tiers
- [ ] Plan upgrade paths (forced order)
- [ ] Trial periods support
- [ ] Promotional pricing events
- [ ] Plan recommendation engine
- [ ] Custom plans for enterprise

### Admin UI (Future)
- Dashboard showing plan stats
- Visual plan editor
- Pricing calculator
- Usage analytics
- Drag-and-drop plan ordering

---

## Testing Checklist

### Backend Testing
- [ ] Create plan via API
- [ ] List plans with/without active filter
- [ ] Get specific plan by name
- [ ] Update plan pricing
- [ ] Activate/deactivate plan
- [ ] Delete plan (verify safety check)
- [ ] Initialize defaults (verify idempotency)
- [ ] Get plan stats
- [ ] Subscription uses DB plans correctly
- [ ] Create subscription with DB plans

### Integration Testing
- [ ] User sees plans from DB
- [ ] User subscribes to DB plan
- [ ] Period pricing correct
- [ ] Coupon works with DB plan
- [ ] Update subscription persists period
- [ ] Cancel returns to DB free plan

### Edge Cases
- [ ] Plan with only one period
- [ ] Plan with non-standard periods
- [ ] Very high/low prices
- [ ] Special characters in plan name
- [ ] Concurrent plan updates
- [ ] Delete plan with users (should fail)

---

## Summary

### What Changed
- ❌ **OLD**: Plans hardcoded in `DEFAULT_SUBSCRIPTION_PLANS`
- ✅ **NEW**: Plans stored in MongoDB `plans` collection

### Admin Control
- Create/update/delete plans via API
- Change pricing without code deployment
- Activate/deactivate plans dynamically
- Monitor plan usage statistics

### Property Owner Experience
- No changes required
- Sees all active plans
- Plans update automatically
- Same subscription flow

### Developer Experience
- Cleaner code architecture
- Database-driven configuration
- Easy to add new plans
- Better testing capabilities

---

**Status:** ✅ COMPLETE
**Date:** March 4, 2026
**Version:** 2.0 - Database-Driven Plans

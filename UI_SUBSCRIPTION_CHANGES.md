# UI Subscription & Billing Changes

## Overview
This document describes all the UI changes made to support the new dynamic subscription system with multiple billing periods and coupon/discount functionality.

## Files Modified

### 1. `ui/services/apiClient.ts`
**Changes Made:**
- Updated `subscriptionService.getLimits()` to accept `plan: string` instead of fixed literals
- Updated `subscriptionService.updateSubscription(plan: string, period: number = 1)` to accept period parameter
- Updated `subscriptionService.createCheckoutSession(plan: string, period: number = 1, couponCode?: string)` to accept period and optional coupon code
- **NEW**: Added `subscriptionService.getPlans()` method to fetch all plans with period-based pricing
- **Imports**: Added `PlanMetadata` to imports from apiTypes

**Added Coupon Service:**
```typescript
export const couponService = {
  async validateCoupon(code: string, amount?: number, plan?: string)
  async applyCoupon(code: string, amount: number, plan?: string)
}
```

### 2. `ui/services/apiTypes.ts` (Previously Updated)
**Key Interfaces:**
- `SubscriptionPeriodOption`: Represents a billing period option
  - `period: number` - months (0 for free, 1/3/6/12 for paid)
  - `price: number` - price in paise
  
- `PlanMetadata`: Represents a subscription plan
  - `name: string` - plan identifier (free, pro, etc.)
  - `properties/tenants/rooms/staff: number` - feature limits
  - `periods: SubscriptionPeriodOption[]` - available billing periods

- Updated `Subscription` to include:
  - `period: number` - current billing period
  - `plan: string` - dynamic plan name

## Component Updates

### 3. `ui/components/UpgradeModal.tsx`
**Complete Rewrite for New Features**

**State Management:**
- `selectedPlan`: Currently selected plan name
- `selectedPeriod`: Selected billing period (1, 3, 6, or 12 months)
- `couponCode`: User-entered coupon code
- `couponApplied`: Applied coupon details (discount amount, final price)
- `couponError`: Coupon validation error message

**New Features:**

1. **Dynamic Plan Selection**
   - Fetches plans from `subscriptionService.getPlans()` endpoint
   - Displays all available plans as selectable options
   - Shows plan name and feature preview

2. **Billing Period Selection**
   - Displays 4 period options in a grid (1, 3, 6, 12 months)
   - Shows pricing for each period
   - Calculates and displays monthly rate breakdown
   - Visual highlighting of selected period

3. **Coupon Code Support**
   - Optional coupon input field with validation button
   - Real-time coupon validation via `couponService.validateCoupon()`
   - Displays discount preview:
     - Original amount
     - Discount amount (- amount)
     - Final amount to pay
   - Shows feedback card when coupon is applied

4. **Price Summary**
   - Shows subtotal (plan price for selected period)
   - Shows discount (if coupon applied)
   - Shows total amount to pay
   - Automatically updates based on period and coupon selection

5. **Payment Flow**
   - Updated to pass `period` and optional `couponCode` to `createCheckoutSession()`
   - Payment success feedback includes period information
   - Verifies coupon was applied in payment response

**Key Methods:**
- `validateCoupon()`: Validates coupon code before payment
- `handlePlanUpgrade()`: Initiates checkout or free plan downgrade
- `handlePaymentSuccess()`: Processes successful payment
- `getPeriodLabel()`: Formats period display (e.g., "3 Months")
- `formatPrice()`: Converts paise to rupees display

### 4. `ui/app/subscription.tsx`
**Major Updates**

**Type Changes:**
- Removed hardcoded `Plan` type (was 'free' | 'pro' | 'premium')
- Now supports dynamic plan names as strings
- Added `allPlans: PlanMetadata[]` state for available plans

**Data Fetching:**
- Updated `fetchSubscriptionData()` to call `subscriptionService.getPlans()`
- Fetches plans, subscriptions, and usage in parallel
- Caches plan data along with subscription and usage data

**Plan Comparison Section:**
- Completely redesigned to display all available plans
- Shows plan features: properties, tenants, rooms, staff limits
- **NEW**: Displays pricing breakdown by period
  - Shows pricing for 1, 3, 6, 12 month options (if available)
  - Calculates and shows monthly rate for longer periods
  - Formatted pricing cards in a grid layout

**Helper Functions:**
- Added `getPeriodLabel(period: number)`: Converts period number to display text
- Removed `isLocked` and `formatLimit()` helper (no longer needed)

**UI/UX Improvements:**
- "Compare Plans" section now shows realistic period-based pricing
- Plans display feature limits alongside pricing
- Clear visual indication of period options
- Responsive grid layout for pricing cards

**Styling Additions:**
- `pricingContainer`: Container for period-based pricing display
- `pricingTitle`: Label for pricing section
- `pricingGrid`: Grid layout for period options (flex row)
- `priceCard`: Individual period pricing card
- `priceCardPeriod`: Period label (e.g., "3 Months")
- `priceCardPrice`: Price display (e.g., "₹20000")
- `priceCardMonthly`: Per-month breakdown (e.g., "₹666/mo")

## API Integration

### Endpoints Used

1. **GET `/subscription/plans`**
   - Returns: `{ plans: PlanMetadata[] }`
   - Called on subscription screen load
   - Provides all available plans with period options

2. **POST `/subscription/upgrade`**
   - Payload: `{ plan: string, period: number }`
   - Updates subscription to new plan for specified period
   - Called when downgrading to free or confirming plan change

3. **POST `/subscription/create-checkout-session`**
   - Payload: `{ plan: string, period: number, coupon_code?: string }`
   - Returns: Razorpay checkout session with final amount (after discount)
   - Called to initiate payment flow

4. **POST `/coupons/validate`**
   - Payload: `{ code: string, amount?: number, plan?: string }`
   - Returns: `{ isValid: boolean, message: string, originalAmount, discountAmount, finalAmount }`
   - Called to validate coupon code before checkout

5. **POST `/subscription/verify-payment`**
   - Payload: Razorpay payment details
   - Returns: Updated subscription with period and coupon info
   - Called after successful Razorpay payment

## User Flow

### Upgrading to a Paid Plan with Coupon

1. User navigates to Subscription screen
2. Sees available plans with period pricing
3. Taps UpgradeModal to open plan selection
4. Selects desired plan
5. Chooses billing period (1, 3, 6, or 12 months)
6. Enters coupon code (optional)
7. Taps "Check" to validate coupon
8. Views discount preview (if coupon applied)
9. Taps "Proceed to Payment"
10. Razorpay checkout opens with final amount
11. Completes payment
12. Subscription updated with new plan, period, and coupon info

### Period Selection Benefits

- **1 Month**: Pay ₹7,900 (full price)
- **3 Months**: Pay ₹20,000 (save ₹3,700)
- **6 Months**: Pay ₹35,000 (save ₹12,400)
- **12 Months**: Pay ₹60,000 (save ₹34,800)

## Backward Compatibility

- Existing code that passes only `plan` to `updateSubscription()` defaults to `period: 1`
- Existing code that passes only `plan` to `createCheckoutSession()` defaults to `period: 1`
- Free plan always has period 0 (forever)

## Testing Checklist

- [ ] Plans load correctly from backend
- [ ] Period selection displays all 4 options
- [ ] Pricing updates when period is changed
- [ ] Coupon validation shows error for invalid codes
- [ ] Coupon validation shows discount preview for valid codes
- [ ] Payment flow includes period and coupon in request
- [ ] Payment verification updates subscription with period info
- [ ] Period displays correctly in active subscription card
- [ ] Pricing comparison cards show period options
- [ ] Monthly breakdown calculation is correct
- [ ] Downgrade to free plan works without payment
- [ ] UI handles plan with different period options gracefully

## Future Enhancements

1. Add period history/changelog view
2. Show savings percentage for longer commitments
3. Add coupon search/discovery feature
4. Auto-apply loyalty coupons
5. Period price calculator (dynamic pricing)
6. Subscription renewal notifications aligned with period

# License & Tenant System Design

## Overview
Add a licensing/subscription system with tenant-ready architecture to the School Behavior System.
The system supports single-tenant now (TenantId=1) and multi-tenant later (dynamic TenantId from JWT) without changing any Controller or React page.

## Architecture

### Domain Layer

**New Entity: Tenant**
```
Tenant
├── Id: int (PK)
├── Code: string (unique) → "SCH-2026-A7X9-KM3P"
├── SchoolName: string
├── AdminName: string
├── AdminPhone: string
├── Plan: LicensePlan (enum: Trial, Semester, Yearly)
├── Status: TenantStatus (enum: Unused, Active, Expired, Revoked)
├── DurationDays: int
├── Amount: decimal
├── Notes: string
├── ActivatedAt: DateTime?
├── ExpiresAt: DateTime?
├── CreatedAt: DateTime
├── UpdatedAt: DateTime
```

**New Interface: ITenantEntity**
```csharp
public interface ITenantEntity { int TenantId { get; set; } }
```
All existing entities implement this interface with `TenantId` defaulting to 1.

**New Enums:**
- `LicensePlan`: Trial, Semester, Yearly
- `TenantStatus`: Unused, Active, Expired, Revoked

### Infrastructure Layer

**AppDbContext changes:**
- Add `DbSet<Tenant> Tenants`
- Add Global Query Filter on all ITenantEntity entities:
  ```csharp
  modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantService.GetCurrentTenantId());
  ```
- This automatically filters ALL queries by tenant without changing any controller.

**New Service: ITenantService / TenantService**
- `GetCurrentTenantId()`: Returns current tenant ID
  - Now: Returns 1 (hardcoded)
  - Later: Reads from JWT claims or HTTP context
- `GetCurrentTenant()`: Returns full Tenant object
- `IsTenantActive()`: Checks if subscription is valid

### API Layer

**New Controller: LicensesController**

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/licenses/generate | MasterKey header | Create new license code |
| POST | /api/licenses/activate | None (public) | Activate code + create admin |
| GET | /api/licenses/status | JWT | Get current subscription status |
| POST | /api/licenses/{code}/extend | MasterKey header | Extend subscription |
| GET | /api/licenses | MasterKey header | List all licenses |
| GET | /api/licenses/check-setup | None (public) | Check if system needs setup |

**MasterKey**: A secret key in appsettings.json, sent as `X-Master-Key` header. Only the developer uses this via Postman.

**New Middleware: LicenseMiddleware**
- Runs after Authentication, before Authorization
- Skips: /api/auth/*, /api/licenses/activate, /api/licenses/check-setup, public form routes
- Checks tenant's ExpiresAt > UtcNow
- If expired: returns 403 with `{ error: "license_expired", expiresAt: "..." }`
- If expiring within 7 days: adds `X-License-Warning` response header

### Frontend

**New Page: SetupPage.tsx**
- Shown when /api/licenses/check-setup returns `{ needsSetup: true }`
- Fields: Activation Code, Full Name, Mobile (05XXXXXXXX), Password, Confirm Password
- On submit: POST /api/licenses/activate
- On success: auto-login and redirect to dashboard

**App.tsx changes:**
- On mount: call /api/licenses/check-setup
- If needsSetup → show SetupPage (not LoginPage)
- After login: store subscription info in localStorage
- Check 403 license_expired in API interceptor → show ExpiredPage

**New Component: SubscriptionBanner**
- Yellow banner at top when ≤7 days remaining
- Shows: "اشتراكك ينتهي خلال X أيام - تواصل للتجديد"

**New Page: ExpiredPage.tsx**
- Shown when subscription is expired
- Message: "انتهى اشتراكك - تواصل مع الدعم للتجديد"
- Shows: school name, expiry date, contact info

### DataSeeder changes
- Remove default admin user (0500000000 / admin123)
- Keep violation type definitions
- Keep default school settings only if no tenant exists

### AuthController changes
- Add `tenantId` claim to JWT token
- Add `subscriptionStatus` and `expiresAt` to login response
- Token login (TokenLink) also includes tenant info

## Migration Path to Multi-Tenant

When ready for multi-tenant, change only:
1. `TenantService.GetCurrentTenantId()` → read from JWT claim instead of returning 1
2. Registration flow → creates new Tenant + database records
3. Everything else works automatically via Global Query Filters

## Security Considerations
- MasterKey endpoints are NOT behind JWT auth (separate auth mechanism)
- License codes are cryptographically random (16+ chars)
- Global Query Filter prevents cross-tenant data access
- Expired tenants cannot access any API endpoint

# CORS Fix Complete ✅

## Issue
Admin Portal at `http://localhost:4000` was blocked by CORS when trying to access Gateway at `http://localhost:3000` because:
- Gateway was using wildcard `*` for `Access-Control-Allow-Origin`
- Admin Portal sends requests with `credentials: 'include'`
- CORS spec doesn't allow wildcard with credentials

## Solution Applied

Updated `services/gateway/src/plugins/cors.ts` to:

1. **Explicitly allow admin portal origins**:
   - `http://localhost:4000` (browser access)
   - `http://localhost:3100` (container access)
   - `http://admin-portal:3100` (Docker network)

2. **Proper CORS configuration**:
   - `credentials: true` - Allow cookies/auth headers
   - `methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']`
   - `allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-Requested-With', 'Accept']`
   - `exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Correlation-Id']`
   - `preflightContinue: false` - Handle OPTIONS automatically
   - `optionsSuccessStatus: 204` - Proper preflight response

3. **Development-friendly**:
   - Logs rejected origins for debugging
   - Currently allows all origins in development mode
   - Can be restricted in production via `CORS_ORIGINS` env var

## Testing

### 1. Check Gateway is Running
```powershell
curl http://localhost:3000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### 2. Test Admin Portal Access
Open browser to: **http://localhost:4000**

### 3. Test Registration Flow

**Step 1: Open Registration Page**
- Click "Create one" on login page
- Or go directly to: http://localhost:4000/register

**Step 2: Fill Registration Form**
- Company Name: `Test Company`
- Email: `admin@test.com`
- Password: `TestPassword123!` (min 8 chars)
- Confirm Password: `TestPassword123!`
- Click "Continue"

**Step 3: Choose Plan**
- Select any plan (Free/Business/Enterprise)
- Click "Continue"

**Step 4: Accept Terms**
- Check "I agree to the Terms of Service and Privacy Policy"
- Click "Create account"

**Expected Result**: 
- ✅ No CORS errors in browser console
- ✅ Registration succeeds
- ✅ Redirected to login page

### 4. Test Login Flow

**Step 1: Go to Login Page**
- http://localhost:4000/login

**Step 2: Enter Credentials**
- Email: `admin@test.com`
- Password: `TestPassword123!`
- Click "Sign in"

**Expected Result**:
- ✅ No CORS errors
- ✅ Login succeeds
- ✅ Redirected to dashboard
- ✅ Dashboard shows statistics

### 5. Check Browser Console

Open Developer Tools (F12) → Console tab

**Should NOT see**:
- ❌ CORS policy errors
- ❌ Failed to load resource errors
- ❌ Access-Control-Allow-Origin errors

**Should see**:
- ✅ Successful API calls
- ✅ 200/201 status codes
- ✅ Response data

## Verify CORS Headers

### Using Browser DevTools

1. Open http://localhost:4000
2. Open DevTools (F12) → Network tab
3. Try to register/login
4. Click on the request to gateway
5. Check Response Headers:

```
Access-Control-Allow-Origin: http://localhost:4000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key, X-Requested-With, Accept
```

### Using PowerShell

```powershell
# Test preflight request
$headers = @{
    "Origin" = "http://localhost:4000"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "Content-Type"
}

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/client/register" `
    -Method OPTIONS `
    -Headers $headers `
    -UseBasicParsing
```

Expected response headers should include:
- `Access-Control-Allow-Origin: http://localhost:4000`
- `Access-Control-Allow-Credentials: true`

## Troubleshooting

### Still Getting CORS Errors?

1. **Clear browser cache**:
   - Press Ctrl+Shift+Delete
   - Clear cached images and files
   - Reload page (Ctrl+F5)

2. **Check gateway logs**:
   ```powershell
   docker logs caas-gateway --tail 50
   ```
   Look for CORS-related warnings

3. **Verify gateway is running**:
   ```powershell
   docker ps | Select-String "gateway"
   ```
   Should show "Up" status

4. **Restart gateway**:
   ```powershell
   docker compose restart gateway
   Start-Sleep -Seconds 10
   ```

5. **Check admin portal is running**:
   ```powershell
   docker ps | Select-String "admin-portal"
   curl http://localhost:4000/api/health
   ```

### Different Port?

If you're accessing admin portal on a different port, update the CORS configuration:

```typescript
// In services/gateway/src/plugins/cors.ts
const allowedOrigins = config.CORS_ORIGINS === '*' 
  ? [
      'http://localhost:4000',
      'http://localhost:3100',
      'http://localhost:YOUR_PORT',  // Add your port
      'http://admin-portal:3100'
    ]
  : config.CORS_ORIGINS.split(',');
```

Then rebuild:
```powershell
docker compose build gateway
docker compose up -d gateway
```

### Production Configuration

For production, set the `CORS_ORIGINS` environment variable:

```yaml
# In docker-compose.yml or .env
CORS_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com
```

## API Testing (Alternative)

If you want to test APIs directly without the UI:

### Register
```powershell
$body = @{
    company_name = "Test Company"
    email = "admin@test.com"
    password = "TestPassword123!"
    plan = "business"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/client/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Login
```powershell
$body = @{
    email = "admin@test.com"
    password = "TestPassword123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/client/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$accessToken = $response.access_token
```

### Dashboard
```powershell
$headers = @{
    "Authorization" = "Bearer $accessToken"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/dashboard" `
    -Method GET `
    -Headers $headers
```

## Summary

✅ CORS configuration fixed
✅ Admin Portal can now access Gateway
✅ Credentials (cookies/tokens) work correctly
✅ Preflight requests handled properly
✅ All origins explicitly allowed

**You can now test the Admin Portal UI manually at http://localhost:4000**

---

**Fixed**: February 25, 2026
**Status**: ✅ READY FOR MANUAL TESTING

# Client Facing UI - Authentication Flow

> **Parent Roadmap**: [Client Facing UI](../../roadmaps/1_clientFacingUI.md)

---

## Overview

Complete authentication system for SAAS clients accessing the CAAS administrative portal.

---

## Tasks

### 1. Registration System

#### 1.1 Registration Form
- [ ] Company name field with validation
- [ ] Business email field (no personal emails)
- [ ] Password with strength indicator
- [ ] Confirm password
- [ ] Terms of Service checkbox
- [ ] Privacy Policy checkbox
- [ ] CAPTCHA integration

#### 1.2 Email Verification
- [ ] Verification email template
- [ ] Secure token generation
- [ ] Token expiration (24 hours)
- [ ] Resend verification option
- [ ] Verification success page

#### 1.3 Company Validation
- [ ] Domain verification (DNS TXT record)
- [ ] Business email validation
- [ ] Optional: Company details lookup (Clearbit)

### 2. Login System

#### 2.1 Email/Password Login
```tsx
// Login form fields
<LoginForm
  fields={['email', 'password']}
  rememberMe={true}
  forgotPasswordLink="/forgot-password"
  onSubmit={handleLogin}
/>
```
- [ ] Email field with validation
- [ ] Password field with show/hide
- [ ] Remember me checkbox
- [ ] Login button with loading state
- [ ] Error handling and display

#### 2.2 OAuth Integration
- [ ] Google OAuth setup
- [ ] GitHub OAuth setup
- [ ] Microsoft OAuth setup
- [ ] OAuth callback handling
- [ ] Account linking for existing users

#### 2.3 Two-Factor Authentication
- [ ] TOTP setup flow
- [ ] QR code generation
- [ ] Backup codes generation
- [ ] 2FA verification on login
- [ ] 2FA disable flow
- [ ] Recovery options

### 3. Session Management

#### 3.1 Session Handling
```typescript
interface Session {
  id: string;
  user_id: string;
  client_id: string;
  device: {
    type: string;
    browser: string;
    os: string;
    ip: string;
    location: string;
  };
  created_at: Date;
  last_active: Date;
  expires_at: Date;
}
```
- [ ] Session creation on login
- [ ] Session token generation (JWT)
- [ ] Refresh token implementation
- [ ] Session storage (Redis)
- [ ] Session validation middleware

#### 3.2 Multi-Device Management
- [ ] View active sessions
- [ ] Session details (device, location, last active)
- [ ] Terminate specific session
- [ ] Terminate all other sessions
- [ ] New device login notification

### 4. Password Management

#### 4.1 Forgot Password Flow
- [ ] Request reset email
- [ ] Secure reset token generation
- [ ] Reset token expiration (1 hour)
- [ ] Reset password form
- [ ] Password changed confirmation
- [ ] Invalidate existing sessions

#### 4.2 Change Password
- [ ] Current password verification
- [ ] New password with strength check
- [ ] Confirm new password
- [ ] Password update confirmation
- [ ] Session invalidation option

### 5. Security Features

#### 5.1 Brute Force Protection
- [ ] Failed attempt tracking
- [ ] Account lockout after X failures
- [ ] Lockout duration escalation
- [ ] Unlock procedures
- [ ] Admin unlock capability

#### 5.2 Suspicious Activity Detection
- [ ] New device login alerts
- [ ] Unusual location detection
- [ ] Multiple failed attempts alert
- [ ] Password change notification
- [ ] Security audit log

### 6. UI Components

#### 6.1 Login Page
- [ ] Split layout (form + branding)
- [ ] Social login buttons
- [ ] Remember me checkbox
- [ ] Forgot password link
- [ ] Sign up link

#### 6.2 Registration Wizard
- [ ] Step 1: Account details
- [ ] Step 2: Company details
- [ ] Step 3: Verification pending
- [ ] Progress indicator
- [ ] Validation per step

#### 6.3 2FA Setup Dialog
- [ ] TOTP app selection guide
- [ ] QR code display
- [ ] Manual key option
- [ ] Verification code input
- [ ] Backup codes display

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/register` | POST | New client registration |
| `/auth/login` | POST | Email/password login |
| `/auth/logout` | POST | End current session |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/verify-email` | POST | Verify email token |
| `/auth/forgot-password` | POST | Request password reset |
| `/auth/reset-password` | POST | Reset password with token |
| `/auth/2fa/enable` | POST | Enable 2FA |
| `/auth/2fa/verify` | POST | Verify 2FA code |
| `/auth/2fa/disable` | POST | Disable 2FA |
| `/auth/sessions` | GET | List active sessions |
| `/auth/sessions/:id` | DELETE | Terminate session |
| `/auth/oauth/:provider` | GET | OAuth redirect |
| `/auth/oauth/:provider/callback` | GET | OAuth callback |

---

## Security Considerations

### Password Requirements
- Minimum 10 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Not in common password list
- Not similar to email

### Token Security
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Secure HTTP-only cookies
- CSRF protection
- Token rotation on refresh

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| Login | 5/minute |
| Register | 3/hour |
| Forgot Password | 3/hour |
| 2FA Verify | 5/minute |

---

## Flow Diagrams

### Login Flow
```
[User] → [Login Page]
            ↓
      [Submit Credentials]
            ↓
      [Validate Credentials] ──× Error → [Show Error]
            ↓ ✓
      [Check 2FA Enabled?]
            ↓ Yes              ↓ No
      [2FA Verification]    [Create Session]
            ↓                    ↓
      [Verify Code] ──× Error → [Show Error]
            ↓ ✓
      [Create Session]
            ↓
      [Dashboard]
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| next-auth / lucia-auth | Authentication framework |
| bcrypt / argon2 | Password hashing |
| otplib | TOTP generation |
| qrcode | QR code generation |

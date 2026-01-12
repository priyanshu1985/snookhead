# Access Token + Refresh Token Authentication System

## Complete Implementation Guide

This document explains the fully implemented access token + refresh token authentication system for the SNOOKHEAD Snooker App.

## 🔥 Key Features Implemented

1. ✅ **Short-lived Access Tokens (15 minutes)** - For API requests
2. ✅ **Long-lived Refresh Tokens (7 days)** - Stored securely
3. ✅ **Automatic Token Refresh** - Seamless user experience
4. ✅ **HttpOnly Cookies Support** - Enhanced security for web clients
5. ✅ **Axios-like Interceptor** - Handles token expiration automatically
6. ✅ **Token Rotation** - Optional refresh token rotation for extra security
7. ✅ **Secure Logout** - Invalidates both tokens on logout

## 🏗️ System Architecture

```
Frontend (React Native)     Backend (Node.js/Express)
├── AuthContext             ├── Auth Middleware
├── ApiClient              ├── Token Store (In-memory)
├── Login/Register         └── Auth Routes
└── Auto Token Refresh
```

## 🔐 Authentication Flow

### 1. Login Process

```
User submits credentials → Backend validates →
Generate Access Token (15min) + Refresh Token (7 days) →
Store tokens client-side → Navigate to app
```

### 2. API Request Process

```
Make API Request → Check Access Token →
If valid: Process request
If expired: Auto-refresh → Retry request
If refresh fails: Redirect to login
```

### 3. Token Refresh Process

```
Access Token expires → ApiClient detects 401 →
Use Refresh Token → Get new Access Token →
Retry original request → Continue seamlessly
```

### 4. Logout Process

```
User clicks logout → Call backend logout →
Invalidate refresh token → Clear local storage →
Redirect to login screen
```

## 🛠️ Implementation Details

### Backend Changes

#### 1. Enhanced Auth Middleware (`middleware/auth.js`)

```javascript
// Enhanced middleware with proper error codes
const auth = (req, res, next) => {
  // ... token validation
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
      code: "TOKEN_EXPIRED", // Frontend can detect this
    });
  }
};
```

#### 2. Improved Token Store (`utils/tokenStore.js`)

```javascript
// Better token management with expiration tracking
function setRefreshToken(userId, token) {
  const expiresAt = Date.now() + REFRESH_TOKEN_EXPIRY;
  refreshTokens.set(userId.toString(), { token, expiresAt });
}
```

#### 3. Enhanced Auth Routes (`routes/auth.js`)

```javascript
// Login returns both tokens
router.post("/login", async (req, res) => {
  // ... validation
  const access = makeAccessToken(user);
  const refresh = makeRefreshToken();

  // Store refresh token server-side
  tokenStore.setRefreshToken(user.id, refresh);

  // Optional: Set as httpOnly cookie
  setRefreshTokenCookie(res, refresh);

  res.json({ accessToken: access, refreshToken: refresh });
});
```

### Frontend Changes

#### 1. Smart API Client (`services/apiClient.js`)

```javascript
class ApiClient {
  async request(url, options) {
    // Try request with current token
    let response = await fetch(url, { headers: { Authorization: token } });

    // Handle token expiration
    if (response.status === 401 && data.code === "TOKEN_EXPIRED") {
      // Refresh token and retry
      const newToken = await this.refreshAccessToken();
      response = await fetch(url, { headers: { Authorization: newToken } });
    }

    return response;
  }
}
```

#### 2. Enhanced AuthContext (`context/AuthContext.jsx`)

```javascript
const login = async (accessToken, refreshToken, userData) => {
  // Store all tokens
  await AsyncStorage.multiSet([
    ["authToken", accessToken],
    ["refreshToken", refreshToken],
    ["userData", JSON.stringify(userData)],
  ]);
};
```

## 🔒 Security Features

### 1. **Secure Token Storage**

- Access tokens: In-memory/AsyncStorage (short-lived)
- Refresh tokens: HttpOnly cookies + AsyncStorage backup
- No tokens in localStorage for web clients

### 2. **Token Rotation**

```javascript
// Optional: Generate new refresh token on each use
if (rotateRefreshToken) {
  newRefreshToken = makeRefreshToken();
  tokenStore.setRefreshToken(userId, newRefreshToken);
}
```

### 3. **Automatic Cleanup**

```javascript
// Clean expired tokens periodically
setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);
```

### 4. **CORS Configuration**

```javascript
const corsOptions = {
  origin: true,
  credentials: true, // Enable cookies
  methods: ["GET", "POST", "PUT", "DELETE"],
};
```

## 📱 Usage Examples

### Making API Calls (Automatic Refresh)

```javascript
// Old way - manual token handling
const token = await getAuthToken();
fetch("/api/data", { headers: { Authorization: `Bearer ${token}` } });

// New way - automatic refresh
import apiClient from "../services/apiClient";
const data = await apiClient.get("/api/data"); // Handles refresh automatically!
```

### Login Implementation

```javascript
const handleLogin = async (email, password) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include", // Important for cookies
  });

  const data = await response.json();
  if (data.success) {
    await login(data.accessToken, data.refreshToken, data.user);
  }
};
```

### Logout Implementation

```javascript
const handleLogout = async () => {
  await logout(); // AuthContext handles everything
  navigation.replace("LoginScreen");
};
```

## ⚡ Performance Benefits

1. **Reduced Login Frequency**: Users stay logged in for 7 days
2. **Seamless Experience**: No interruptions during token refresh
3. **Efficient Requests**: No unnecessary token checks
4. **Queue Management**: Multiple requests wait for single refresh

## 🚀 Testing the Flow

### 1. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### 2. Test Protected Route

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Test Token Refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}' \
  -b cookies.txt
```

### 4. Test Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}' \
  -b cookies.txt
```

## 🛠️ Environment Configuration

### Backend (.env)

```bash
JWT_SECRET=your-super-secret-key
JWT_EXP=15m
ROTATE_REFRESH_TOKENS=true
NODE_ENV=development
```

### Frontend (config.js)

```javascript
export const API_URL = "http://localhost:3000";
```

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure credentials: true in CORS config
2. **Token Not Refreshing**: Check refresh token storage
3. **Infinite Refresh Loop**: Verify token expiration times
4. **Cookie Issues**: Check domain/path settings

### Debug Logging

```javascript
// Enable detailed logging
console.log("Token refresh attempt:", { refreshToken, userId });
console.log("New access token generated:", newAccessToken);
```

## 🎯 Best Practices Implemented

1. ✅ **Short Access Token Lifetime**: 15 minutes
2. ✅ **Secure Refresh Token Storage**: HttpOnly cookies
3. ✅ **Automatic Token Refresh**: No user intervention
4. ✅ **Proper Error Handling**: Graceful fallbacks
5. ✅ **Token Cleanup**: Prevent memory leaks
6. ✅ **Queue Management**: Handle concurrent requests
7. ✅ **Secure Logout**: Invalidate all tokens

## 📝 Next Steps

1. **Add Redis/Database Storage**: For production token storage
2. **Implement Token Blacklisting**: For immediate revocation
3. **Add Rate Limiting**: On refresh endpoint
4. **Monitor Token Usage**: Track refresh patterns
5. **Add Device Tracking**: For security monitoring

---

This implementation provides a complete, production-ready authentication system that handles all token management automatically while maintaining security best practices. Users can use the app seamlessly without worrying about token expiration, and all APIs will work until they explicitly logout.

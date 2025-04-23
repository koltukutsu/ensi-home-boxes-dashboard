# Authentication Security Documentation

## Overview

This document outlines the security concerns in the current authentication system and provides recommendations for improvement. The authentication system is currently based on Firebase Authentication with Google provider and client-side email verification against a Firestore collection.

## Security Concerns

### 1. Sole Reliance on Email for Authorization

**Problem**: The system only verifies if an email exists in the allowed list, without additional identity verification. 

**Risk**: Someone with a spoofed email or compromised Google account could gain access to the application. Even with Google Authentication, which provides some protection, if a user's Google account is compromised, an attacker gains immediate access to your application.

### 2. Client-Side Authorization Logic

**Problem**: The entire authorization check happens in client-side JavaScript code.

**Risk**: A determined attacker could bypass these controls by:
- Modifying JavaScript execution in their browser
- Using browser developer tools to manipulate function calls
- Directly accessing protected API endpoints, bypassing the client checks entirely

### 3. Lack of Session Management

**Problem**: The code doesn't implement robust session handling, token refreshing, or session expiration.

**Risk**: This can lead to:
- Sessions that never expire, creating persistent access points
- Lack of ability to force-logout users when necessary
- Potential token replay attacks

### 4. Mock User Session

**Problem**: The code maintains a backdoor using `sessionStorage` for development/demo purposes.

**Risk**: This could be exploited if:
- The mock user code is accidentally deployed to production
- It creates predictable patterns that attackers can leverage
- It establishes poor security practices in the codebase

### 5. No Rate Limiting

**Problem**: There's no protection against brute force attempts to find valid email addresses or authentication endpoints.

**Risk**: Attackers can:
- Enumerate valid emails in the system
- Attempt to guess/brute force credentials
- Create denial of service by overwhelming authentication systems

### 6. Limited Admin Controls

**Problem**: No apparent way to immediately revoke access to compromised accounts.

**Risk**: If an account is compromised, administrators have limited tools to:
- Immediately terminate active sessions
- Block specific users who are exhibiting suspicious behavior
- Monitor real-time authentication attempts

### 7. Missing Account Recovery

**Problem**: No alternative verification methods if access to Google is compromised.

**Risk**: If a user loses access to their Google account:
- They may be permanently locked out of your application
- There's no secure recovery path
- Support/admin intervention becomes difficult without verification options

### 8. No Audit Logging

**Problem**: No logging of successful/failed login attempts for security analysis.

**Risk**: Without proper audit logs:
- Security incidents may go undetected
- Pattern analysis for potential attacks is impossible
- Compliance with security standards is difficult to demonstrate

### 9. Minimal Error Handling

**Problem**: Generic error messages could leak information about valid email addresses.

**Risk**: Through error message analysis, attackers could:
- Determine which emails are registered in the system
- Gain insight into application logic
- Use error information to refine attack strategies

### 10. No CSRF Protection

**Problem**: Missing cross-site request forgery protections.

**Risk**: Without CSRF protection:
- Attackers could trick authenticated users into executing unwanted actions
- Sessions can be hijacked through careful exploitation
- User actions could be performed without their knowledge

## Recommendations

### 1. Move Authorization Checks to Server-Side

**Implementation**:
- Create Firebase Cloud Functions to handle authentication logic
- Implement custom claims or user roles in Firebase Auth
- Validate tokens server-side before allowing access to protected resources

```javascript
// Example Firebase Cloud Function for authorization
exports.checkUserAccess = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Check if user email is in allowed list
  const email = context.auth.token.email;
  const allowedSnapshot = await admin.firestore().doc('watchdash_users/allowed').get();
  const allowedData = allowedSnapshot.data();
  
  if (!allowedData.users.includes(email)) {
    throw new functions.https.HttpsError('permission-denied', 'User not authorized');
  }
  
  // Set custom claims for this user
  await admin.auth().setCustomUserClaims(context.auth.uid, { authorized: true });
  
  return { authorized: true };
});
```

### 2. Implement Proper JWT Validation with Expiration

**Implementation**:
- Use Firebase Auth's built-in JWT handling with proper validation
- Set appropriate token expiration times
- Implement token refresh logic

```javascript
// Client-side token refresh example
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // Force token refresh every hour
    const tokenResult = await user.getIdTokenResult(true);
    
    // Check token expiration
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();
    
    if ((expirationTime - now) < 60 * 60 * 1000) {
      // Token expires in less than an hour, refresh it
      await user.getIdToken(true);
    }
  }
});
```

### 3. Add Role-Based Access Control

**Implementation**:
- Define clear roles (admin, user, guest, etc.) in your system
- Store roles in Firebase custom claims or in a secured Firestore collection
- Check both authentication and authorization for each protected action

```javascript
// Example custom claims with roles
admin.auth().setCustomUserClaims(uid, {
  role: 'admin', // or 'user', 'guest', etc.
  permissions: ['read', 'write', 'manage-users']
});

// Client-side role checking
const checkPermission = (user, permission) => {
  return user.getIdTokenResult()
    .then((idTokenResult) => {
      return idTokenResult.claims.permissions?.includes(permission) || false;
    });
};
```

### 4. Implement Login Attempt Logging and Rate Limiting

**Implementation**:
- Use Firebase Functions to log all authentication attempts
- Implement rate limiting using Redis or similar technology
- Create alerts for suspicious authentication patterns

```javascript
// Example rate limiting in Firebase Functions
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // limit each IP to 5 requests per windowMs
  ipAddresses: new Map(),
};

exports.loginAttempt = functions.https.onCall(async (data, context) => {
  // Get client IP
  const clientIP = context.rawRequest.ip;
  
  // Check rate limit
  const now = Date.now();
  if (!rateLimit.ipAddresses.has(clientIP)) {
    rateLimit.ipAddresses.set(clientIP, []);
  }
  
  // Get attempts within window
  const attempts = rateLimit.ipAddresses.get(clientIP)
    .filter(timestamp => (now - timestamp) < rateLimit.windowMs);
  
  // Update attempts
  attempts.push(now);
  rateLimit.ipAddresses.set(clientIP, attempts);
  
  // Check if rate limited
  if (attempts.length > rateLimit.maxRequests) {
    // Log suspicious activity
    await admin.firestore().collection('security_logs').add({
      type: 'rate_limit_exceeded',
      ip: clientIP,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    throw new functions.https.HttpsError(
      'resource-exhausted', 
      'Too many login attempts, please try again later'
    );
  }
  
  // Continue with login process...
});
```

### 5. Add Multi-Factor Authentication

**Implementation**:
- Leverage Firebase Auth's built-in MFA support
- Provide clear user guidance for setting up MFA
- Consider making MFA mandatory for admin accounts

```javascript
// Example of enabling MFA enrollment
const enableMFA = async (user) => {
  try {
    // Get the multiFactor object for the user
    const multiFactor = firebase.auth().multiFactor(user);
    
    // Start the enrollment process
    const session = await multiFactor.getSession();
    
    // Send verification code to the user's phone
    const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneNumber, // The user's phone number
      session
    );
    
    // User enters verification code
    const verificationCode = '123456'; // This would come from user input
    
    // Complete enrollment
    const phoneAuthCredential = phoneAuthProvider.credential(
      verificationId, 
      verificationCode
    );
    
    // Finalize enrollment
    const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(
      phoneAuthCredential
    );
    await multiFactor.enroll(multiFactorAssertion, "User's phone");
    
    return { success: true };
  } catch (error) {
    console.error('Error enabling MFA:', error);
    return { success: false, error };
  }
};
```

### 6. Remove Mock User Functionality in Production

**Implementation**:
- Use environment variables to control mock user availability
- Implement build-time flags to strip mock code from production builds
- Add warnings in development environments

```javascript
// Safe implementation of mock users for development
const handleMockLogin = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Using mock user login - THIS SHOULD NOT BE USED IN PRODUCTION');
    // Mock login logic for development only
    sessionStorage.setItem('mockUser', 'true');
    return true;
  }
  return false;
};
```

## Additional Recommendations

### Implement Comprehensive Audit Logging

Create detailed logs of all authentication-related events:
- Login attempts (successful and failed)
- Password changes and account updates
- Permission changes
- Suspicious activities

### Secure Error Handling

Implement consistent error responses that don't leak sensitive information:
- Use generic error messages when authentication fails
- Log detailed errors server-side only
- Create appropriate error codes for frontend handling

### Regular Security Reviews

- Conduct regular security audits of authentication code
- Use automated scanning tools to detect vulnerabilities
- Implement a security-focused code review process

## Resources

- [Firebase Security Documentation](https://firebase.google.com/docs/auth/web/manage-users)
- [OWASP Authentication Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/) 
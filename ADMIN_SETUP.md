# Admin Setup Guide

## Admin Authentication System

The SmartQuizzer application now includes dedicated admin login and registration functionality.

### Features

- **Admin Login**: Dedicated admin login page at `/admin/login`
- **Admin Registration**: Admin registration with access code at `/admin/register`
- **Access Control**: Admin-only access to dashboard and management features
- **Secure Authentication**: Separate admin authentication flow

### Setup Instructions

1. **Set Admin Access Code**:
   - Add `ADMIN_ACCESS_CODE=your_secure_code` to your `.env` file
   - Default code is `admin123` (change this for security)

2. **Admin Registration**:
   - Visit `/admin/register`
   - Enter admin credentials and access code
   - System will create admin user with privileges

3. **Admin Login**:
   - Visit `/admin/login`
   - Use admin credentials to access dashboard
   - Redirects to admin dashboard on success

### Security Features

- **Access Code Protection**: Admin registration requires valid access code
- **Admin-Only Routes**: Admin routes check for admin privileges
- **Session Management**: Admin status stored in session
- **Password Requirements**: Minimum 8 characters for admin passwords

### Navigation

- **Public Users**: See "Admin" link in navigation (red styling)
- **Logged-in Admins**: See "Admin" link that goes to dashboard
- **Regular Users**: Cannot access admin features

### Admin Access Code

To change the admin access code:
1. Set `ADMIN_ACCESS_CODE` in your `.env` file
2. Restart the application
3. Use the new code for admin registration

### Default Admin Access Code
- **Default**: `admin2025`
- **Recommendation**: Change to a secure, random string
- **Example**: `ADMIN_ACCESS_CODE=MySecureAdminCode2024!`

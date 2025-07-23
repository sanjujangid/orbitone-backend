# Authentication System Setup Guide

## Overview
This authentication system provides secure login, token management, and role-based access control with PostgreSQL procedures and dynamic privilege management.

## Features
- ✅ Secure login with PostgreSQL procedures
- ✅ JWT token authentication (1 day validity)
- ✅ Token refresh mechanism
- ✅ Single session per user (auto logout on new login)
- ✅ Dynamic privilege management from database
- ✅ Role-based access control
- ✅ Comprehensive logging
- ✅ Account lockout protection
- ✅ Password hashing with bcrypt

## Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=orbitone_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=1d

# Application Configuration
PORT=3000
NODE_ENV=development
```

## Database Setup

### 1. Create Database
```sql
CREATE DATABASE orbitone_db;
```

### 2. Run Schema Script
Execute the schema file: `database/schema/auth_schema.sql`

### 3. Run Procedure Script
Execute the procedure file: `database/procedures/authenticate_user.sql`

## Default Credentials
- **Username**: superadmin
- **Password**: admin123
- **Role**: superadmin
- **Privileges**: superadmin

## API Endpoints

### Authentication Endpoints
```
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/profile
GET  /auth/validate
```

### Protected Endpoints (require authentication)
```
GET  /superadmin/hello
GET  /superadmin/health
GET  /superadmin/stats
GET  /superadmin/users
```

## Usage Examples

### 1. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "admin123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "id": 1,
    "username": "superadmin",
    "role": "superadmin",
    "privileges": ["superadmin"]
  }
}
```

### 2. Access Protected Endpoint
```bash
curl -X GET http://localhost:3000/superadmin/hello \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 4. Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Guard Usage

### Protect Routes with Authentication
```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RequirePrivileges } from '../auth/decorators/privileges.decorator';

@Controller('api')
@UseGuards(AuthGuard)
export class ApiController {
  
  @Get('public')
  // No privileges required, just authentication
  async publicEndpoint() {
    return { message: 'Public endpoint' };
  }

  @Get('admin')
  @RequirePrivileges('admin')
  async adminEndpoint() {
    return { message: 'Admin only' };
  }

  @Get('superadmin')
  @RequirePrivileges('superadmin')
  async superadminEndpoint() {
    return { message: 'Superadmin only' };
  }
}
```

### Access User Information
```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get('profile')
@UseGuards(AuthGuard)
async getProfile(@CurrentUser() user: any) {
  return {
    id: user.userId,
    username: user.username,
    role: user.role,
    privileges: user.privileges
  };
}
```

## Database Tables

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: Optional email
- `password_hash`: Bcrypt hashed password
- `role`: User role (superadmin, admin, user)
- `is_active`: Account status
- `token_validity_hours`: Dynamic token validity (default: 24)
- `failed_login_attempts`: Failed login counter
- `last_failed_attempt`: Last failed login timestamp
- `last_login_at`: Last successful login

### Privileges Table
- `id`: Primary key
- `privilege_name`: Unique privilege name
- `description`: Privilege description

### User Privileges Table
- Links users to their privileges
- Supports dynamic privilege assignment

### Login/Logout Logs
- Comprehensive audit trail
- Tracks all login attempts (success/failure)
- Logs logout events with reasons

## Security Features

1. **Password Security**: Bcrypt hashing with salt
2. **Account Lockout**: 5 failed attempts = 30-minute lockout
3. **Single Session**: New login forces logout of existing session
4. **Token Expiration**: Configurable token validity
5. **Dynamic Privileges**: Privileges loaded from database
6. **Audit Logging**: All authentication events logged
7. **SQL Injection Protection**: Parameterized queries
8. **JWT Security**: Signed tokens with expiration

## Customization

### Token Validity
Set `token_validity_hours` in the users table for per-user token validity.

### Privileges
Add new privileges to the `privileges` table and assign them to users via `user_privileges`.

### Account Lockout
Modify the `authenticate_user` procedure to adjust:
- `v_max_failed_attempts` (default: 5)
- `v_lockout_duration` (default: 30 minutes)

## Troubleshooting

### Common Issues

1. **JWT Secret Not Set**: Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
2. **Database Connection**: Verify database credentials and connection
3. **Procedure Not Found**: Ensure `authenticate_user` procedure is created
4. **Schema Not Applied**: Run the auth schema script

### Debug Mode
Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.

## Production Considerations

1. **Strong JWT Secrets**: Use cryptographically strong secrets
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting on auth endpoints
4. **Database Security**: Use connection pooling and proper database permissions
5. **Monitoring**: Monitor login attempts and failed authentications
6. **Backup**: Regular database backups including auth logs 
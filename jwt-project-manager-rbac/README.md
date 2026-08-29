# JWT Refresh Token Authentication API

A secure authentication backend built with Node.js, Express, MongoDB, JWT Access Tokens, Refresh Token Rotation, and Role-Based Access Control (RBAC).

## Features

- User Registration
- User Authentication (Login)
- Password Hashing with bcrypt
- JWT Access Tokens
- Refresh Tokens stored in HttpOnly Cookies
- Refresh Token Rotation
- Secure Token Revocation
- Protected Routes Middleware
- MongoDB Integration with Mongoose
- Role-Based Authorization (RBAC)
- Environment Variable Configuration with dotenv

---

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token (JWT)
- bcryptjs
- cookie-parser
- dotenv
- nodemon

---

## Project Structure

```text
jwtRefreshToken-be/
│
├── config/
│   └── db.js
│
├── middleware/
│   └── auth.js
│
├── models/
│   ├── user.js
│   └── refreshToken.js
│
├── routes/
│   └── auth.js
│
├── utils/
│   └── tokens.js
│
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## User Model

```javascript
{
  name,
  lastname,
  username,
  email,
  password,
  direction,
  department,
  role
}
```

Example:

```json
{
  "name": "Saber",
  "lastname": "Dkhili",
  "username": "sdkhili",
  "email": "saber@gmail.com",
  "direction": "IT",
  "department": "Development",
  "role": "admin"
}
```

---

## Authentication Flow

### Registration

```text
Client
  │
  ▼
POST /api/auth/register
  │
  ▼
Hash password with bcrypt
  │
  ▼
Store user in MongoDB
```

### Login

```text
Client
  │
  ▼
POST /api/auth/login
  │
  ▼
Verify credentials
  │
  ▼
Generate Access Token
  │
  ▼
Generate Refresh Token
  │
  ▼
Store Refresh Token
  │
  ▼
Set Refresh Token Cookie
```

### Refresh Token Rotation

```text
Access Token Expired
         │
         ▼
POST /api/auth/refresh
         │
         ▼
Verify Refresh Token
         │
         ▼
Revoke Old Refresh Token
         │
         ▼
Generate New Refresh Token
         │
         ▼
Generate New Access Token
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/jwtRefreshToken-be.git
```

### Navigate to the project

```bash
cd jwtRefreshToken-be
```

### Install dependencies

```bash
npm install
```

### Install development dependencies

```bash
npm install --save-dev nodemon
```

---

## Environment Variables

Create a `.env` file at the root of the project:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_access_token_secret
JWT_EXPIRES_IN=15m

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d
```

---

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

---

## API Endpoints

### Register

**POST**

```http
/api/auth/register
```

Request Body:

```json
{
  "name": "Saber",
  "lastname": "Dkhili",
  "username": "sdkhili",
  "email": "saber@gmail.com",
  "password": "123456",
  "direction": "IT",
  "department": "Development",
  "role": "admin"
}
```

---

### Login

**POST**

```http
/api/auth/login
```

Request Body:

```json
{
  "email": "saber@gmail.com",
  "password": "123456"
}
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Refresh Access Token

**POST**

```http
/api/auth/refresh
```

Requires:

```text
refresh_token cookie
```

Response:

```json
{
  "accessToken": "new_access_token"
}
```

---

## Route Protection

Protected routes use the authentication middleware:

```javascript
router.get('/profile', auth, (req, res) => {
  res.json(req.user);
});
```

Authorization Header:

```http
Authorization: Bearer <access_token>
```

---

## Security Features

- Password hashing using bcrypt
- Short-lived Access Tokens
- Refresh Token Rotation
- Refresh Token Revocation
- HttpOnly Cookies
- JWT Signature Verification
- Environment-based Secret Management
- Role-Based Access Control (RBAC)

---

## Future Improvements

- Logout endpoint
- Multi-device session management
- Email verification
- Password reset
- Account lockout protection
- Audit logging
- OAuth2 / OpenID Connect integration
- Two-Factor Authentication (2FA)

---

## Author

**Saber Dkhili**

Backend Authentication API built with Node.js, Express, MongoDB, JWT, and Refresh Token Rotation.

# Backend API - User Endpoints

This document lists the user-related endpoints implemented in `backend/routes/user.routes.js` and describes the request shapes, required headers/cookies, response examples, and status codes.

Note: the routes shown here are the router paths. The final API URL depends on how the router is mounted in your server (for example `/api/user` or `/api/auth`).

Assumption: the router is mounted at a base path such as `/api/user`. Replace the base path with your server's actual mount point where appropriate.

## Common notes

- Content-Type: `application/json` for request bodies.
- Authentication: endpoints that require auth accept either an `Authorization: Bearer <token>` header or a cookie named `token`.
- JWTs are signed with `process.env.JWT_SECRET` and are valid for 24 hours.
- Logout stores the token in Redis as a blacklist entry (key = token) with a 24-hour expiry.

---

## POST /register

- Description: Create a new user account.
- Path: `/register`
- Method: POST
- Request body (JSON):

  {
  "email": "user@example.com",
  "password": "secret123"
  }

- Validation rules:

  - `email` must be a valid email.
  - `password` must be at least 6 characters long.

- Success (201):

  {
  "message": "User registered successfully",
  "token": "<jwt-token>",
  "user": { /_ created user document (password is not selected by default) _/ }
  }

- Error responses:
  - 400 Bad Request: validation errors. Response shape: `{ errors: [ { msg, param, ... } ] }` (from express-validator)
  - 400 Bad Request: if user already exists: `{ error: "User already exists" }`
  - 400/other: `{ error: "<message>" }` for other validation/application errors.

Notes: the service hashes the password before creating the record. The created `user` returned by the controller should not contain the password field (the schema has `select: false` for `password`).

---

## POST /login

- Description: Authenticate an existing user and receive a JWT.
- Path: `/login`
- Method: POST
- Request body (JSON):

  {
  "email": "user@example.com",
  "password": "secret123"
  }

- Validation rules:

  - `email` must be a valid email.
  - `password` must be at least 6 characters long.

- Success (200):

  {
  "message": "User logged in successfully",
  "token": "<jwt-token>",
  "user": { /_ user document _/ }
  }

- Error responses:
  - 400 Bad Request: validation errors `{ errors: [...] }`.
  - 400 Bad Request: when no user is found or invalid input `{ error: "Invalid email or password" }`.
  - 401 Unauthorized: invalid credentials `{ error: "Invalid email or password" }`.
  - 500 Internal Server Error: server errors.

Security note: the controller performs `userModel.findOne({ email }).select("+password")` to validate the password. Depending on Mongoose behavior and serialization, the returned `user` in the JSON response may include the password hash; you may want to explicitly remove sensitive fields before returning in production.

---

## GET /profile

- Description: Get the current authenticated user's profile (decoded token payload).
- Path: `/profile`
- Method: GET
- Headers / Cookies:

  - `Authorization: Bearer <token>` OR cookie `token=<token>`

- Success (200):

  {
  "message": "User profile",
  "user": { "email": "user@example.com" /_ token payload _/ }
  }

- Error responses:
  - 401 Unauthorized: when token is missing, invalid, expired, or blacklisted.

Notes: `req.user` is set to the decoded JWT payload by the `authUser` middleware. The original JWT in this code contains at least the `email` field.

---

## POST /logout

- Description: Log the user out by blacklisting the current token in Redis and clearing the cookie.
- Path: `/logout`
- Method: POST
- Headers / Cookies:

  - `Authorization: Bearer <token>` OR cookie `token=<token>`

- Behavior: Takes the provided token and stores it in Redis with value `"logout"` and expiry 24 hours (`EX 60*60*24`). It then clears the cookie `token` and returns success.

- Success (200):

  { "message": "User logged out successfully" }

- Error responses:
  - 401 Unauthorized: when no token is provided.
  - 400 Bad Request: on other errors, response shape `{ error: "<message>" }`.

Notes: After logout the token is treated as blacklisted — calls to protected endpoints will check Redis and reject requests that present a blacklisted token.

---

## Example usage (curl / PowerShell)

Replace <BASE> with your server base (e.g. `http://localhost:5000/api/user`):

1. Register

POST <BASE>/register
Content-Type: application/json

Body: { "email": "me@example.com", "password": "secret123" }

2. Login

POST <BASE>/login
Content-Type: application/json

Body: { "email": "me@example.com", "password": "secret123" }

3. Profile

GET <BASE>/profile
Header: Authorization: Bearer <token>

4. Logout

POST <BASE>/logout
Header: Authorization: Bearer <token>

---

## Appendix - Field shapes

- Register / Login request body JSON

  - email: string (valid email)
  - password: string (min length 6)

---

If you want, I can also:

- add example request/response snippets (full JSON) for each endpoint,
- add a short section showing how to mount the router in `server.js`, or
- update the login controller to omit the password from the returned user object.

Requirements coverage:

- MD file created in `backend` documenting endpoints, request shapes, and status codes — Done

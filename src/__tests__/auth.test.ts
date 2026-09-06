import request from 'supertest';
import { createApp } from '../app';
import prisma from '../prisma';
import { hashPassword } from '../utils/password';

jest.mock('../prisma', () => {
  const users: any[] = [];
  const categories: any[] = [];
  const refreshTokens: any[] = [];

  return {
    __esModule: true,
    default: {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.email) return users.find((u) => u.email === where.email) || null;
          if (where.id) return users.find((u) => u.id === where.id) || null;
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const user = {
            id: 'user-uuid-1',
            email: data.email,
            name: data.name,
            passwordHash: data.passwordHash,
            role: 'USER',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.push(user);
          return user;
        }),
      },
      category: {
        createMany: jest.fn(async ({ data }: any) => {
          categories.push(...data);
          return { count: data.length };
        }),
        findMany: jest.fn(async () => categories),
      },
      refreshToken: {
        create: jest.fn(async ({ data }: any) => {
          const token = {
            id: 'token-uuid-' + (refreshTokens.length + 1),
            tokenHash: data.tokenHash,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: null,
            createdAt: new Date(),
          };
          refreshTokens.push(token);
          return token;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const token = refreshTokens.find((t) => t.tokenHash === where.tokenHash);
          if (!token) return null;
          const user = users.find((u) => u.id === token.userId);
          return { ...token, user };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const token = refreshTokens.find((t) => t.id === where.id);
          if (token) Object.assign(token, data);
          return token;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const t of refreshTokens) {
            if (where.tokenHash && t.tokenHash === where.tokenHash) {
              Object.assign(t, data);
              count++;
            } else if (where.userId && t.userId === where.userId) {
              Object.assign(t, data);
              count++;
            }
          }
          return { count };
        }),
      },
      $transaction: jest.fn(async (cbOrArray: any) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray(prisma);
        }
        return Promise.all(cbOrArray);
      }),
      _reset: () => {
        users.length = 0;
        categories.length = 0;
        refreshTokens.length = 0;
      },
      _users: users,
    },
  };
});

describe('Authentication Endpoints (/api/v1/auth)', () => {
  const app = createApp();

  beforeEach(() => {
    (prisma as any)._reset();
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully with valid credentials and return JWT tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alex Johnson',
          email: 'alex@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alex@example.com');
      expect(res.body.data.user.name).toBe('Alex Johnson');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Sensitive field omitted
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration when password is weak or email is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'A',
          email: 'not-an-email',
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject duplicate email registration with 409 conflict', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alex Johnson',
          email: 'alex@example.com',
          password: 'Password123',
        });

      // Duplicate registration
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alex Duplicate',
          email: 'alex@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123');
      (prisma as any)._users.push({
        id: 'user-uuid-1',
        email: 'alex@example.com',
        name: 'Alex Johnson',
        passwordHash,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should log in with valid credentials and return access + refresh tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alex@example.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject login with wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex@example.com',
          password: 'WrongPassword999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login for non-existent email (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate and issue a new token pair when provided a valid refresh token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alex Johnson',
          email: 'alex@example.com',
          password: 'Password123',
        });

      const originalRefreshToken = regRes.body.data.tokens.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid or malformed refresh token with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.string' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return profile for authenticated user', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alex Johnson',
          email: 'alex@example.com',
          password: 'Password123',
        });

      const token = regRes.body.data.tokens.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.email).toBe('alex@example.com');
      expect(meRes.body.data.name).toBe('Alex Johnson');
    });

    it('should reject request missing Authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

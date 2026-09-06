import prisma from '../prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken, hashToken } from '../utils/jwt';
import { AppError } from '../utils/response';
import { RegisterInput, LoginInput } from '../validation/auth.validation';
import { AuthResponse, AuthTokens, UserDTO } from '@expense-tracker/shared';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#EF4444', isDefault: true },
  { name: 'Transportation', icon: 'Car', color: '#F97316', isDefault: true },
  { name: 'Housing & Rent', icon: 'Home', color: '#3B82F6', isDefault: true },
  { name: 'Utilities', icon: 'Zap', color: '#EAB308', isDefault: true },
  { name: 'Entertainment', icon: 'Film', color: '#8B5CF6', isDefault: true },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#EC4899', isDefault: true },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#10B981', isDefault: true },
  { name: 'Miscellaneous', icon: 'MoreHorizontal', color: '#6B7280', isDefault: true },
];

export class AuthService {
  /**
   * Registers a new user, hashes password, creates default categories, and generates tokens.
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const passwordHash = await hashPassword(input.password);

    // Create user and seed default user categories within a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          userId: newUser.id,
        })),
      });

      return newUser;
    });

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store hashed refresh token in database (expires in 7 days)
    const tokenHash = hashToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    const userDTO: UserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserDTO['role'],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: userDTO, tokens };
  }

  /**
   * Validates user credentials and issues a fresh token pair.
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store hashed refresh token
    const tokenHash = hashToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    const userDTO: UserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserDTO['role'],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: userDTO, tokens };
  }

  /**
   * Refreshes access token with Refresh Token Rotation.
   * Invalidates old refresh token and issues a new pair.
   */
  static async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokenHash = hashToken(refreshToken);

    // Look up token record
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      // Possible token reuse or revoked token: revoke all tokens for this user as safety measure
      if (storedToken?.revokedAt) {
        await prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { revokedAt: new Date() },
        });
      }
      throw new AppError('Invalid or revoked refresh token', 401);
    }

    // Token rotation: Revoke old token and issue new token pair
    const newTokens = generateTokens({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    const newTokenHash = hashToken(newTokens.refreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.user.id,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    return newTokens;
  }

  /**
   * Revokes the active refresh token.
   */
  static async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Retrieves profile of current user.
   */
  static async getMe(userId: string): Promise<UserDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserDTO['role'],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

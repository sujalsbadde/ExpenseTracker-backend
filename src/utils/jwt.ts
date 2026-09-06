import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { TokenPayload, AuthTokens } from '@expense-tracker/shared';

/**
 * Generates an Access Token and Refresh Token pair for an authenticated user.
 */
export const generateTokens = (payload: Omit<TokenPayload, 'iat' | 'exp'>): AuthTokens => {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  // Default expiration in seconds (15m = 900s)
  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
  };
};

/**
 * Verifies a JWT access token and returns the decoded payload.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
};

/**
 * Verifies a JWT refresh token and returns the decoded payload.
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
};

/**
 * Creates a SHA-256 hash of a refresh token to avoid storing raw tokens in the database.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

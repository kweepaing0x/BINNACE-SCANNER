import { z } from 'zod';

export interface WhitelistEntry {
  address: string;
  network: 'solana' | 'sui';
  createdAt: string;
  lastLogin: string;
  loginAttempts: number;
}

export interface LoginAttempt {
  address: string;
  network: 'solana' | 'sui';
  timestamp: string;
  success: boolean;
  ipAddress: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  type: 'WALLET' | 'PHRASE' | null;
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
}

export const WhitelistSchema = z.object({
  address: z.string()
    .min(32, 'Invalid wallet address')
    .max(256, 'Invalid wallet address'),
  network: z.enum(['solana', 'sui']),
});

export const SecretPhraseSchema = z.object({
  phrase: z.string()
    .min(8, 'Secret phrase must be at least 8 characters')
    .max(50, 'Secret phrase cannot exceed 50 characters')
});

export type WhitelistInput = z.infer<typeof WhitelistSchema>;
export type SecretPhraseInput = z.infer<typeof SecretPhraseSchema>;
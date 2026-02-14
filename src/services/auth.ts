import { createClient } from '@supabase/supabase-js';
import type { WhitelistEntry, LoginAttempt } from '../types/auth';
import { validateSecretPhrase } from '../config/auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export class AuthService {
  private static RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static MAX_LOGIN_ATTEMPTS = 5;
  private static LOGIN_ATTEMPT_RESET = 60 * 60 * 1000; // 1 hour
  private static SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static SESSION_KEY = 'auth_session';

  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  isAuthenticated(): boolean {
    try {
      const session = localStorage.getItem(AuthService.SESSION_KEY);
      if (!session) return false;

      const { timestamp, type } = JSON.parse(session);
      const now = Date.now();

      // Check if session has expired
      if (now - timestamp > AuthService.SESSION_DURATION) {
        localStorage.removeItem(AuthService.SESSION_KEY);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  async verifySecretPhrase(phrase: string): Promise<boolean> {
    try {
      if (!validateSecretPhrase(phrase)) {
        return false;
      }

      // Store session
      localStorage.setItem(AuthService.SESSION_KEY, JSON.stringify({
        type: 'PHRASE',
        timestamp: Date.now()
      }));

      return true;
    } catch (error) {
      console.error('Error verifying secret phrase:', error);
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(AuthService.SESSION_KEY);
  }

  private isRateLimited(address: string): boolean {
    const attempts = this.loginAttempts.get(address);
    if (!attempts) return false;

    const now = Date.now();
    if (now - attempts.lastAttempt > AuthService.LOGIN_ATTEMPT_RESET) {
      this.loginAttempts.delete(address);
      return false;
    }

    return attempts.count >= AuthService.MAX_LOGIN_ATTEMPTS;
  }

  private updateLoginAttempts(address: string, success: boolean): void {
    const now = Date.now();
    const attempts = this.loginAttempts.get(address) || { count: 0, lastAttempt: now };

    if (success) {
      this.loginAttempts.delete(address);
    } else {
      this.loginAttempts.set(address, {
        count: attempts.count + 1,
        lastAttempt: now
      });
    }
  }

  async verifyWalletSignature(address: string, signature: string, network: 'solana' | 'sui'): Promise<boolean> {
    try {
      // Verify the signature using network-specific methods
      let isValid = false;
      if (network === 'solana') {
        // Verify Solana signature
        // Implementation depends on your specific signature format and requirements
        isValid = true; // Placeholder
      } else {
        // Verify Sui signature
        // Implementation depends on your specific signature format and requirements
        isValid = true; // Placeholder
      }

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Store session
      localStorage.setItem(AuthService.SESSION_KEY, JSON.stringify({
        type: 'WALLET',
        timestamp: Date.now()
      }));

      return true;
    } catch (error) {
      console.error('Error verifying wallet signature:', error);
      return false;
    }
  }

  async isWhitelisted(address: string, network: 'solana' | 'sui'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('whitelisted_addresses')
        .select('address')
        .eq('address', address)
        .eq('network', network)
        .single();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking whitelist:', error);
      return false;
    }
  }

  async logLoginAttempt(address: string, network: 'solana' | 'sui', success: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('login_attempts')
        .insert({
          address,
          network,
          success,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
      this.updateLoginAttempts(address, success);
    } catch (error) {
      console.error('Error logging login attempt:', error);
    }
  }

  async requestWhitelist(address: string, network: 'solana' | 'sui'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whitelist_requests')
        .insert({
          address,
          network,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error requesting whitelist access:', error);
      return false;
    }
  }

  getLoginAttemptsRemaining(address: string): number {
    const attempts = this.loginAttempts.get(address);
    if (!attempts) return AuthService.MAX_LOGIN_ATTEMPTS;
    return Math.max(0, AuthService.MAX_LOGIN_ATTEMPTS - attempts.count);
  }

  getRateLimitResetTime(address: string): number | null {
    const attempts = this.loginAttempts.get(address);
    if (!attempts || attempts.count < AuthService.MAX_LOGIN_ATTEMPTS) return null;
    return attempts.lastAttempt + AuthService.LOGIN_ATTEMPT_RESET;
  }
}

export const authService = new AuthService();
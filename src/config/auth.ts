import { z } from 'zod';

export const SECRET_PHRASE = 'STAYSAFE';

export const validateSecretPhrase = (phrase: string): boolean => {
  return phrase === SECRET_PHRASE;
};

// Schema for secret phrase validation
export const SecretPhraseSchema = z.object({
  phrase: z.string()
    .min(8, 'Secret phrase must be at least 8 characters')
    .max(50, 'Secret phrase cannot exceed 50 characters')
    .refine((val) => validateSecretPhrase(val), {
      message: 'Invalid secret phrase'
    })
});
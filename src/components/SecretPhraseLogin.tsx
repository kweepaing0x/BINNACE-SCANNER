import React, { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { SecretPhraseSchema, type SecretPhraseInput } from '../types/auth';

interface Props {
  onLogin: (phrase: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const SecretPhraseLogin: React.FC<Props> = ({ onLogin, loading, error }) => {
  const [phrase, setPhrase] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const input: SecretPhraseInput = { phrase };
      SecretPhraseSchema.parse(input);
      setValidationError(null);
      await onLogin(phrase);
    } catch (err) {
      if (err instanceof Error) {
        setValidationError(err.message);
      }
    }
  };

  return (
    <div className="w-full max-w-[480px]">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Key className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900"> Password Login </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phrase" className="block text-sm font-medium text-gray-700">
              Enter Secret code            </label>
            <input
              type="password"
              id="phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm 
                       focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter your secret code"
              disabled={loading}
            />
          </div>

          {(validationError || error) && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {validationError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 
                     focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Verifying...
              </div>
            ) : (
              'Login with Secret code'
            )}
          </button>
        </form>

        <div className="text-center">
                 </div>
      </div>
    </div>
  );
};
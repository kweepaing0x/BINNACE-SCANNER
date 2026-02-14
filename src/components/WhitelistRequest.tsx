import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { authService } from '../services/auth';
import type { WhitelistInput } from '../types/auth';

interface Props {
  address: string;
  network: 'solana' | 'sui';
  onClose: () => void;
}

export const WhitelistRequest: React.FC<Props> = ({ address, network, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await authService.requestWhitelist(address, network);
      if (success) {
        setSuccess(true);
      } else {
        throw new Error('Failed to submit whitelist request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Request Whitelist Access</h2>
      
      {success ? (
        <div className="space-y-4">
          <div className="bg-green-50 text-green-700 p-4 rounded-lg">
            Your whitelist request has been submitted successfully. We'll review your request and notify you once approved.
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg
                     hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Wallet Address
            </label>
            <input
              type="text"
              value={address}
              disabled
              className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Network
            </label>
            <input
              type="text"
              value={network.toUpperCase()}
              disabled
              className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 px-3 py-2"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg
                       hover:bg-indigo-700 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Send className="h-5 w-5 mr-2" />
                  Submit Request
                </div>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                       hover:bg-gray-50 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
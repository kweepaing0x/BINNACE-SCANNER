import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ConnectButton as SuiConnectButton } from '@suiet/wallet-kit';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import { Loader2, Wallet, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth';
import { WhitelistRequest } from './WhitelistRequest';

export const WalletConnect: React.FC = () => {
  const { connected: solanaConnected, connecting: solanaConnecting, publicKey } = useWallet();
  const { connected: suiConnected, connecting: suiConnecting, address } = useSuiWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWhitelistRequest, setShowWhitelistRequest] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'solana' | 'sui'>('solana');

  useEffect(() => {
    const checkWhitelist = async () => {
      if (solanaConnected && publicKey) {
        setLoading(true);
        const isWhitelisted = await authService.isWhitelisted(publicKey.toString(), 'solana');
        if (!isWhitelisted) {
          setError('Your wallet is not whitelisted');
        }
        setLoading(false);
      } else if (suiConnected && address) {
        setLoading(true);
        const isWhitelisted = await authService.isWhitelisted(address, 'sui');
        if (!isWhitelisted) {
          setError('Your wallet is not whitelisted');
        }
        setLoading(false);
      }
    };

    checkWhitelist();
  }, [solanaConnected, suiConnected, publicKey, address]);

  const handleRequestWhitelist = () => {
    setShowWhitelistRequest(true);
  };

  const currentAddress = solanaConnected ? publicKey?.toString() : suiConnected ? address : null;
  const currentNetwork = solanaConnected ? 'solana' : suiConnected ? 'sui' : selectedNetwork;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  if (error && currentAddress) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        
        <button
          onClick={handleRequestWhitelist}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg
                   hover:bg-indigo-700 focus:outline-none focus:ring-2
                   focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Request Whitelist Access
        </button>

        {showWhitelistRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <WhitelistRequest
              address={currentAddress}
              network={currentNetwork}
              onClose={() => setShowWhitelistRequest(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px]">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Wallet className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
          </div>
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setSelectedNetwork('solana')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedNetwork === 'solana'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Solana
            </button>
            <button
              onClick={() => setSelectedNetwork('sui')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedNetwork === 'sui'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Sui
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {selectedNetwork === 'solana' ? (
            <WalletMultiButton 
              className="!bg-indigo-600 hover:!bg-indigo-700 !h-12 !w-full !px-4 !py-2 !rounded-lg !font-medium !transition-all !duration-200 !text-base"
            />
          ) : (
            <SuiConnectButton 
              className="!bg-indigo-600 hover:!bg-indigo-700 !h-12 !w-full !px-4 !py-2 !rounded-lg !font-medium !transition-all !duration-200 !text-base"
            />
          )}
          
          {(solanaConnecting || suiConnecting) && (
            <div className="flex items-center justify-center text-sm text-gray-600 bg-gray-50 py-2 px-4 rounded-lg">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Connecting to {selectedNetwork === 'solana' ? 'Solana' : 'Sui'} wallet...
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            By connecting your wallet, you agree to our{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 transition-colors">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
import { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletProvider as SuiWalletProvider } from '@suiet/wallet-kit';
import '@solana/wallet-adapter-react-ui/styles.css';
import '@suiet/wallet-kit/style.css';

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const handleError = (error: any) => {
    console.error('Wallet error:', error);

    // Check if it's a user rejection
    if (error.message?.includes('User rejected')) {
      console.log('User rejected the connection request');
      return;
    }

    // Handle other connection errors
    if (retryCount < maxRetries) {
      console.log(`Retrying connection (${retryCount + 1}/${maxRetries})...`);
      setRetryCount(prev => prev + 1);
    } else {
      console.error('Max connection retries reached');
    }
  };

  // Reset retry count on successful connection
  useEffect(() => {
    return () => setRetryCount(0);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={handleError}
      >
        <WalletModalProvider>
          <SuiWalletProvider>
            {children}
          </SuiWalletProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
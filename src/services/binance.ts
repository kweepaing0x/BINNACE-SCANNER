import { TradingPair, Candle, OrderBookData } from '../types/trading';

class BinanceService {
  private wsConnections: Map<string, WebSocket> = new Map();
  private static BASE_URL = 'https://testnet.binance.vision/api/v3';
  private static WS_URL = 'wss://stream.testnet.binance.vision:9443/stream';
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private validSymbols: Set<string> = new Set();
  private isShuttingDown: boolean = false;
  private symbolValidationPromise: Promise<void> | null = null;
  private lastValidationTime: number = 0;
  private validationInterval = 5 * 60 * 1000;
  private orderBookSubscriptions: Map<string, WebSocket> = new Map();
  private combinedStream: WebSocket | null = null;
  private streamSubscriptions: Set<string> = new Set();
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  private async fetchWithRetry(endpoint: string, retries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const url = `${BinanceService.BASE_URL}/${endpoint}`;
        console.log(`Fetching: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`
          );
        }
        
        return response;
      } catch (error) {
        console.error(`Attempt ${i + 1}/${retries} failed:`, error);
        lastError = error;
        
        if (i === retries - 1) {
          throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    
    throw lastError || new Error('Failed to fetch after all retries');
  }

  private initializeCombinedStream() {
    if (this.combinedStream) {
      return;
    }

    this.combinedStream = new WebSocket(BinanceService.WS_URL);

    this.combinedStream.onopen = () => {
      console.log('Combined WebSocket stream connected');
      this.subscribeToExistingStreams();
    };

    this.combinedStream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const stream = data.stream;
        const handler = this.messageHandlers.get(stream);
        if (handler) {
          handler(data.data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.combinedStream.onerror = (error) => {
      console.error('Combined WebSocket stream error:', error);
      this.reconnectCombinedStream();
    };

    this.combinedStream.onclose = () => {
      if (!this.isShuttingDown) {
        this.reconnectCombinedStream();
      }
    };
  }

  private reconnectCombinedStream() {
    setTimeout(() => {
      if (!this.isShuttingDown) {
        console.log('Reconnecting combined WebSocket stream...');
        this.combinedStream = null;
        this.initializeCombinedStream();
      }
    }, this.reconnectDelay);
  }

  private subscribeToExistingStreams() {
    if (!this.combinedStream || this.combinedStream.readyState !== WebSocket.OPEN) {
      return;
    }

    const streams = Array.from(this.streamSubscriptions);
    if (streams.length > 0) {
      const subscribeMsg = {
        method: 'SUBSCRIBE',
        params: streams,
        id: Date.now()
      };
      this.combinedStream.send(JSON.stringify(subscribeMsg));
    }
  }

  private async validateSymbols(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastValidationTime < this.validationInterval && this.validSymbols.size > 0) {
        return;
      }

      if (this.symbolValidationPromise) {
        await this.symbolValidationPromise;
        return;
      }

      this.symbolValidationPromise = new Promise(async (resolve) => {
        try {
          // Start with major pairs to ensure we have something
          ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'].forEach(symbol => {
            this.validSymbols.add(symbol);
          });

          const response = await this.fetchWithRetry('ticker/24hr');
          const data = await response.json();

          // Filter and add additional pairs
          data
            .filter((ticker: any) => 
              ticker.symbol.endsWith('USDT') &&
              parseFloat(ticker.volume) > 0 &&
              parseFloat(ticker.lastPrice) > 0 &&
              parseFloat(ticker.volume) * parseFloat(ticker.lastPrice) > 500000
            )
            .forEach((ticker: any) => {
              this.validSymbols.add(ticker.symbol);
            });

          this.lastValidationTime = now;
          console.log(`Validated ${this.validSymbols.size} trading pairs`);
        } catch (error) {
          console.error('Error validating symbols:', error);
          // Already added major pairs at the start
        } finally {
          resolve();
        }
      });

      await this.symbolValidationPromise;
      this.symbolValidationPromise = null;
    } catch (error) {
      console.error('Error in validateSymbols:', error);
      // Major pairs were added at the start
    }
  }

  async getAllTradingPairs(): Promise<TradingPair[]> {
    try {
      await this.validateSymbols();
      return Array.from(this.validSymbols).map(symbol => ({
        symbol,
        baseAsset: symbol.replace('USDT', ''),
        quoteAsset: 'USDT'
      }));
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
      return [
        { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
        { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT' }
      ];
    }
  }

  async getKlines(symbol: string, interval: string = '1h', limit: number = 100): Promise<Candle[]> {
    try {
      if (!this.validSymbols.has(symbol)) {
        await this.validateSymbols();
      }

      if (!this.validSymbols.has(symbol)) {
        console.warn(`Invalid symbol: ${symbol}`);
        return [];
      }

      const response = await this.fetchWithRetry(
        `klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      
      const data = await response.json();
      
      return data.map((kline: any) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      return [];
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<OrderBookData> {
    try {
      const response = await this.fetchWithRetry(`depth?symbol=${symbol}&limit=${limit}`);
      const data = await response.json();
      
      return {
        bids: data.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error);
      return {
        bids: [],
        asks: [],
        timestamp: Date.now()
      };
    }
  }

  async subscribeToKlines(symbol: string, interval: string, callback: (candle: Candle) => void) {
    if (this.isShuttingDown) return;

    try {
      if (!this.validSymbols.has(symbol)) {
        await this.validateSymbols();
      }

      if (!this.validSymbols.has(symbol)) {
        console.warn(`Cannot subscribe to invalid symbol: ${symbol}`);
        return;
      }

      this.callbackStore.set(symbol, callback);
      this.intervalStore.set(symbol, interval);

      const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
      
      // Initialize combined stream if not already done
      if (!this.combinedStream) {
        this.initializeCombinedStream();
      }

      // Add message handler
      this.messageHandlers.set(streamName, (data: any) => {
        if (!this.isShuttingDown && data.e === 'kline') {
          const k = data.k;
          const candle: Candle = {
            timestamp: k.t,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };
          callback(candle);
        }
      });

      // Add to subscriptions and subscribe if not already subscribed
      if (!this.streamSubscriptions.has(streamName)) {
        this.streamSubscriptions.add(streamName);
        
        if (this.combinedStream && this.combinedStream.readyState === WebSocket.OPEN) {
          const subscribeMsg = {
            method: 'SUBSCRIBE',
            params: [streamName],
            id: Date.now()
          };
          this.combinedStream.send(JSON.stringify(subscribeMsg));
        }
      }

    } catch (error) {
      console.error(`Error setting up WebSocket for ${symbol}:`, error);
      this.cleanup(symbol);
    }
  }

  private callbackStore = new Map<string, (candle: Candle) => void>();
  private intervalStore = new Map<string, string>();

  private cleanup(symbol: string) {
    const streamName = `${symbol.toLowerCase()}@kline_${this.intervalStore.get(symbol)}`;
    this.streamSubscriptions.delete(streamName);
    this.messageHandlers.delete(streamName);
    this.callbackStore.delete(symbol);
    this.intervalStore.delete(symbol);

    // If using combined stream and it's the last subscription, close it
    if (this.streamSubscriptions.size === 0 && this.combinedStream) {
      try {
        this.combinedStream.close();
        this.combinedStream = null;
      } catch (e) {
        // Ignore close errors
      }
    }
  }

  disconnect() {
    this.isShuttingDown = true;
    
    if (this.combinedStream) {
      try {
        this.combinedStream.close();
      } catch (error) {
        // Ignore close errors
      }
      this.combinedStream = null;
    }

    this.streamSubscriptions.clear();
    this.messageHandlers.clear();
    this.callbackStore.clear();
    this.intervalStore.clear();
    this.reconnectAttempts.clear();
    
    setTimeout(() => {
      this.isShuttingDown = false;
    }, 1000);
  }
  async placeOrder(symbol: string, side: 'BUY' | 'SELL', type: 'LIMIT' | 'MARKET', quantity: number, price?: number, apiKey?: string, apiSecret?: string): Promise<any> {
    if (!apiKey || !apiSecret) {
      throw new Error('API Key and Secret are required for placing orders.');
    }

    const timestamp = Date.now();
    const params: any = {
      symbol,
      side,
      type,
      quantity,
      timestamp,
    };

    if (type === 'LIMIT' && price) {
      params.price = price;
      params.timeInForce = 'GTC'; // Good Till Cancelled
    }

    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const signature = this.createSignature(queryString, apiSecret);
    const signedQueryString = `${queryString}&signature=${signature}`;

    try {
      const response = await fetch(`${BinanceService.BASE_URL}/order?${signedQueryString}`, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Order placement failed: ${JSON.stringify(errorData)}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string, apiKey?: string, apiSecret?: string): Promise<any> {
    if (!apiKey || !apiSecret) {
      throw new Error('API Key and Secret are required for canceling orders.');
    }

    const timestamp = Date.now();
    const params: any = {
      symbol,
      orderId,
      timestamp,
    };

    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const signature = this.createSignature(queryString, apiSecret);
    const signedQueryString = `${queryString}&signature=${signature}`;

    try {
      const response = await fetch(`${BinanceService.BASE_URL}/order?${signedQueryString}`, {
        method: 'DELETE',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Order cancellation failed: ${JSON.stringify(errorData)}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  private createSignature(queryString: string, apiSecret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
  }

}

export const binanceService = new BinanceService();
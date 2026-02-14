import { OrderBookMetrics, FibonacciLevels } from '../types/trading';

interface FuturesConfig {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  conditions: {
    volumeImbalance: number;
    useEma: boolean;
    useFibonacci: boolean;
    stopLoss: number;
    takeProfit: number;
    leverage: number;
    initialMargin: number;
  };
  mode: 'auto' | 'manual';
}

class FuturesService {
  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  private config: FuturesConfig | null = null;

  setConfig(config: FuturesConfig) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private async initializeClient() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials not configured');
    }

    try {
      const { Spot } = await import('@binance/connector');
      return new Spot(this.apiKey, this.apiSecret, { baseURL: 'https://testnet.binance.vision' });
    } catch (error) {
      console.error('Error initializing Binance client:', error);
      throw error;
    }
  }

  async checkFuturesAvailability(symbol: string): Promise<boolean> {
    try {
      const client = await this.initializeClient();
      const { data } = await client.futuresExchangeInfo();
      return data.symbols.some((s: any) => s.symbol === symbol && s.status === 'TRADING');
    } catch (error) {
      console.error('Error checking futures availability:', error);
      return false;
    }
  }

  private calculateEntryPrice(metrics: OrderBookMetrics, fibLevels?: FibonacciLevels): number {
    if (this.config?.conditions.useFibonacci && fibLevels) {
      return fibLevels.retracement618;
    }
    return metrics.currentPrice;
  }

  private calculatePositionSize(price: number): number {
    if (!this.config) return 0;
    
    const initialMargin = this.config.conditions.initialMargin;
    const leverage = this.config.conditions.leverage;
    
    // Calculate position size based on initial margin and leverage
    const positionSize = (initialMargin * leverage) / price;
    
    // Round to 4 decimal places to comply with Binance futures requirements
    return Math.round(positionSize * 10000) / 10000;
  }

  private async placeFuturesOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number
  ) {
    try {
      const client = await this.initializeClient();
      
      // Set leverage
      await client.futuresLeverage({
        symbol,
        leverage: this.config?.conditions.leverage || 20
      });

      // Place the main order
      const order = await client.futuresOrder({
        symbol,
        side,
        type: 'LIMIT',
        quantity,
        price,
        timeInForce: 'GTC'
      });

      // Place stop loss
      if (this.config?.conditions.stopLoss) {
        const stopPrice = side === 'BUY' 
          ? price * (1 - this.config.conditions.stopLoss / 100)
          : price * (1 + this.config.conditions.stopLoss / 100);

        await client.futuresOrder({
          symbol,
          side: side === 'BUY' ? 'SELL' : 'BUY',
          type: 'STOP_MARKET',
          stopPrice,
          closePosition: true,
          timeInForce: 'GTC'
        });
      }

      // Place take profit
      if (this.config?.conditions.takeProfit) {
        const takeProfitPrice = side === 'BUY'
          ? price * (1 + this.config.conditions.takeProfit / 100)
          : price * (1 - this.config.conditions.takeProfit / 100);

        await client.futuresOrder({
          symbol,
          side: side === 'BUY' ? 'SELL' : 'BUY',
          type: 'TAKE_PROFIT_MARKET',
          stopPrice: takeProfitPrice,
          closePosition: true,
          timeInForce: 'GTC'
        });
      }

      return order;
    } catch (error) {
      console.error('Error placing futures order:', error);
      throw error;
    }
  }

  async executeTrade(
    symbol: string,
    metrics: OrderBookMetrics,
    fibLevels?: FibonacciLevels
  ) {
    if (!this.config?.enabled) return null;

    try {
      // Check if futures trading is available
      const isAvailable = await this.checkFuturesAvailability(symbol);
      if (!isAvailable) {
        throw new Error(`Futures trading not available for ${symbol}`);
      }

      // Check volume imbalance condition
      const volumeImbalancePercent = Math.abs(metrics.bidAskImbalance * 100);
      if (volumeImbalancePercent < (this.config.conditions.volumeImbalance || 50)) {
        return null;
      }

      const entryPrice = this.calculateEntryPrice(metrics, fibLevels);
      const side = metrics.bidAskImbalance > 0 ? 'BUY' : 'SELL';
      const quantity = this.calculatePositionSize(entryPrice);

      return await this.placeFuturesOrder(symbol, side, quantity, entryPrice);
    } catch (error) {
      console.error('Error executing futures trade:', error);
      throw error;
    }
  }
}

export const futuresService = new FuturesService();
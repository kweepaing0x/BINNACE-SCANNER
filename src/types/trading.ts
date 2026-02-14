import { z } from 'zod';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  priceChangePercent?: number;
}

export interface OrderBookData {
  bids: [number, number][];  // [price, quantity]
  asks: [number, number][];  // [price, quantity]
  timestamp: number;
}

export interface OrderBookMetrics {
  bidAskImbalance: number;
  liquidity: {
    bids: number;
    asks: number;
  };
  depth: {
    bids: number;
    asks: number;
  };
  priceImpact: {
    buy: number;
    sell: number;
  };
  support: number;
  resistance: number;
  currentPrice: number;
  score: number;
}

export interface SignalLog {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'VOLUME_SPIKE' | 'EMA_CROSS_OVER' | 'EMA_CROSS_UNDER' | 'PRICE_CROSS_EMA' | 'STOCH_RSI_CROSS' | 'MA_CROSS_OVER' | 'MA_CROSS_UNDER' | 'LONG' | 'SHORT' | 'AI_BUY' | 'AI_SELL';
  timeframe: string;
  price: number;
  details: string;
  stopLoss?: number;
  takeProfit?: number;
  orderBookMetrics?: OrderBookMetrics;
  aiConfidence?: number;
  count?: number;
}

export interface StochRSIConfig {
  period: number;
  kPeriod: number;
  dPeriod: number;
  overbought: number;
  oversold: number;
}

export interface VolumeConfig {
  period: number;
  spikeThreshold: number;
}

export interface EMAConfig {
  fastPeriod: number;
  slowPeriod: number;
}

export interface PriceEMAConfig {
  period: number;
}

export interface MAConfig {
  fastPeriod: number;
  slowPeriod: number;
}

export interface ATRConfig {
  period: number;
}

export interface ADXConfig {
  period: number;
}

export interface OrderBookConfig {
  depth: number;
  updateInterval: number;
  imbalanceThreshold: number;
  priceImpactThreshold: number;
}

export interface TrendConfig {
  rsiPeriod: number;
  emaPeriod1: number;
  emaPeriod2: number;
  bbPeriod: number;
  bbStdDev: number;
  volumePeriod: number;
  volumeThreshold: number;
}

export interface IndicatorConfig {
  indicatorType: 'volume' | 'ema' | 'price-ema' | 'stoch-rsi' | 'ma' | 'trend' | 'atr' | 'adx';
  timeframe: string;
  volume?: VolumeConfig;
  ema?: EMAConfig;
  priceEma?: PriceEMAConfig;
  stochRSI?: StochRSIConfig;
  ma?: MAConfig;
  atr?: ATRConfig;
  adx?: ADXConfig;
  trend?: TrendConfig;
}

export interface SwingPoint {
  price: number;
  timestamp: number;
  type: 'HIGH' | 'LOW';
}

export interface FibonacciLevels {
  extension1618: number;
  retracement618: number;
}

export interface TrendAnalysis {
  isValid: boolean;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsi: number;
  ema21: number;
  ema50: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  volumeSpike: boolean;
  volumeRatio: number;
  dailyCandle: 'BULLISH' | 'BEARISH';
}

export const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' }
] as const;

export const INDICATOR_TYPES = [
  { value: 'volume', label: 'Volume Analysis' },
  { value: 'ema', label: 'EMA Crossover' },
  { value: 'price-ema', label: 'Price/EMA Cross' },
  { value: 'stoch-rsi', label: 'Stochastic RSI' },
  { value: 'ma', label: 'MA Crossover' },
  { value: 'trend', label: 'Trend Analysis' },
  { value: 'atr', label: 'Average True Range (ATR)' },
  { value: 'adx', label: 'Average Directional Index (ADX)' }
] as const;
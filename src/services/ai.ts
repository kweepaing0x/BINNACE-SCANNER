import * as tf from '@tensorflow/tfjs';
import type { OrderBookMetrics, Candle } from '../types/trading';

class AIService {
  private model: tf.LayersModel | null = null;
  private modelLoading: boolean = false;
  private modelReady: boolean = false;

  async initialize(): Promise<void> {
    if (this.modelLoading || this.modelReady) return;
    
    this.modelLoading = true;
    
    try {
      // Create a simple model for price movement prediction
      const model = tf.sequential();
      
      model.add(tf.layers.dense({
        units: 32,
        activation: 'relu',
        inputShape: [9] // Features: price, volume, bid-ask imbalance, score, price impact buy, price impact sell, liquidity ratio, ATR, ADX
      }));
      
      model.add(tf.layers.dense({
        units: 16,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dense({
        units: 3, // Output: UP, DOWN, NEUTRAL
        activation: 'softmax'
      }));
      
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      this.model = model;
      this.modelReady = true;
    } catch (error) {
      console.error('Error initializing AI model:', error);
    } finally {
      this.modelLoading = false;
    }
  }

  isLoading(): boolean {
    return this.modelLoading;
  }

  isReady(): boolean {
    return this.modelReady;
  }

  private preprocessInput(
    candle: Candle,
    metrics: OrderBookMetrics,
    atr: number,
    adx: number
  ): tf.Tensor2D {
    // Normalize and combine features
    const features = [
      candle.close,
      candle.volume,
      metrics.bidAskImbalance,
      metrics.score,
      metrics.priceImpact.buy,
      metrics.priceImpact.sell,
      (metrics.liquidity.bids - metrics.liquidity.asks) / 
      (metrics.liquidity.bids + metrics.liquidity.asks),
      atr,
      adx
    ];

    // Normalize features to range [-1, 1]
    const normalizedFeatures = features.map(f => (f - 0) / (1 - 0));
    
    return tf.tensor2d([normalizedFeatures], [1, 9]);
  }

  async analyzeTrade(
    candle: Candle,
    metrics: OrderBookMetrics,
    atr: number,
    adx: number
  ): Promise<{
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
  }> {
    if (!this.model || !this.modelReady) {
      throw new Error('Model not ready');
    }

    try {
      const input = this.preprocessInput(candle, metrics, atr, adx);
      const prediction = await this.model.predict(input) as tf.Tensor;
      const [neutral, buy, sell] = Array.from(await prediction.data());

      // Clean up tensors
      input.dispose();
      prediction.dispose();

      // Determine signal and confidence
      const maxProb = Math.max(neutral, buy, sell);
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

      if (maxProb === buy && buy > 0.6) {
        signal = 'BUY';
      } else if (maxProb === sell && sell > 0.6) {
        signal = 'SELL';
      }

      return {
        signal,
        confidence: maxProb
      };
    } catch (error) {
      console.error('Error during AI analysis:', error);
      return {
        signal: 'NEUTRAL',
        confidence: 0
      };
    }
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.modelReady = false;
    }
  }
}

export const aiService = new AIService();
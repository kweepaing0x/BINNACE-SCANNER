import { OrderBookData, OrderBookMetrics } from '../types/trading';

export class OrderBookAnalyzer {
  private static calculateBidAskImbalance(bids: [number, number][], asks: [number, number][], currentPrice: number): number {
    const weightedBidVolume = bids.reduce((sum, [price, quantity]) => sum + quantity / (currentPrice - price + 1), 0);
    const weightedAskVolume = asks.reduce((sum, [price, quantity]) => sum + quantity / (price - currentPrice + 1), 0);
    
    return (weightedBidVolume - weightedAskVolume) / (weightedBidVolume + weightedAskVolume);
  }

  private static calculateLiquidity(bids: [number, number][], asks: [number, number][]): {
    bids: number;
    asks: number;
  } {
    const bidLiquidity = bids.reduce((sum, [price, quantity]) => sum + price * quantity, 0);
    const askLiquidity = asks.reduce((sum, [price, quantity]) => sum + price * quantity, 0);

    return {
      bids: bidLiquidity,
      asks: askLiquidity
    };
  }

  private static calculateDepth(bids: [number, number][], asks: [number, number][]): {
    bids: number;
    asks: number;
  } {
    return {
      bids: bids.length,
      asks: asks.length
    };
  }

  private static calculatePriceImpact(
    bids: [number, number][],
    asks: [number, number][],
    targetVolume: number
  ): {
    buy: number;
    sell: number;
  } {
    let buyImpact = 0;
    let sellImpact = 0;
    let accumulatedVolume = 0;
    
    // Calculate buy impact
    for (const [price, quantity] of asks) {
      accumulatedVolume += quantity;
      if (accumulatedVolume >= targetVolume) {
        buyImpact = (price - asks[0][0]) / asks[0][0];
        break;
      }
    }

    // Reset for sell impact calculation
    accumulatedVolume = 0;
    
    // Calculate sell impact
    for (const [price, quantity] of bids) {
      accumulatedVolume += quantity;
      if (accumulatedVolume >= targetVolume) {
        sellImpact = (bids[0][0] - price) / bids[0][0];
        break;
      }
    }

    return {
      buy: buyImpact,
      sell: sellImpact
    };
  }

  private static findSupportResistance(bids: [number, number][], asks: [number, number][]): {
    support: number;
    resistance: number;
  } {
    // Group orders by price levels and find volume clusters
    const volumeByPrice = new Map<number, number>();
    
    bids.forEach(([price, quantity]) => {
      const roundedPrice = Math.floor(price * 100) / 100;
      volumeByPrice.set(roundedPrice, (volumeByPrice.get(roundedPrice) || 0) + quantity);
    });
    
    asks.forEach(([price, quantity]) => {
      const roundedPrice = Math.floor(price * 100) / 100;
      volumeByPrice.set(roundedPrice, (volumeByPrice.get(roundedPrice) || 0) + quantity);
    });

    // Sort price levels by volume
    const sortedLevels = Array.from(volumeByPrice.entries())
      .sort(([, volumeA], [, volumeB]) => volumeB - volumeA);

    // Find support (highest volume among bids)
    const support = sortedLevels
      .find(([price]) => price <= bids[0][0])?.[0] || bids[0][0];

    // Find resistance (highest volume among asks)
    const resistance = sortedLevels
      .find(([price]) => price >= asks[0][0])?.[0] || asks[0][0];

    return { support, resistance };
  }

  private static calculateScore(metrics: OrderBookMetrics): number {
    let score = 0;
    
    // Bid-Ask imbalance contribution (0-3 points)
    const imbalanceScore = metrics.bidAskImbalance * 3;
    score += Math.abs(imbalanceScore);
    
    // Liquidity ratio contribution (0-2 points)
    const liquidityRatio = metrics.liquidity.bids / metrics.liquidity.asks;
    if (liquidityRatio > 1.2) score += 2;
    else if (liquidityRatio < 0.8) score -= 2;
    
    // Price impact contribution (0-3 points)
    if (metrics.priceImpact.buy < metrics.priceImpact.sell) score += 3;
    else if (metrics.priceImpact.sell < metrics.priceImpact.buy) score -= 3;

    return Math.min(Math.max(score, 0), 10); // Normalize to 0-10 scale
  }

  static analyzeOrderBook(orderBook: OrderBookData, targetVolume: number = 10): OrderBookMetrics {
    const currentPrice = (orderBook.bids[0][0] + orderBook.asks[0][0]) / 2;
    const bidAskImbalance = this.calculateBidAskImbalance(orderBook.bids, orderBook.asks, currentPrice);
    const liquidity = this.calculateLiquidity(orderBook.bids, orderBook.asks);
    const depth = this.calculateDepth(orderBook.bids, orderBook.asks);
    const priceImpact = this.calculatePriceImpact(orderBook.bids, orderBook.asks, targetVolume);
    const { support, resistance } = this.findSupportResistance(orderBook.bids, orderBook.asks);

    const metrics: OrderBookMetrics = {
      bidAskImbalance,
      liquidity,
      depth,
      priceImpact,
      support,
      resistance,
      currentPrice,
      score: 0
    };

    metrics.score = this.calculateScore(metrics);

    return metrics;
  }

  static interpretMetrics(metrics: OrderBookMetrics): {
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    reason: string;
    priceAction: string;
    alert: string | null;
  } {
    let score = metrics.score;
    const reasons: string[] = [];
    const currentPrice = metrics.currentPrice;

    // Determine price action relative to support/resistance
    let priceAction = 'Between levels';
    const supportDistance = Math.abs(currentPrice - metrics.support) / currentPrice;
    const resistanceDistance = Math.abs(currentPrice - metrics.resistance) / currentPrice;

    if (supportDistance < 0.001) {
      priceAction = 'At support';
      score += 1;
    } else if (resistanceDistance < 0.001) {
      priceAction = 'At resistance';
      score -= 1;
    }

    // Analyze bid-ask imbalance
    if (metrics.bidAskImbalance > 0.2) {
      reasons.push('Strong buying pressure');
      score += 2;
    } else if (metrics.bidAskImbalance < -0.2) {
      reasons.push('Strong selling pressure');
      score -= 2;
    }

    // Analyze liquidity
    const liquidityRatio = metrics.liquidity.bids / metrics.liquidity.asks;
    if (liquidityRatio > 1.2) {
      reasons.push('Higher bid liquidity');
      score += 1;
    } else if (liquidityRatio < 0.8) {
      reasons.push('Higher ask liquidity');
      score -= 1;
    }

    // Generate alert message
    let alert: string | null = null;
    if (score >= 8) {
      alert = 'Strong bullish signal detected!';
    } else if (score <= 2) {
      alert = 'Strong bearish signal detected!';
    }

    // Determine signal
    let signal: 'BUY' | 'SELL' | 'NEUTRAL';
    if (score >= 6) {
      signal = 'BUY';
    } else if (score <= 4) {
      signal = 'SELL';
    } else {
      signal = 'NEUTRAL';
    }

    // Calculate confidence (0-1)
    const confidence = Math.min(Math.abs(score) / 10, 1);

    return {
      signal,
      confidence,
      reason: reasons.join(', '),
      priceAction,
      alert
    };
  }
}
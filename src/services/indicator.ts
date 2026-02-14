import { Candle, IndicatorConfig, SwingPoint, FibonacciLevels, TrendAnalysis } from '../types/trading';

export class IndicatorService {
  private config: IndicatorConfig;

  constructor(config: IndicatorConfig) {
    this.config = config;
  }


  calculateATR(candles: Candle[], period: number): number[] {
    const trs: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;
      const prevClose = i > 0 ? candles[i - 1].close : currentLow; // Use currentLow if no previous candle

      const tr1 = currentHigh - currentLow;
      const tr2 = Math.abs(currentHigh - prevClose);
      const tr3 = Math.abs(currentLow - prevClose);
      trs.push(Math.max(tr1, tr2, tr3));
    }

    // ATR is typically an SMA of TR
    const atrs: number[] = [];
    for (let i = period - 1; i < trs.length; i++) {
      const sum = trs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      atrs.push(sum / period);
    }
    return atrs;
  }


  calculateADX(candles: Candle[], period: number): number[] {
    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevHigh = candles[i - 1].high;
      const prevLow = candles[i - 1].low;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevHigh),
        Math.abs(low - prevLow)
      );
      trs.push(tr);

      const plusDM = high - prevHigh;
      const minusDM = prevLow - low;

      if (plusDM > minusDM && plusDM > 0) {
        plusDMs.push(plusDM);
        minusDMs.push(0);
      } else if (minusDM > plusDM && minusDM > 0) {
        plusDMs.push(0);
        minusDMs.push(minusDM);
      } else {
        plusDMs.push(0);
        minusDMs.push(0);
      }
    }

    const smoothTRs: number[] = [];
    const smoothPlusDMs: number[] = [];
    const smoothMinusDMs: number[] = [];

    // Initial smoothing (SMA for the first 'period' values)
    let sumTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let sumPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let sumMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

    smoothTRs.push(sumTR);
    smoothPlusDMs.push(sumPlusDM);
    smoothMinusDMs.push(sumMinusDM);

    // Subsequent smoothing (Wilder's Smoothing)
    for (let i = period; i < trs.length; i++) {
      sumTR = smoothTRs[smoothTRs.length - 1] - (smoothTRs[smoothTRs.length - 1] / period) + trs[i];
      sumPlusDM = smoothPlusDMs[smoothPlusDMs.length - 1] - (smoothPlusDMs[smoothPlusDMs.length - 1] / period) + plusDMs[i];
      sumMinusDM = smoothMinusDMs[smoothMinusDMs.length - 1] - (smoothMinusDMs[smoothMinusDMs.length - 1] / period) + minusDMs[i];

      smoothTRs.push(sumTR);
      smoothPlusDMs.push(sumPlusDM);
      smoothMinusDMs.push(sumMinusDM);
    }

    const plusDIs: number[] = [];
    const minusDIs: number[] = [];
    const DXs: number[] = [];
    const ADXs: number[] = [];

    for (let i = 0; i < smoothTRs.length; i++) {
      const plusDI = (smoothPlusDMs[i] / smoothTRs[i]) * 100;
      const minusDI = (smoothMinusDMs[i] / smoothTRs[i]) * 100;
      plusDIs.push(plusDI);
      minusDIs.push(minusDI);

      const DX = (Math.abs(plusDI - minusDI) / (plusDI + minusDI || 1)) * 100;
      DXs.push(DX);
    }

    // ADX is the smoothed average of DX
    let sumDX = DXs.slice(0, period).reduce((a, b) => a + b, 0);
    ADXs.push(sumDX / period);

    for (let i = period; i < DXs.length; i++) {
      const adx = (ADXs[ADXs.length - 1] * (period - 1) + DXs[i]) / period;
      ADXs.push(adx);
    }

    return ADXs;
  }

  calculateMA(candles: Candle[], period: number): number[] {
    const closes = candles.map(c => c.close);
    const mas: number[] = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      mas.push(sum / period);
    }
    
    return mas;
  }

  calculateEMA(candles: Candle[], period: number): number[] {
    const closes = candles.map(c => c.close);
    const emas: number[] = [];
    const multiplier = 2 / (period + 1);

    // Initialize EMA with SMA
    const firstSMA = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emas.push(firstSMA);

    // Calculate EMA for remaining periods
    for (let i = period; i < closes.length; i++) {
      const ema = (closes[i] - emas[emas.length - 1]) * multiplier + emas[emas.length - 1];
      emas.push(ema);
    }

    return emas;
  }

  calculateVolumeMA(candles: Candle[], period: number): number[] {
    const volumes = candles.map(c => c.volume);
    const volumeMAs: number[] = [];
    
    for (let i = period - 1; i < volumes.length; i++) {
      const sum = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      volumeMAs.push(sum / period);
    }
    
    return volumeMAs;
  }

  calculateRSI(candles: Candle[], period: number): number[] {
    const changes = candles.map((candle, i) => 
      i === 0 ? 0 : candle.close - candles[i - 1].close
    );
    
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const avgGains: number[] = [];
    const avgLosses: number[] = [];
    
    let sumGain = gains.slice(0, period).reduce((a, b) => a + b, 0);
    let sumLoss = losses.slice(0, period).reduce((a, b) => a + b, 0);
    
    avgGains.push(sumGain / period);
    avgLosses.push(sumLoss / period);
    
    for (let i = period; i < changes.length; i++) {
      const avgGain = (avgGains[avgGains.length - 1] * (period - 1) + gains[i]) / period;
      const avgLoss = (avgLosses[avgLosses.length - 1] * (period - 1) + losses[i]) / period;
      
      avgGains.push(avgGain);
      avgLosses.push(avgLoss);
    }
    
    return avgGains.map((gain, i) => {
      const rs = gain / (avgLosses[i] || 1);
      return 100 - (100 / (1 + rs));
    });
  }

  private calculateBollingerBands(candles: Candle[], period: number, stdDev: number): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const closes = candles.map(c => c.close);
    const sma = this.calculateMA(closes, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const avg = sma[i - (period - 1)];
      const squaredDiffs = slice.map(value => Math.pow(value - avg, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(avg + (standardDeviation * stdDev));
      lower.push(avg - (standardDeviation * stdDev));
    }

    return { upper, middle: sma, lower };
  }

  private findSwingPoints(candles: Candle[], lookback: number = 10): SwingPoint[] {
    const swingPoints: SwingPoint[] = [];
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      const leftPrices = candles.slice(i - lookback, i).map(c => c.high);
      const rightPrices = candles.slice(i + 1, i + lookback + 1).map(c => c.high);
      const currentHigh = candles[i].high;
      
      if (currentHigh > Math.max(...leftPrices) && currentHigh > Math.max(...rightPrices)) {
        swingPoints.push({
          price: currentHigh,
          timestamp: candles[i].timestamp,
          type: 'HIGH'
        });
      }
      
      const leftLows = candles.slice(i - lookback, i).map(c => c.low);
      const rightLows = candles.slice(i + 1, i + lookback + 1).map(c => c.low);
      const currentLow = candles[i].low;
      
      if (currentLow < Math.min(...leftLows) && currentLow < Math.min(...rightLows)) {
        swingPoints.push({
          price: currentLow,
          timestamp: candles[i].timestamp,
          type: 'LOW'
        });
      }
    }
    
    return swingPoints;
  }

  private calculateFibonacciLevels(swingHigh: number, swingLow: number): FibonacciLevels {
    const range = swingHigh - swingLow;
    return {
      extension1618: swingHigh + (range * 1.618),
      retracement618: swingHigh - (range * 0.618)
    };
  }

  private isDailyBullish(candle: Candle): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;
    const isLongBody = bodySize > (totalSize * 0.6);
    return candle.close > candle.open && isLongBody;
  }

  private isDailyBearish(candle: Candle): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;
    const isLongBody = bodySize > (totalSize * 0.6);
    return candle.close < candle.open && isLongBody;
  }

  private calculateStochRSI(candles: Candle[]): { k: number[]; d: number[] } {
    if (!this.config.stochRSI) return { k: [], d: [] };

    const period = this.config.stochRSI.period;
    const kPeriod = this.config.stochRSI.kPeriod;
    const dPeriod = this.config.stochRSI.dPeriod;
    
    const rsi = this.calculateRSI(candles, period);
    
    const stochRSI: number[] = [];
    for (let i = period - 1; i < rsi.length; i++) {
      const rsiPeriod = rsi.slice(i - period + 1, i + 1);
      const highRSI = Math.max(...rsiPeriod);
      const lowRSI = Math.min(...rsiPeriod);
      const stoch = (rsi[i] - lowRSI) / (highRSI - lowRSI || 1) * 100;
      stochRSI.push(stoch);
    }
    
    const k: number[] = [];
    for (let i = kPeriod - 1; i < stochRSI.length; i++) {
      const sum = stochRSI.slice(i - kPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
      k.push(sum / kPeriod);
    }
    
    const d: number[] = [];
    for (let i = dPeriod - 1; i < k.length; i++) {
      const sum = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
      d.push(sum / dPeriod);
    }
    
    return { k, d };
  }

  analyzeTrend(candles: Candle[], dailyCandle: Candle): TrendAnalysis {
    if (candles.length < 50) {
      return {
        isValid: false,
        direction: 'NEUTRAL',
        rsi: 0,
        ema21: 0,
        ema50: 0,
        bbUpper: 0,
        bbLower: 0,
        bbMiddle: 0,
        volumeSpike: false,
        volumeRatio: 0,
        dailyCandle: 'BEARISH'
      };
    }

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate indicators
    const rsi = this.calculateRSI(candles, 14);
    const currentRSI = rsi[rsi.length - 1];

    const ema21Array = this.calculateEMA(closes, 21);
    const ema50Array = this.calculateEMA(closes, 50);
    const currentEMA21 = ema21Array[ema21Array.length - 1];
    const currentEMA50 = ema50Array[ema50Array.length - 1];

    const bb = this.calculateBollingerBands(candles, 20, 2);
    const currentBBUpper = bb.upper[bb.upper.length - 1];
    const currentBBLower = bb.lower[bb.lower.length - 1];
    const currentBBMiddle = bb.middle[bb.middle.length - 1];

    // Volume analysis
    const volumeMA = this.calculateVolumeMA(candles, 20);
    const currentVolume = candles[candles.length - 1].volume;
    const currentVolumeMA = volumeMA[volumeMA.length - 1];
    const volumeRatio = currentVolume / currentVolumeMA;
    const volumeSpike = volumeRatio > 2;

    // Determine daily candle pattern
    const dailyCandlePattern = this.isDailyBullish(dailyCandle) ? 'BULLISH' : 
                              this.isDailyBearish(dailyCandle) ? 'BEARISH' : 'NEUTRAL';

    // Determine trend direction
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    const isValid = currentRSI >= 30 && currentRSI <= 70 &&
                   currentPrice >= currentBBLower && currentPrice <= currentBBUpper &&
                   volumeSpike;

    if (isValid) {
      if (currentEMA21 > currentEMA50 && 
          currentPrice > currentEMA50 && currentPrice < currentEMA21 &&
          dailyCandlePattern === 'BULLISH') {
        direction = 'BULLISH';
      } else if (currentEMA21 < currentEMA50 && 
                currentPrice < currentEMA50 && currentPrice > currentEMA21 &&
                dailyCandlePattern === 'BEARISH') {
        direction = 'BEARISH';
      }
    }

    return {
      isValid,
      direction,
      rsi: currentRSI,
      ema21: currentEMA21,
      ema50: currentEMA50,
      bbUpper: currentBBUpper,
      bbLower: currentBBLower,
      bbMiddle: currentBBMiddle,
      volumeSpike,
      volumeRatio,
      dailyCandle: dailyCandlePattern as 'BULLISH' | 'BEARISH'
    };
  }

  calculateTradeLevels(candles: Candle[], direction: 'BULLISH' | 'BEARISH'): FibonacciLevels | null {
    const swingPoints = this.findSwingPoints(candles);
    if (swingPoints.length < 2) return null;

    // Sort swing points by timestamp in descending order
    const sortedPoints = swingPoints.sort((a, b) => b.timestamp - a.timestamp);

    let swingHigh: SwingPoint | undefined;
    let swingLow: SwingPoint | undefined;

    // Find the most recent swing high and low
    if (direction === 'BULLISH') {
      swingHigh = sortedPoints.find(p => p.type === 'HIGH');
      swingLow = sortedPoints.find(p => p.type === 'LOW' && p.timestamp < (swingHigh?.timestamp ?? 0));
    } else {
      swingLow = sortedPoints.find(p => p.type === 'LOW');
      swingHigh = sortedPoints.find(p => p.type === 'HIGH' && p.timestamp < (swingLow?.timestamp ?? 0));
    }

    if (!swingHigh || !swingLow) return null;

    return this.calculateFibonacciLevels(swingHigh.price, swingLow.price);
  }

  checkAlertConditions(candles: Candle[], dailyCandle?: Candle) {
    if (candles.length < 2) return {};

    const currentCandle = candles[candles.length - 1];
    const conditions: any = {};

    if (this.config.indicatorType === 'trend' && dailyCandle) {
      const trend = this.analyzeTrend(candles, dailyCandle);
      const levels = trend.direction !== 'NEUTRAL' ? this.calculateTradeLevels(candles, trend.direction) : null;

      return {
        ...trend,
        tradeLevels: levels
      };
    }

    if (this.config.indicatorType === 'volume' && this.config.volume) {
      const volumeMA = this.calculateVolumeMA(candles, this.config.volume.period);
      const currentVolume = currentCandle.volume;
      const lastVolumeMA = volumeMA[volumeMA.length - 1];

      conditions.volumeSpike = currentVolume > lastVolumeMA * this.config.volume.spikeThreshold;
      conditions.currentVolume = currentVolume;
      conditions.volumeMA = lastVolumeMA;
    }

    if (this.config.indicatorType === 'ema' && this.config.ema) {
      const emaFast = this.calculateEMA(candles, this.config.ema.fastPeriod);
      const emaSlow = this.calculateEMA(candles, this.config.ema.slowPeriod);

      const lastEmaFast = emaFast[emaFast.length - 1];
      const prevEmaFast = emaFast[emaFast.length - 2];
      const lastEmaSlow = emaSlow[emaSlow.length - 1];
      const prevEmaSlow = emaSlow[emaSlow.length - 2];

      conditions.emaCrossOver = prevEmaFast <= prevEmaSlow && lastEmaFast > lastEmaSlow;
      conditions.emaCrossUnder = prevEmaFast >= prevEmaSlow && lastEmaFast < lastEmaSlow;
      conditions.emaFast = lastEmaFast;
      conditions.emaSlow = lastEmaSlow;
    }

    if (this.config.indicatorType === 'price-ema' && this.config.priceEma) {
      const ema = this.calculateEMA(candles, this.config.priceEma.period);
      const currentPrice = currentCandle.close;
      const prevPrice = candles[candles.length - 2].close;
      const lastEma = ema[ema.length - 1];
      const prevEma = ema[ema.length - 2];

      conditions.priceCrossOver = prevPrice <= prevEma && currentPrice > lastEma;
      conditions.priceCrossUnder = prevPrice >= prevEma && currentPrice < lastEma;
      conditions.ema = lastEma;
      conditions.price = currentPrice;
    }

    if (this.config.indicatorType === 'ma' && this.config.ma) {
      const maFast = this.calculateMA(candles, this.config.ma.fastPeriod);
      const maSlow = this.calculateMA(candles, this.config.ma.slowPeriod);

      const lastMaFast = maFast[maFast.length - 1];
      const prevMaFast = maFast[maFast.length - 2];
      const lastMaSlow = maSlow[maSlow.length - 1];
      const prevMaSlow = maSlow[maSlow.length - 2];

      conditions.maCrossOver = prevMaFast <= prevMaSlow && lastMaFast > lastMaSlow;
      conditions.maCrossUnder = prevMaFast >= prevMaSlow && lastMaFast < lastMaSlow;
      conditions.maFast = lastMaFast;
      conditions.maSlow = lastMaSlow;
    }

    if (this.config.indicatorType === 'stoch-rsi' && this.config.stochRSI) {
      const { k, d } = this.calculateStochRSI(candles);
      
      const lastK = k[k.length - 1];
      const prevK = k[k.length - 2];
      const lastD = d[d.length - 1];
      const prevD = d[d.length - 2];
      
      conditions.stochRSICrossOver = prevK <= prevD && lastK > lastD;
      conditions.stochRSICrossUnder = prevK >= prevD && lastK < lastD;
      conditions.kValue = lastK;
      conditions.dValue = lastD;
    }

    if (this.config.indicatorType === 'atr' && this.config.atr) {
      const atrValues = this.calculateATR(candles, this.config.atr.period);
      conditions.atr = atrValues[atrValues.length - 1];
    }

    if (this.config.indicatorType === 'adx' && this.config.adx) {
      const adxValues = this.calculateADX(candles, this.config.adx.period);
      conditions.adx = adxValues[adxValues.length - 1];
    }

    return conditions;
  }
}
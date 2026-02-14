import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, ChevronUp, Clock, Wallet } from 'lucide-react';
import { binanceService } from './services/binance';
import { IndicatorService } from './services/indicator';
import { OrderBookAnalyzer } from './services/orderbook';
import { aiService } from './services/ai';
import { TradingPair, SignalLog, TIMEFRAMES, INDICATOR_TYPES, IndicatorConfig, OrderBookMetrics } from './types/trading';
import { WalletConnect } from './components/WalletConnect';
import { SecretPhraseLogin } from './components/SecretPhraseLogin';
import { TelegramSettings } from './components/TelegramSettings';
import { OrderBookAnalysis } from './components/OrderBookAnalysis';
import { AIToggle } from './components/AIToggle';
import { FuturesTrading } from './components/FuturesTrading';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import { authService } from './services/auth';
import { telegramService } from './services/telegram';
import type { AuthState } from './types/auth';

function App() {
  const { connected: solanaConnected, publicKey } = useWallet();
  const { connected: suiConnected, address } = useSuiWallet();
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [signalLogs, setSignalLogs] = useState<SignalLog[]>([]);
  const [showSignalLog, setShowSignalLog] = useState(true);
  const [config, setConfig] = useState<IndicatorConfig>({
    indicatorType: 'volume',
    timeframe: '1h',
    volume: {
      period: 20,
      spikeThreshold: 2
    },
    ema: {
      fastPeriod: 8,
      slowPeriod: 21
    },
    priceEma: {
      period: 21
    },
    ma: {
      fastPeriod: 10,
      slowPeriod: 20
    },
    stochRSI: {
      period: 14,
      kPeriod: 3,
      dPeriod: 3,
      overbought: 80,
      oversold: 20
    },
    atr: {
      period: 14
    },
    adx: {
      period: 14
    }
  });

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [futuresEnabled, setFuturesEnabled] = useState(false);
  const [futuresConfig, setFuturesConfig] = useState({
    enabled: false,
    apiKey: '',
    apiSecret: '',
    conditions: {
      volumeImbalance: 50,
      useEma: true,
      useFibonacci: true,
      stopLoss: 2,
      takeProfit: 20,
      leverage: 20
    },
    mode: 'manual'
  });

  const [secondaryIndicatorEnabled, setSecondaryIndicatorEnabled] = useState(false);
  const [secondaryIndicator, setSecondaryIndicator] = useState({
    type: 'ema',
    period: 20,
    timeframe: '1h'
  });

  const [notifications, setNotifications] = useState<boolean>(false);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    type: null,
    loading: true,
    error: null,
    rateLimited: false
  });

  const [orderBookEnabled, setOrderBookEnabled] = useState(false);
  const [orderBookMetrics, setOrderBookMetrics] = useState<OrderBookMetrics | null>(null);
  const [orderBookLoading, setOrderBookLoading] = useState(false);
  const [aggregationWindowMinutes] = useState(10);
  const [enableSignalAggregation, setEnableSignalAggregation] = useState(true);

  const isWalletConnected = solanaConnected || suiConnected;

  const handleAiToggle = async (enabled: boolean) => {
    setAiEnabled(enabled);
    if (enabled) {
      setAiLoading(true);
      try {
        await aiService.initialize();
      } catch (error) {
        console.error('Failed to initialize AI:', error);
        setAiEnabled(false);
      } finally {
        setAiLoading(false);
      }
    } else {
      aiService.dispose();
    }
  };

  const addSignalLog = async (
    log: Omit<SignalLog, 'id' | 'timestamp'>,
    secondaryStatus: string = ''
  ) => {
    const orderBookMetrics = await handleOrderBookAnalysis(log.symbol);
    
    let aiSignal = null;
    if (aiEnabled && orderBookMetrics && aiService.isReady()) {
      try {
        const candle = {
          timestamp: Date.now(),
          open: log.price,
          high: log.price,
          low: log.price,
          close: log.price,
          volume: 0
        };
        
        // Calculate ATR and ADX for AI input
        const indicatorServiceForAI = new IndicatorService(config);
        const atrValues = indicatorServiceForAI.calculateATR(klines, config.atr?.period || 14);
        const adxValues = indicatorServiceForAI.calculateADX(klines, config.adx?.period || 14);
        const currentATR = atrValues[atrValues.length - 1] || 0;
        const currentADX = adxValues[adxValues.length - 1] || 0;

        const analysis = await aiService.analyzeTrade(candle, orderBookMetrics, currentATR, currentADX);
        if (analysis.signal !== 'NEUTRAL') {
          aiSignal = {
            type: analysis.signal === 'BUY' ? 'AI_BUY' : 'AI_SELL',
            confidence: analysis.confidence
          };
        }
      } catch (error) {
        console.error('AI analysis error:', error);
      }
    }
    
    const newLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      orderBookMetrics,
      ...(aiSignal && { 
        type: aiSignal.type as SignalLog['type'],
        aiConfidence: aiSignal.confidence
      })
    };
    
    setSignalLogs(prev => [newLog, ...prev]);

    const telegramConfig = telegramService.loadConfig();
      if (telegramConfig.enabled) {
        let message = `
🔔 <b>New Signal Alert</b>

Symbol: ${log.symbol}
Type: ${log.type.replace(/_/g, ' ')}
Price: $${log.price.toFixed(8)}
Details: ${log.details}
${secondaryStatus ? `\nSecondary Indicator: ${secondaryStatus}` : ''}`;

        if (orderBookMetrics) {
          const interpretation = OrderBookAnalyzer.interpretMetrics(orderBookMetrics);
          message += `\n\n📊 <b>Order Book Analysis</b>\nSignal: ${interpretation.signal}\nConfidence: ${(interpretation.confidence * 100).toFixed(1)}%\nReason: ${interpretation.reason}\nBid/Ask Imbalance: ${(orderBookMetrics.bidAskImbalance * 100).toFixed(2)}%\nAnalysis Score: ${orderBookMetrics.score.toFixed(1)}/10\nSupport Level: $${orderBookMetrics.support.toFixed(2)}\nResistance Level: $${orderBookMetrics.resistance.toFixed(2)}`;
        }

        // Add ATR and ADX to the message if available
        const indicatorServiceForTelegram = new IndicatorService(config);
        const klinesForTelegram = await binanceService.getKlines(log.symbol, config.timeframe);
        if (klinesForTelegram.length > 0) {
          const atrValues = indicatorServiceForTelegram.calculateATR(klinesForTelegram, config.atr?.period || 14);
          const adxValues = indicatorServiceForTelegram.calculateADX(klinesForTelegram, config.adx?.period || 14);
          const currentATR = atrValues[atrValues.length - 1] || 0;
          const currentADX = adxValues[adxValues.length - 1] || 0;

          if (currentATR > 0) {
            message += `\n\n📈 <b>Technical Indicators</b>\nATR: ${currentATR.toFixed(4)}`;
          }
          if (currentADX > 0) {
            message += `\nADX: ${currentADX.toFixed(2)}`;
          }
        }

        if (aiSignal) {
          message += `\n\n🤖 <b>AI Analysis</b>\nSignal: ${aiSignal.type.replace('AI_', '')}\nConfidence: ${(aiSignal.confidence * 100).toFixed(1)}%`;
        }

        await telegramService.sendMessage(message);
      }
    };

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        setAuth(prev => ({ ...prev, isAuthenticated: true, type: 'PHRASE', loading: false }));
        return;
      }

      if (isWalletConnected) {
        const walletAddress = solanaConnected ? publicKey?.toString() : address;
        const network = solanaConnected ? 'solana' : 'sui';

        if (walletAddress) {
          const isWhitelisted = await authService.isWhitelisted(walletAddress, network);
          if (isWhitelisted) {
            setAuth(prev => ({ ...prev, isAuthenticated: true, type: 'WALLET', loading: false }));
          } else {
            setAuth(prev => ({ 
              ...prev, 
              isAuthenticated: false, 
              type: null, 
              loading: false,
              error: 'Your wallet is not whitelisted'
            }));
          }
        }
      } else {
        setAuth(prev => ({ ...prev, loading: false }));
      }
    };

    checkAuth();
  }, [isWalletConnected, publicKey, address, solanaConnected, suiConnected]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      const loadPairs = async () => {
        const tradingPairs = await binanceService.getAllTradingPairs();
        setPairs(tradingPairs);
      };
      loadPairs();
    }
  }, [auth.isAuthenticated]);

  const handleSecretPhraseLogin = async (phrase: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await authService.verifySecretPhrase(phrase);
      if (success) {
        setAuth(prev => ({ 
          ...prev, 
          isAuthenticated: true, 
          type: 'PHRASE',
          loading: false,
          error: null
        }));
      } else {
        throw new Error('Invalid secret phrase');
      }
    } catch (error) {
      setAuth(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Login failed'
      }));
    }
  };

  const handleLogout = () => {
    authService.logout();
    setAuth({
      isAuthenticated: false,
      type: null,
      loading: false,
      error: null,
      rateLimited: false
    });
    setSelectedPairs([]);
    setPairs([]);
    setSignalLogs([]);
    if (isMonitoring) {
      stopMonitoring();
    }
  };

  const handlePairSelect = (symbol: string) => {
    setSelectedPairs(prev => 
      prev.includes(symbol) 
        ? prev.filter(p => p !== symbol)
        : [...prev, symbol]
    );
  };

  const handleSelectAllPairs = () => {
    if (selectedPairs.length === pairs.length) {
      setSelectedPairs([]);
    } else {
      setSelectedPairs(pairs.map(pair => pair.symbol));
    }
  };

  const handleOrderBookAnalysis = async (symbol: string) => {
    if (!orderBookEnabled) return null;
    
    try {
      setOrderBookLoading(true);
      const orderBookData = await binanceService.getOrderBook(symbol);
      const metrics = OrderBookAnalyzer.analyzeOrderBook(orderBookData);
      setOrderBookMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Error analyzing order book:', error);
      return null;
    } finally {
      setOrderBookLoading(false);
    }
  };

  const getSecondaryIndicatorStatus = async (candle: any, indicatorService: IndicatorService) => {
    if (!secondaryIndicatorEnabled) return '';

    try {
      const secondaryCandles = await binanceService.getKlines(candle.symbol, secondaryIndicator.timeframe);
      const price = candle.close;
      let status = '';

      if (secondaryIndicator.type === 'ema') {
        const emaValues = indicatorService.calculateEMA(secondaryCandles, secondaryIndicator.period);
        const ema = emaValues[emaValues.length - 1];
        status = `Price $${price.toFixed(2)} is ${price > ema ? 'ABOVE' : 'BELOW'} EMA${secondaryIndicator.period} ($${ema.toFixed(2)}) on ${secondaryIndicator.timeframe}`;
      } else if (secondaryIndicator.type === 'sma') {
        const smaValues = indicatorService.calculateMA(secondaryCandles, secondaryIndicator.period);
        const sma = smaValues[smaValues.length - 1];
        status = `Price $${price.toFixed(2)} is ${price > sma ? 'ABOVE' : 'BELOW'} SMA${secondaryIndicator.period} ($${sma.toFixed(2)}) on ${secondaryIndicator.timeframe}`;
      } else if (secondaryIndicator.type === 'rsi') {
        const rsiValues = indicatorService.calculateRSI(secondaryCandles, secondaryIndicator.period);
        const rsi = rsiValues[rsiValues.length - 1];
        const rsiCondition = rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL';
        status = `RSI${secondaryIndicator.period}: ${rsi.toFixed(2)} (${rsiCondition}) on ${secondaryIndicator.timeframe}`;
      }

      return status;
    } catch (error) {
      console.error('Error calculating secondary indicator:', error);
      return '';
    }
  };

  const startMonitoring = async () => {
    if (!auth.isAuthenticated) {
      setStatus('Please connect your wallet or login to start monitoring');
      return;
    }

    try {
      if (selectedPairs.length === 0) {
        setStatus('Please select at least one trading pair');
        return;
      }

      setIsMonitoring(true);
      setStatus(`Monitoring started on ${config.timeframe} timeframe...`);
      setSignalLogs([]);

      if (notifications) {
        await Notification.requestPermission();
      }

      const indicatorService = new IndicatorService(config);

      selectedPairs.forEach(async symbol => {
        const initialKlines = await binanceService.getKlines(symbol, config.timeframe);
        
        binanceService.subscribeToKlines(symbol, config.timeframe, async (candle) => {
          const klines = await binanceService.getKlines(symbol, config.timeframe);
          const conditions = indicatorService.checkAlertConditions([...klines, candle]);
          const secondaryStatus = await getSecondaryIndicatorStatus(candle, indicatorService);

          // Calculate ATR and ADX for AI input
          const atrValues = indicatorService.calculateATR(klines, config.atr?.period || 14);
          const adxValues = indicatorService.calculateADX(klines, config.adx?.period || 14);
          const currentATR = atrValues[atrValues.length - 1] || 0;
          const currentADX = adxValues[adxValues.length - 1] || 0;

          if (aiEnabled && orderBookMetrics && aiService.isReady()) {
            try {
              const aiAnalysisCandle = {
                timestamp: Date.now(),
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume
              };
              
              const analysis = await aiService.analyzeTrade(aiAnalysisCandle, orderBookMetrics, currentATR, currentADX);
              if (analysis.signal !== 'NEUTRAL') {
                // This part of the code is already handled in addSignalLog, so no direct action here.
                // The AI signal will be added to the log when addSignalLog is called.
              }
            } catch (error) {
              console.error('AI analysis error in startMonitoring:', error);
            }
          }

          if (config.indicatorType === 'volume' && conditions.volumeSpike) {
            addSignalLog({
              symbol,
              type: 'VOLUME_SPIKE',
              timeframe: config.timeframe,
              price: candle.close,
              details: `Volume ${(conditions.currentVolume / conditions.volumeMA).toFixed(2)}x above average`
            }, candle, klines, currentATR, currentADX, secondaryStatus);
          }

          if (config.indicatorType === 'ema') {
            if (conditions.emaCrossOver) {
              addSignalLog({
                symbol,
                type: 'EMA_CROSS_OVER',
                timeframe: config.timeframe,
                price: candle.close,
                details: `EMA ${config.ema?.fastPeriod} crossed above EMA ${config.ema?.slowPeriod}`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            } else if (conditions.emaCrossUnder) {
              addSignalLog({
                symbol,
                type: 'EMA_CROSS_UNDER',
                timeframe: config.timeframe,
                price: candle.close,
                details: `EMA ${config.ema?.fastPeriod} crossed below EMA ${config.ema?.slowPeriod}`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            }
          }

          if (config.indicatorType === 'price-ema') {
            if (conditions.priceCrossOver) {
              addSignalLog({
                symbol,
                type: 'PRICE_CROSS_EMA',
                timeframe: config.timeframe,
                price: candle.close,
                details: `Price crossed above EMA ${config.priceEma?.period}`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            } else if (conditions.priceCrossUnder) {
              addSignalLog({
                symbol,
                type: 'PRICE_CROSS_EMA',
                timeframe: config.timeframe,
                price: candle.close,
                details: `Price crossed below EMA ${config.priceEma?.period}`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            }
          }

          if (config.indicatorType === 'ma') {
            if (conditions.maCrossOver) {
              addSignalLog({
                symbol,
                type: 'MA_CROSS_OVER',
                timeframe: config.timeframe,
                price: candle.close,
                details: `MA ${config.ma?.fastPeriod} crossed above MA ${config.ma?.slowPeriod}`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            } else if (conditions.maCrossUnder) {
              addSignalLog({
                symbol,
                type: 'MA_CROSS_UNDER',
                timeframe: config.timeframe,
                price: candle.close,
                details: `MA ${config.ma?.fastPeriod} crossed below MA ${config.ma?.slowPeriod}`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            }
          }

          if (config.indicatorType === 'stoch-rsi') {
            if (conditions.stochRSICrossOver) {
              addSignalLog({
                symbol,
                type: 'STOCH_RSI_CROSS',
                timeframe: config.timeframe,
                price: candle.close,
                details: `Stoch RSI K(${conditions.kValue.toFixed(2)}) crossed above D(${conditions.dValue.toFixed(2)})`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            } else if (conditions.stochRSICrossUnder) {
              addSignalLog({
                symbol,
                type: 'STOCH_RSI_CROSS',
                timeframe: config.timeframe,
                price: candle.close,
                details: `Stoch RSI K(${conditions.kValue.toFixed(2)}) crossed below D(${conditions.dValue.toFixed(2)})`
              }, candle, klines, currentATR, currentADX, secondaryStatus);
            }
          }

          if (config.indicatorType === 'atr' && conditions.atr) {
            addSignalLog({
              symbol,
              type: 'VOLUME_SPIKE', // Reusing VOLUME_SPIKE type for now, consider adding new types if needed
              timeframe: config.timeframe,
              price: candle.close,
              details: `ATR: ${conditions.atr.toFixed(4)}`
            }, candle, klines, currentATR, currentADX, secondaryStatus);
          }

          if (config.indicatorType === 'adx' && conditions.adx) {
            addSignalLog({
              symbol,
              type: 'VOLUME_SPIKE', // Reusing VOLUME_SPIKE type for now, consider adding new types if needed
              timeframe: config.timeframe,
              price: candle.close,
              details: `ADX: ${conditions.adx.toFixed(2)}`
            }, candle, klines, currentATR, currentADX, secondaryStatus);
          }
        });
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      setStatus('Error starting monitoring');
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    binanceService.disconnect();
    setIsMonitoring(false);
    setStatus('Monitoring stopped');
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-gray-900">Welcome to Trading Scanner</h1>
              <p className="text-gray-600">Connect your wallet or use a secret phrase to access the scanner</p>
            </div>
            
            <div className="space-y-6">
              <WalletConnect />
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <SecretPhraseLogin 
                onLogin={handleSecretPhraseLogin}
                loading={auth.loading}
                error={auth.error}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Trading Scanner</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`p-2 rounded-lg ${notifications ? 'text-indigo-600' : 'text-gray-400'} hover:bg-gray-100 transition-colors`}
                  title="Toggle Notifications"
                >
                  <Bell className="h-6 w-6" />
                </button>
                {auth.type === 'WALLET' ? (
                  <WalletConnect />
                ) : (
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Scanner Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Indicator Type</label>
                    <select
                      value={config.indicatorType}
                      onChange={(e) => setConfig(prev => ({ ...prev, indicatorType: e.target.value as any }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {INDICATOR_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timeframe</label>
                    <select
                      value={config.timeframe}
                      onChange={(e) => setConfig(prev => ({ ...prev, timeframe: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {TIMEFRAMES.map(tf => (
                        <option key={tf.value} value={tf.value}>{tf.label}</option>
                      ))}
                    </select>
                  </div>

                  {config.indicatorType === 'volume' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Volume MA Period</label>
                        <input
                          type="number"
                          value={config.volume?.period}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            volume: { ...prev.volume!, period: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Volume Spike Threshold</label>
                        <input
                          type="number"
                          value={config.volume?.spikeThreshold}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            volume: { ...prev.volume!, spikeThreshold: parseFloat(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          step="0.1"
                        />
                      </div>
                    </>
                  )}

                  {config.indicatorType === 'ema' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fast EMA Period</label>
                        <input
                          type="number"
                          value={config.ema?.fastPeriod}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            ema: { ...prev.ema!, fastPeriod: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Slow EMA Period</label>
                        <input
                          type="number"
                          value={config.ema?.slowPeriod}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            ema: { ...prev.ema!, slowPeriod: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {config.indicatorType === 'price-ema' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">EMA Period</label>
                      <input
                        type="number"
                        value={config.priceEma?.period}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          priceEma: { ...prev.priceEma!, period: parseInt(e.target.value) }
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {config.indicatorType === 'ma' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fast MA Period</label>
                        <input
                          type="number"
                          value={config.ma?.fastPeriod}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            ma: { ...prev.ma!, fastPeriod: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Slow MA Period</label>
                        <input
                          type="number"
                          value={config.ma?.slowPeriod}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            ma: { ...prev.ma!, slowPeriod: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {config.indicatorType === 'stoch-rsi' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">RSI Period</label>
                        <input
                          type="number"
                          value={config.stochRSI?.period}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            stochRSI: { ...prev.stochRSI!, period: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">K Period</label>
                        <input
                          type="number"
                          value={config.stochRSI?.kPeriod}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            stochRSI: { ...prev.stochRSI!, kPeriod: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">D Period</label>
                        <input
                          type="number"
                          value={config.stochRSI?.dPeriod}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            stochRSI: { ...prev.stochRSI!, dPeriod: parseInt(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <TelegramSettings />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Trading Pairs</h3>
                  <button
                    onClick={handleSelectAllPairs}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {selectedPairs.length === pairs.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pairs.map((pair) => (
                    <div
                      key={pair.symbol}
                      onClick={() => handlePairSelect(pair.symbol)}
                      className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPairs.includes(pair.symbol)
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      } border`}
                    >
                      <span className="font-medium">{pair.symbol}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Secondary Indicator</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={secondaryIndicatorEnabled}
                        onChange={(e) => setSecondaryIndicatorEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {secondaryIndicatorEnabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Indicator Type</label>
                        <select
                          value={secondaryIndicator.type}
                          onChange={(e) => setSecondaryIndicator(prev => ({ ...prev, type: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="ema">EMA</option>
                          <option value="sma">SMA</option>
                          <option value="rsi">RSI</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Timeframe</label>
                        <select
                          value={secondaryIndicator.timeframe}
                          onChange={(e) => setSecondaryIndicator(prev => ({ ...prev, timeframe: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          {TIMEFRAMES.map(tf => (
                            <option key={tf.value} value={tf.value}>{tf.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Period</label>
                        <input
                          type="number"
                          value={secondaryIndicator.period}
                          onChange={(e) => setSecondaryIndicator(prev => ({ ...prev, period: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <AIToggle 
              enabled={aiEnabled}
              onToggle={handleAiToggle}
              loading={aiLoading}
            />
            
            <FuturesTrading
              enabled={futuresEnabled}
              onToggle={setFuturesEnabled}
              onConfigChange={setFuturesConfig}
            />
            
            <OrderBookAnalysis
              enabled={orderBookEnabled}
              onToggle={setOrderBookEnabled}
              metrics={orderBookMetrics || undefined}
              loading={orderBookLoading}
            />

            <div className="border rounded-lg overflow-hidden">
              <div 
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setShowSignalLog(!showSignalLog)}
              >
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">Signal Log</h3>
                  {signalLogs.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-sm font-medium">
                      {signalLogs.length}
                    </span>
                  )}
                </div>
                {showSignalLog ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              {showSignalLog && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {signalLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.symbol}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.type === 'VOLUME_SPIKE' 
                                ? 'bg-purple-100 text-purple-800'
                                : log.type.includes('MA') || log.type.includes('EMA')
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {log.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.price.toFixed(8)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.details}</td>
                        </tr>
                      ))}
                      {signalLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-sm text-gray-500 text-center">
                            No signals detected yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {status && (
              <div className={`p-4 rounded-lg ${
                status.includes('Error')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {status}
              </div>
            )}

            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
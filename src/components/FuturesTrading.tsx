import React, { useState } from 'react';
import { Lock, Percent, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';

interface FuturesTradingConfig {
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
    useVolatilitySizing: boolean;
    trailingStopPercentage: number;
  };
  mode: 'auto' | 'manual';
}

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onConfigChange: (config: FuturesTradingConfig) => void;
}

export const FuturesTrading: React.FC<Props> = ({
  enabled,
  onToggle,
  onConfigChange
}) => {
  const [config, setConfig] = useState<FuturesTradingConfig>({
    enabled: false,
    apiKey: '',
    apiSecret: '',
    conditions: {
      volumeImbalance: 50,
      useEma: true,
      useFibonacci: true,
      stopLoss: 2,
      takeProfit: 20,
      leverage: 20,
      initialMargin: 1,
      useVolatilitySizing: false,
      trailingStopPercentage: 0.5
    },
    mode: 'manual'
  });

  const [showSecrets, setShowSecrets] = useState(false);

  const handleChange = (field: string, value: any) => {
    const newConfig = {
      ...config,
      [field]: value
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleConditionChange = (field: string, value: any) => {
    const newConfig = {
      ...config,
      conditions: {
        ...config.conditions,
        [field]: value
      }
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Futures Trading</h3>
            <p className="text-sm text-gray-500">Configure automated futures trading settings</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                        peer-focus:ring-purple-300 rounded-full peer 
                        peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                        peer-checked:after:border-white after:content-[''] after:absolute 
                        after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 
                        after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                        peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-6">
          <div className="p-4 bg-yellow-50 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-600">
              <p className="font-medium">Important Notice</p>
              <p>Futures trading involves significant risks. Please ensure you understand the risks before enabling this feature.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">API Configuration</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter your Binance API key"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">API Secret</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={config.apiSecret}
                    onChange={(e) => handleChange('apiSecret', e.target.value)}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter your Binance API secret"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowSecrets(!showSecrets)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <Lock className="w-4 h-4 mr-1" />
                {showSecrets ? 'Hide' : 'Show'} API Keys
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Trading Conditions</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Initial Margin
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={config.conditions.initialMargin}
                    onChange={(e) => handleConditionChange('initialMargin', parseFloat(e.target.value))}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    min="1"
                    step="1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Minimum amount to enter a trade</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Volume Imbalance Threshold
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={config.conditions.volumeImbalance}
                    onChange={(e) => handleConditionChange('volumeImbalance', parseInt(e.target.value))}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    min="1"
                    max="100"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stop Loss
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={config.conditions.stopLoss}
                    onChange={(e) => handleConditionChange('stopLoss', parseFloat(e.target.value))}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    min="0.1"
                    max="10"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Take Profit
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={config.conditions.takeProfit}
                    onChange={(e) => handleConditionChange('takeProfit', parseFloat(e.target.value))}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    min="1"
                    max="100"
                    step="1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Leverage
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={config.conditions.leverage}
                    onChange={(e) => handleConditionChange("leverage", parseInt(e.target.value))}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    min="1"
                    max="125"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trailing Stop Percentage
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={config.conditions.trailingStopPercentage}
                    onChange={(e) => handleConditionChange("trailingStopPercentage", parseFloat(e.target.value))}
                    className="block w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    min="0.1"
                    max="5"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Percentage below entry price for trailing stop</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.conditions.useVolatilitySizing}
                  onChange={(e) => handleConditionChange("useVolatilitySizing", e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Use Volatility-Based Position Sizing
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.conditions.useEma}
                  onChange={(e) => handleConditionChange("useEma", e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Use EMA Cross Strategy
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.conditions.useFibonacci}
                  onChange={(e) => handleConditionChange('useFibonacci', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Use 4H Fibonacci 50% Level
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Execution Mode</h4>
            <div className="flex space-x-4">
              <button
                onClick={() => handleChange('mode', 'manual')}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  config.mode === 'manual'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Manual Execution
              </button>
              <button
                onClick={() => handleChange('mode', 'auto')}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  config.mode === 'auto'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Auto Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
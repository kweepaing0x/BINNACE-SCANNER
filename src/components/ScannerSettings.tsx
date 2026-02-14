import React from 'react';
import { IndicatorConfig, INDICATOR_TYPES, TIMEFRAMES } from '../types/trading';

interface Props {
  config: IndicatorConfig;
  onConfigChange: (config: IndicatorConfig) => void;
}

export const ScannerSettings: React.FC<Props> = ({ config, onConfigChange }) => {
  const handleConfigChange = (changes: Partial<IndicatorConfig>) => {
    onConfigChange({ ...config, ...changes });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Scanner Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Indicator Type</label>
          <select
            value={config.indicatorType}
            onChange={(e) => handleConfigChange({ indicatorType: e.target.value as any })}
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
            onChange={(e) => handleConfigChange({ timeframe: e.target.value })}
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
                onChange={(e) => handleConfigChange({
                  volume: { ...config.volume!, period: parseInt(e.target.value) }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Volume Spike Threshold</label>
              <input
                type="number"
                value={config.volume?.spikeThreshold}
                onChange={(e) => handleConfigChange({
                  volume: { ...config.volume!, spikeThreshold: parseFloat(e.target.value) }
                })}
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
                onChange={(e) => handleConfigChange({
                  ema: { ...config.ema!, fastPeriod: parseInt(e.target.value) }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slow EMA Period</label>
              <input
                type="number"
                value={config.ema?.slowPeriod}
                onChange={(e) => handleConfigChange({
                  ema: { ...config.ema!, slowPeriod: parseInt(e.target.value) }
                })}
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
              onChange={(e) => handleConfigChange({
                priceEma: { ...config.priceEma!, period: parseInt(e.target.value) }
              })}
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
                onChange={(e) => handleConfigChange({
                  ma: { ...config.ma!, fastPeriod: parseInt(e.target.value) }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slow MA Period</label>
              <input
                type="number"
                value={config.ma?.slowPeriod}
                onChange={(e) => handleConfigChange({
                  ma: { ...config.ma!, slowPeriod: parseInt(e.target.value) }
                })}
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
                onChange={(e) => handleConfigChange({
                  stochRSI: { ...config.stochRSI!, period: parseInt(e.target.value) }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">K Period</label>
              <input
                type="number"
                value={config.stochRSI?.kPeriod}
                onChange={(e) => handleConfigChange({
                  stochRSI: { ...config.stochRSI!, kPeriod: parseInt(e.target.value) }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">D Period</label>
              <input
                type="number"
                value={config.stochRSI?.dPeriod}
                onChange={(e) => handleConfigChange({
                  stochRSI: { ...config.stochRSI!, dPeriod: parseInt(e.target.value) }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
import React from 'react';
import { TIMEFRAMES } from '../types/trading';

interface SecondaryIndicator {
  type: string;
  period: number;
  timeframe: string;
}

interface Props {
  enabled: boolean;
  indicator: SecondaryIndicator;
  onToggle: (enabled: boolean) => void;
  onChange: (indicator: SecondaryIndicator) => void;
}

export const SecondaryIndicatorSettings: React.FC<Props> = ({
  enabled,
  indicator,
  onToggle,
  onChange
}) => {
  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-semibold text-gray-900">Secondary Indicator</h4>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Indicator Type</label>
            <select
              value={indicator.type}
              onChange={(e) => onChange({ ...indicator, type: e.target.value })}
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
              value={indicator.timeframe}
              onChange={(e) => onChange({ ...indicator, timeframe: e.target.value })}
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
              value={indicator.period}
              onChange={(e) => onChange({ ...indicator, period: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
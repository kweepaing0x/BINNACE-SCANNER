import React from 'react';
import { BarChart3, Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { OrderBookMetrics } from '../types/trading';
import { OrderBookAnalyzer } from '../services/orderbook';

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  metrics?: OrderBookMetrics;
  loading?: boolean;
}

export const OrderBookAnalysis: React.FC<Props> = ({
  enabled,
  onToggle,
  metrics,
  loading
}) => {
  const interpretation = metrics ? OrderBookAnalyzer.interpretMetrics(metrics) : null;

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Order Book Analysis</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : metrics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">Bid-Ask Imbalance</div>
                  <div className="mt-1 text-lg font-semibold">
                    {(metrics.bidAskImbalance * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {metrics.bidAskImbalance > 0 ? 'More buying pressure' : 'More selling pressure'}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">Analysis Score</div>
                  <div className="mt-1 text-lg font-semibold">
                    {metrics.score.toFixed(1)} / 10
                  </div>
                  <div className="text-sm text-gray-500">Overall strength</div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">Support Level</div>
                  <div className="mt-1 text-lg font-semibold">
                    ${metrics.support.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Key support price</div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">Resistance Level</div>
                  <div className="mt-1 text-lg font-semibold">
                    ${metrics.resistance.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Key resistance price</div>
                </div>
              </div>

              {interpretation && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-600">Current Price Action</div>
                      <div className="flex items-center space-x-2">
                        {interpretation.signal === 'BUY' ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : interpretation.signal === 'SELL' ? (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        ) : null}
                        <span className="text-sm font-medium">
                          {interpretation.priceAction}
                        </span>
                      </div>
                    </div>
                  </div>

                  {interpretation.alert && (
                    <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                      interpretation.signal === 'BUY' 
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">{interpretation.alert}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No order book data available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
import React from 'react';
import type { TradingPair } from '../types/trading';

interface Props {
  pairs: TradingPair[];
  selectedPairs: string[];
  onPairSelect: (symbol: string) => void;
  onSelectAll: () => void;
}

export const TradingPairsList: React.FC<Props> = ({
  pairs,
  selectedPairs,
  onPairSelect,
  onSelectAll
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Trading Pairs</h3>
        <button
          onClick={onSelectAll}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {selectedPairs.length === pairs.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {pairs.map((pair) => (
          <div
            key={pair.symbol}
            onClick={() => onPairSelect(pair.symbol)}
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
    </div>
  );
};
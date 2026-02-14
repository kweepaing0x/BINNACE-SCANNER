import React from 'react';
import { Brain } from 'lucide-react';

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  loading?: boolean;
}

export const AIToggle: React.FC<Props> = ({ enabled, onToggle, loading }) => {
  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-purple-100' : 'bg-gray-100'}`}>
            <Brain 
              className={`w-6 h-6 ${enabled ? 'text-purple-600' : 'text-gray-400'} ${
                loading ? 'animate-pulse' : ''
              }`} 
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Analysis</h3>
            <p className="text-sm text-gray-500">
              {enabled 
                ? 'Using TensorFlow.js for enhanced signal analysis' 
                : 'Enable AI-powered analysis'}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
            disabled={loading}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                        peer-focus:ring-purple-300 rounded-full peer 
                        peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                        peer-checked:after:border-white after:content-[''] after:absolute 
                        after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 
                        after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                        peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
        </label>
      </div>

      {enabled && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-500"
                  style={{ width: loading ? '90%' : '100%' }}
                ></div>
              </div>
            </div>
            <span className="text-sm font-medium text-purple-600">
              {loading ? 'Loading model...' : 'Model ready'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
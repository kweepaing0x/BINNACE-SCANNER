import React from 'react';
import { Clock } from 'lucide-react';
import type { SignalLog } from '../types/trading';

interface Props {
  logs: SignalLog[];
}

export const SignalLogTable: React.FC<Props> = ({ logs }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  (log.count || 1) > 1 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {log.count || 1}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.price.toFixed(8)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.details}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                No signals detected yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
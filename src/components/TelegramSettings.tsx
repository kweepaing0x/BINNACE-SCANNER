import React, { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { telegramService } from '../services/telegram';

export const TelegramSettings: React.FC = () => {
  const [config, setConfig] = useState({
    botToken: '',
    chatId: '',
    enabled: false
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    const savedConfig = telegramService.loadConfig();
    setConfig(savedConfig);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    telegramService.setConfig(config);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      telegramService.setConfig(config);
      const success = await telegramService.testConnection();
      setTestResult(success);
    } catch (error) {
      setTestResult(false);
      console.error('Test connection failed:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Telegram Notifications</h3>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="enabled"
            className="sr-only peer"
            checked={config.enabled}
            onChange={handleChange}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bot Token
          </label>
          <input
            type="password"
            name="botToken"
            value={config.botToken}
            onChange={handleChange}
            placeholder="Enter your Telegram bot token"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Create a bot through @BotFather on Telegram to get your bot token
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Chat ID
          </label>
          <input
            type="text"
            name="chatId"
            value={config.chatId}
            onChange={handleChange}
            placeholder="Enter your Telegram chat ID"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Send a message to @userinfobot to get your chat ID
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            disabled={!config.enabled || !config.botToken || !config.chatId}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors"
          >
            Save Settings
          </button>

          <button
            onClick={handleTest}
            disabled={!config.botToken || !config.chatId || testing}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 
                     rounded-lg text-gray-700 bg-white hover:bg-gray-50 
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 
                     focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            {testing ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Testing...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Test Connection
              </>
            )}
          </button>
        </div>

        {testResult !== null && (
          <div className={`flex items-center p-4 rounded-lg ${
            testResult ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {testResult ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Connection test successful! Check your Telegram for the test message.
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 mr-2" />
                Connection test failed. Please verify your bot token and chat ID.
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
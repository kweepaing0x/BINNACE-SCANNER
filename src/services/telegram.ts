import axios from 'axios';

class TelegramService {
  private botToken: string | null = null;
  private chatId: string | null = null;
  private enabled: boolean = false;

  setConfig(config: { botToken: string; chatId: string; enabled: boolean }) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.enabled = config.enabled;

    // Store in localStorage
    localStorage.setItem('telegramConfig', JSON.stringify(config));
  }

  loadConfig(): { botToken: string; chatId: string; enabled: boolean } {
    const stored = localStorage.getItem('telegramConfig');
    if (stored) {
      const config = JSON.parse(stored);
      this.botToken = config.botToken;
      this.chatId = config.chatId;
      this.enabled = config.enabled;
      return config;
    }
    return { botToken: '', chatId: '', enabled: false };
  }

  async sendMessage(message: string): Promise<boolean> {
    if (!this.enabled || !this.botToken || !this.chatId) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      return false;
    }

    try {
      const testMessage = '🤖 Trading Scanner Bot connection test successful!';
      return await this.sendMessage(testMessage);
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
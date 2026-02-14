class NotificationService {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  sendNotification(title: string, body: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      new Notification(title, {
        body,
        icon: '/notification-icon.png'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
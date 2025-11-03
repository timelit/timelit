import { differenceInMinutes, parseISO } from 'date-fns';

class NotificationManager {
  constructor() {
    this.items = []; // Will hold both events and tasks
    this.scheduledNotifications = new Set();
    this.intervalId = null;
    this.isStarted = false;
  }

  isSupported() {
    return 'Notification' in window;
  }

  getPermissionStatus() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestPermission() {
    if (!this.isSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  showNotification(item) {
    if (this.getPermissionStatus() !== 'granted' || !item.title) return;

    const startTime = item.start_time || item.scheduled_start_time;
    const body = `Starts at ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    new Notification(item.title, {
      body,
      tag: item.id, // Use item ID as tag to prevent duplicate notifications
      icon: '/timelit-logo.png'
    });
  }

  // Combined scheduling logic for both events and tasks
  scheduleNotificationsForUpcomingItems() {
    if (this.getPermissionStatus() !== 'granted') return;

    const now = new Date();

    this.items.forEach(item => {
      const startTime = item.start_time || item.scheduled_start_time;
      if (!item.notification_enabled || this.scheduledNotifications.has(item.id) || !startTime) {
        return;
      }
      
      const itemStartTime = parseISO(startTime);
      const minutesUntilStart = differenceInMinutes(itemStartTime, now);
      
      // Default to 15 minutes if timing is invalid
      const notificationTiming = parseInt(String(item.notification_timing).replace(/\D/g, '')) || 15;

      if (minutesUntilStart > 0 && minutesUntilStart <= notificationTiming) {
        this.showNotification(item);
        this.scheduledNotifications.add(item.id);
        
        // Clean up old scheduled notifications to allow re-scheduling if app is open for long
        setTimeout(() => this.scheduledNotifications.delete(item.id), notificationTiming * 60 * 1000 * 2);
      }
    });
  }

  // Method to update the items to be checked
  updateItems(newItems = []) {
    this.items = newItems;
    // When items are updated, run an immediate check
    this.scheduleNotificationsForUpcomingItems();
  }

  start() {
    if (this.isStarted) return; // Prevent multiple intervals

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    console.log("Notification manager started.");
    this.isStarted = true;
    
    // Check for notifications every 30 seconds for more timely reminders
    this.intervalId = setInterval(() => {
      this.scheduleNotificationsForUpcomingItems();
    }, 30 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isStarted = false;
      console.log("Notification manager stopped.");
    }
  }
}

// Export a singleton instance
export const notificationManager = new NotificationManager();
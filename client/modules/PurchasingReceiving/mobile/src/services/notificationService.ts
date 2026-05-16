import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
class NotificationService {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }
      if (Constants.expoConfig?.extra?.projectId) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig.extra.projectId,
        });
        return token.data;
      }
      return null;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }
  addNotificationResponseListener(
    callback: (notification: Notifications.Notification) => void,
  ) {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      callback(response.notification);
    });
  }
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void,
  ) {
    return Notifications.addNotificationReceivedListener((notification) => {
      callback(notification);
    });
  }
  async scheduleNotification(
    title: string,
    body: string,
    delaySeconds: number = 5,
  ) {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { timestamp: new Date().toISOString() } },
      trigger: { seconds: delaySeconds },
    });
  }
  async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger: null,
    });
  }
  async dismissNotification(notificationId: string) {
    return await Notifications.dismissNotificationAsync(notificationId);
  }
  async dismissAllNotifications() {
    return await Notifications.dismissAllNotificationsAsync();
  }
}
export const notificationService = new NotificationService();

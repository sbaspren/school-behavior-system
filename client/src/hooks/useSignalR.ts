import { useEffect, useRef, useState, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel, HttpTransportType } from '@microsoft/signalr';

interface Notification {
  type: string;
  data: any;
  timestamp: string;
}

const HUB_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/hub/notifications'
  : '/hub/notifications';

export function useSignalR() {
  const connectionRef = useRef<HubConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        transport: HttpTransportType.LongPolling,
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();

    connection.on('ReceiveNotification', (notification: Notification) => {
      setLastNotification(notification);
      setNotifications(prev => [notification, ...prev].slice(0, 50));
    });

    connection.onclose(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));

    connection.start()
      .then(() => setConnected(true))
      .catch(() => { /* SignalR unavailable — notifications disabled */ });

    connectionRef.current = connection;

    return () => {
      connection.stop().catch(() => {});
    };
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setLastNotification(null);
  }, []);

  return { connected, notifications, lastNotification, clearNotifications };
}

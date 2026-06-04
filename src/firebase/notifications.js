import { db, isMock } from './config';
import { doc, setDoc } from 'firebase/firestore';

// Helper to convert base64 to Uint8Array for VAPID subscription
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const requestNotificationPermission = async (userId) => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('Notifications not supported in this browser.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    // Get active service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // VAPID Public Key from environment
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error('VITE_VAPID_PUBLIC_KEY is not defined in environment.');
      return null;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

    // Subscribe to push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // Save to database
    if (isMock) {
      localStorage.setItem(`days_push_subscription_${userId}`, JSON.stringify(subscription));
      console.log('Push subscription saved to mock database.');
    } else {
      const docRef = doc(db, 'users', userId, 'pushSubscription', 'current');
      await setDoc(docRef, subscription.toJSON(), { merge: true });
      console.log('Push subscription saved to Firestore.');
    }

    return subscription;
  } catch (err) {
    console.error('Error subscribing to push notifications:', err);
    return null;
  }
};

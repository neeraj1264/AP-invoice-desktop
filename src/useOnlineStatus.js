import { useState, useEffect } from 'react';
import { BASE_URL } from './api';

let isOnline = true; // Shared module state
let listeners = new Set(); // All component listeners

const checkBackend = async () => {
  try {
    const res = await fetch(`${BASE_URL}/categories`, { method: "HEAD" });
    const newStatus = res.ok;
    if (newStatus !== isOnline) {
      isOnline = newStatus;
      listeners.forEach(listener => listener(isOnline));
    }
    return isOnline;
  } catch {
    if (isOnline !== false) {
      isOnline = false;
      listeners.forEach(listener => listener(isOnline));
    }
    return false;
  }
};

export function useOnlineStatus() {
  const [onlineStatus, setOnlineStatus] = useState(isOnline);

  useEffect(() => {
    listeners.add(setOnlineStatus);
    const interval = setInterval(checkBackend, 5000);
    return () => {
      listeners.delete(setOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  return { 
    isOnline: onlineStatus,
    checkBackend 
  };
}
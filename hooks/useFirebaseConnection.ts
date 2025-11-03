"use client";

import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { getDatabase } from "firebase/database";
import app from "@/lib/firebase";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export function useFirebaseConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  useEffect(() => {
    try {
      // Get Realtime Database instance
      const database = getDatabase(app);
      const connectedRef = ref(database, ".info/connected");

      // Listen to connection status
      const listener = onValue(
        connectedRef,
        (snapshot) => {
          const isConnected = snapshot.val();
          if (isConnected) {
            setStatus("connected");
            setLastConnected(new Date());
          } else {
            setStatus("disconnected");
          }
        },
        (error) => {
          console.error("Connection monitoring error:", error);
          setStatus("disconnected");
        }
      );

      // Cleanup
      return () => {
        off(connectedRef);
      };
    } catch (error) {
      console.error("Failed to initialize connection monitoring:", error);
      setStatus("disconnected");
    }
  }, []);

  return { status, lastConnected };
}

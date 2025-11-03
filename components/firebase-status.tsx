"use client";

import { useFirebaseConnection } from "@/hooks/useFirebaseConnection";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function FirebaseStatus() {
  const { status, lastConnected } = useFirebaseConnection();

  const statusConfig = {
    connected: {
      icon: Wifi,
      variant: "default" as const,
      label: "Connected",
      className: "bg-green-500 hover:bg-green-600",
    },
    disconnected: {
      icon: WifiOff,
      variant: "destructive" as const,
      label: "Disconnected",
      className: "",
    },
    connecting: {
      icon: RefreshCw,
      variant: "secondary" as const,
      label: "Connecting...",
      className: "animate-spin",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
      {status === "connected" && lastConnected && (
        <span className="ml-1 text-xs opacity-75">
          ({lastConnected.toLocaleTimeString()})
        </span>
      )}
    </Badge>
  );
}

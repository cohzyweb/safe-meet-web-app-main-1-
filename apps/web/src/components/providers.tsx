"use client";

import { ReactNode, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { WagmiProvider, useAccount } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "viem/chains";
import { flowEvmTestnet, flowEvmMainnet } from "@/lib/chain";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { clearAuthToken } from "@/lib/api/client";
import { authApi, notificationsApi } from "@/lib/api/endpoints";

// ------------------------------------------------------------
// Wagmi / RainbowKit config
// ------------------------------------------------------------

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "local-dev-project-id";

const wagmiConfig = getDefaultConfig({
  appName: "SafeMeet",
  projectId: walletConnectProjectId,
  chains: [flowEvmTestnet, baseSepolia, flowEvmMainnet],
  ssr: false,
});

// ------------------------------------------------------------
// QueryClient singleton
// ------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// ------------------------------------------------------------
// useWallet — thin wrapper over wagmi useAccount
// ------------------------------------------------------------

export function useWallet(): { walletAddress: string | null; isConnected: boolean } {
  const { address, isConnected } = useAccount();
  return {
    walletAddress: isConnected && address ? address : null,
    isConnected,
  };
}

// ------------------------------------------------------------
// Providers tree
// ------------------------------------------------------------

// Runs SIWE auth whenever a wallet connects — must be inside WagmiProvider
function AuthWatcher() {
  useAuth();
  const { isConnected } = useAccount();
  const queryClient = useQueryClient();
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
      return;
    }

    if (!wasConnectedRef.current) return;

    wasConnectedRef.current = false;
    void authApi.logout().catch(() => undefined).finally(() => {
      clearAuthToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("safemeet_jwt_wallet");
        // Dispatch storage event so nav/guards pick up auth change
        window.dispatchEvent(new Event("storage"));
      }
      queryClient.clear();
    });
  }, [isConnected, queryClient]);

  useEffect(() => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!isConnected || !vapidPublicKey) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registerPush = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSub = await registration.pushManager.getSubscription();
      const subscription =
        existingSub ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        }));

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await notificationsApi.subscribePush({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
    };

    void registerPush().catch(() => undefined);
  }, [isConnected]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthWatcher />
          {children}
          <Toaster
            position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--sm-surface)",
                  border: "1px solid color-mix(in oklab, var(--sm-outline) 24%, transparent)",
                  color: "var(--sm-on-surface)",
                },
              }}
            />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

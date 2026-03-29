"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@/hooks/useNotifications";

export function NotificationsMenu() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = data?.unread ?? 0;
  const notifications = data?.data ?? [];

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-lg border border-white/10 bg-surface p-2 text-on-surface-variant">
        <span className="relative inline-flex">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-black">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-surface p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Notifications</p>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-72 space-y-2 overflow-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-on-surface-variant">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-surface-high p-2">
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{item.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {item.link ? (
                    <Link href={item.link} className="text-xs text-primary hover:underline" onClick={() => markRead.mutate(item.id)}>
                      Open
                    </Link>
                  ) : <span />}
                  {!item.isRead ? (
                    <button type="button" className="text-xs text-on-surface-variant hover:text-white" onClick={() => markRead.mutate(item.id)}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  );
}

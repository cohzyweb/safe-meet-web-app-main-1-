self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "SafeMeet";
  const options = {
    body: data.body || "You have a new update.",
    icon: "/og.svg",
    badge: "/og.svg",
    data: {
      link: data.link || "/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.link || "/dashboard";
  event.waitUntil(clients.openWindow(target));
});

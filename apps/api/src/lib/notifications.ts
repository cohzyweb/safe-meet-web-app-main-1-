import webpush from "web-push";
import { prisma } from "./prisma.js";
import { sendEmail, sendTemplate } from "./email.js";
import type { EmailTemplate } from "./email-templates.js";

const vapidSubject = process.env["VAPID_SUBJECT"];
const vapidPublicKey = process.env["VAPID_PUBLIC_KEY"];
const vapidPrivateKey = process.env["VAPID_PRIVATE_KEY"];

const pushEnabled = Boolean(vapidSubject && vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export async function notifyWallet(
  wallet: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      wallet,
      title,
      body,
      ...(link ? { link } : {}),
    },
  });

  // Send email if wallet has one on file
  const profile = await prisma.profile.findUnique({
    where: { wallet },
    select: { email: true },
  });
  if (profile?.email) {
    const appUrl = process.env["FRONTEND_URL"] ?? "https://app.safe-meet.click";
    const linkHtml = link ? `<p><a href="${appUrl}${link}">View in SafeMeet →</a></p>` : "";
    await sendEmail({
      to: profile.email,
      subject: title,
      text: `${body}${link ? `\n\n${appUrl}${link}` : ""}`,
      html: `<p>${body}</p>${linkHtml}`,
    }).catch(() => undefined);
  }

  if (!pushEnabled) {
    return;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { wallet } });
  if (subs.length === 0) {
    return;
  }

  const payload = JSON.stringify({ title, body, link });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      }
    }),
  );
}

/**
 * Send a rich MJML email template to a wallet's profile email (if set).
 * Also creates an in-app notification via notifyWallet.
 */
export async function notifyWalletWithTemplate(
  wallet: string,
  title: string,
  body: string,
  template: EmailTemplate,
  link?: string,
): Promise<void> {
  await prisma.notification.create({
    data: { wallet, title, body, ...(link ? { link } : {}) },
  });

  const profile = await prisma.profile.findUnique({
    where: { wallet },
    select: { email: true },
  });
  if (profile?.email) {
    await sendTemplate(profile.email, template).catch(() => undefined);
  }

  if (!pushEnabled) return;
  const subs = await prisma.pushSubscription.findMany({ where: { wallet } });
  if (subs.length === 0) return;
  const payload = JSON.stringify({ title, body, link });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      }
    }),
  );
}

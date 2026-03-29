// ============================================================
// apps/api/src/lib/email-templates.ts
//
// MJML-based email templates for SafeMeet notifications.
// Each function returns { subject, html, text }.
// ============================================================

import mjml2html from "mjml";

const BRAND_COLOR = "#7d56fe";
const BG_COLOR = "#0f0f14";
const SURFACE_COLOR = "#1a1a24";
const TEXT_COLOR = "#e2e2ec";
const MUTED_COLOR = "#8f8fa8";
const APP_URL = process.env["FRONTEND_URL"] ?? "https://app.safe-meet.click";

function renderMjml(mjmlStr: string): string {
  const { html, errors } = mjml2html(mjmlStr, { validationLevel: "soft" });
  if (errors.length > 0) {
    // Log but don't throw — fall back to html as-is
    errors.forEach((e) => console.warn("[mjml]", e.formattedMessage));
  }
  return html;
}

function baseTemplate(content: string): string {
  return `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="'Inter', 'Helvetica Neue', Arial, sans-serif" />
      <mj-body background-color="${BG_COLOR}" />
      <mj-section background-color="${BG_COLOR}" />
      <mj-text color="${TEXT_COLOR}" font-size="15px" line-height="1.6" />
    </mj-attributes>
    <mj-style>
      a { color: ${BRAND_COLOR}; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </mj-style>
  </mj-head>
  <mj-body>
    <!-- Header -->
    <mj-section background-color="${BG_COLOR}" padding-bottom="0">
      <mj-column>
        <mj-text font-size="22px" font-weight="700" color="${BRAND_COLOR}" align="center" padding-bottom="4px">
          SafeMeet
        </mj-text>
        <mj-text font-size="11px" color="${MUTED_COLOR}" align="center" padding-top="0" letter-spacing="3px">
          TRUSTLESS P2P ESCROW
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Divider -->
    <mj-section background-color="${BG_COLOR}" padding="0 24px">
      <mj-column>
        <mj-divider border-color="${BRAND_COLOR}" border-width="1px" border-style="solid" width="40px" />
      </mj-column>
    </mj-section>

    <!-- Content -->
    ${content}

    <!-- Footer -->
    <mj-section background-color="${BG_COLOR}" padding-top="0">
      <mj-column>
        <mj-divider border-color="#2a2a3a" border-width="1px" />
        <mj-text align="center" font-size="12px" color="${MUTED_COLOR}" padding-top="8px">
          SafeMeet — Trustless P2P Escrow on Flow EVM &amp; Base<br />
          You're receiving this because your wallet has an email on file.<br />
          <a href="${APP_URL}/settings" style="color:${MUTED_COLOR}">Manage notification preferences</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`.trim();
}

function ctaButton(label: string, url: string): string {
  return `
    <mj-button background-color="${BRAND_COLOR}" color="#ffffff" font-size="14px"
      font-weight="700" border-radius="10px" padding="14px 32px"
      href="${url}" align="center">
      ${label}
    </mj-button>`;
}

function metaRow(label: string, value: string): string {
  return `
    <mj-text padding-top="4px" padding-bottom="4px">
      <span style="color:${MUTED_COLOR};font-size:12px;text-transform:uppercase;letter-spacing:1px;">${label}</span><br />
      <span style="font-weight:600;">${value}</span>
    </mj-text>`;
}

// ── Templates ──────────────────────────────────────────────

export type EmailTemplate = { subject: string; html: string; text: string };

/** Sent to counterparty when a new trade pact is created */
export function pactCreatedEmail(opts: {
  pactId: string;
  type: "TRADE" | "GOAL";
  creatorWallet: string;
  itemName?: string;
  assetAmount?: number;
  assetSymbol?: string;
  location?: string;
}): EmailTemplate {
  const typeLabel = opts.type === "TRADE" ? "Trade Escrow" : "Goal Pact";
  const link = `${APP_URL}/escrow/waiting-room?pactId=${opts.pactId}`;

  const html = renderMjml(baseTemplate(`
    <mj-section background-color="${SURFACE_COLOR}" border-radius="16px" padding="32px 24px">
      <mj-column>
        <mj-text font-size="24px" font-weight="700" align="center" padding-bottom="8px">
          You've been invited to a ${typeLabel}
        </mj-text>
        <mj-text align="center" color="${MUTED_COLOR}" padding-bottom="24px">
          A counterparty has created a pact and named you as their partner.
          Review and accept to proceed.
        </mj-text>

        ${opts.itemName ? metaRow("Item", opts.itemName) : ""}
        ${opts.assetAmount ? metaRow("Stake", `${opts.assetAmount} ${opts.assetSymbol ?? "ETH"}`) : ""}
        ${opts.location ? metaRow("Location", opts.location) : ""}
        ${metaRow("Created by", `${opts.creatorWallet.slice(0, 6)}…${opts.creatorWallet.slice(-4)}`)}

        <mj-spacer height="24px" />
        ${ctaButton("View Pact →", link)}
      </mj-column>
    </mj-section>
  `));

  return {
    subject: `SafeMeet — You've been invited to a ${typeLabel}`,
    html,
    text: `You've been invited to a SafeMeet ${typeLabel}.\n\n${opts.itemName ? `Item: ${opts.itemName}\n` : ""}${opts.assetAmount ? `Stake: ${opts.assetAmount} ${opts.assetSymbol ?? "ETH"}\n` : ""}View pact: ${link}`,
  };
}

/** Sent to pact creator when counterparty accepts */
export function pactAcceptedEmail(opts: {
  pactId: string;
  counterpartyWallet: string;
  itemName?: string;
}): EmailTemplate {
  const link = `${APP_URL}/escrow/waiting-room?pactId=${opts.pactId}`;

  const html = renderMjml(baseTemplate(`
    <mj-section background-color="${SURFACE_COLOR}" border-radius="16px" padding="32px 24px">
      <mj-column>
        <mj-text font-size="24px" font-weight="700" align="center" padding-bottom="8px">
          Your pact was accepted
        </mj-text>
        <mj-text align="center" color="${MUTED_COLOR}" padding-bottom="24px">
          Your counterparty has accepted the pact. You're ready to meet and complete the trade.
        </mj-text>

        ${opts.itemName ? metaRow("Item", opts.itemName) : ""}
        ${metaRow("Counterparty", `${opts.counterpartyWallet.slice(0, 6)}…${opts.counterpartyWallet.slice(-4)}`)}

        <mj-spacer height="24px" />
        ${ctaButton("Go to Escrow →", link)}
      </mj-column>
    </mj-section>
  `));

  return {
    subject: "SafeMeet — Your pact was accepted",
    html,
    text: `Your counterparty accepted the pact${opts.itemName ? ` for ${opts.itemName}` : ""}.\n\nView: ${link}`,
  };
}

/** Sent to both parties when a pact is completed via QR handshake */
export function pactCompletedEmail(opts: {
  pactId: string;
  itemName?: string;
}): EmailTemplate {
  const link = `${APP_URL}/history`;

  const html = renderMjml(baseTemplate(`
    <mj-section background-color="${SURFACE_COLOR}" border-radius="16px" padding="32px 24px">
      <mj-column>
        <mj-text font-size="48px" align="center" padding-bottom="0">✓</mj-text>
        <mj-text font-size="24px" font-weight="700" align="center" padding-bottom="8px">
          Pact completed
        </mj-text>
        <mj-text align="center" color="${MUTED_COLOR}" padding-bottom="24px">
          The QR handshake was verified and the pact is now complete.
          ${opts.itemName ? `<br /><strong>${opts.itemName}</strong>` : ""}
        </mj-text>

        <mj-spacer height="8px" />
        ${ctaButton("View History →", link)}
      </mj-column>
    </mj-section>
  `));

  return {
    subject: "SafeMeet — Pact completed",
    html,
    text: `Your SafeMeet pact${opts.itemName ? ` for ${opts.itemName}` : ""} has been completed successfully.\n\nView history: ${link}`,
  };
}

/** Sent to referee when they're assigned to a goal pact */
export function refereeAssignedEmail(opts: {
  pactId: string;
  creatorWallet: string;
  goalDescription: string;
  deadline?: string;
}): EmailTemplate {
  const link = `${APP_URL}/judgment-room?pactId=${opts.pactId}`;

  const html = renderMjml(baseTemplate(`
    <mj-section background-color="${SURFACE_COLOR}" border-radius="16px" padding="32px 24px">
      <mj-column>
        <mj-text font-size="24px" font-weight="700" align="center" padding-bottom="8px">
          You've been named as a referee
        </mj-text>
        <mj-text align="center" color="${MUTED_COLOR}" padding-bottom="24px">
          Someone has set up a goal pact and chosen you to judge whether they complete it.
        </mj-text>

        ${metaRow("Goal", opts.goalDescription)}
        ${opts.deadline ? metaRow("Deadline", new Date(opts.deadline).toLocaleDateString("en-US", { dateStyle: "long" })) : ""}
        ${metaRow("Creator", `${opts.creatorWallet.slice(0, 6)}…${opts.creatorWallet.slice(-4)}`)}

        <mj-spacer height="24px" />
        ${ctaButton("Go to Judgment Room →", link)}
      </mj-column>
    </mj-section>
  `));

  return {
    subject: "SafeMeet — You've been assigned as a referee",
    html,
    text: `You've been named as a referee for a SafeMeet goal pact.\n\nGoal: ${opts.goalDescription}\n${opts.deadline ? `Deadline: ${opts.deadline}\n` : ""}Judgment room: ${link}`,
  };
}

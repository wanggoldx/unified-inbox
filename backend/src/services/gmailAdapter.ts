import { google } from "googleapis";
import { decrypt } from "./encryptionService.js";

export interface GmailAccountTokens {
  accessToken: string;
  refreshToken: string;
}

export interface NormalizedEmail {
  providerMessageId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  bodyPreview: string;
  bodyHtml: string;
  bodyText: string;
  receivedAt: Date;
  labels: string[];
}

function getGmailClient(tokens: GmailAccountTokens) {
  const accessToken = decrypt(tokens.accessToken);
  const refreshToken = decrypt(tokens.refreshToken);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractBody(payload: any): {
  bodyHtml: string;
  bodyText: string;
} {
  let bodyHtml = "";
  let bodyText = "";

  function walkParts(part: any) {
    if (part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (part.mimeType === "text/html") {
        bodyHtml += decoded;
      } else if (part.mimeType === "text/plain") {
        bodyText += decoded;
      }
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        walkParts(subPart);
      }
    }
  }

  walkParts(payload);
  return { bodyHtml, bodyText };
}

function extractSender(
  headers: any[]
): { sender: string; senderEmail: string } {
  const fromHeader = headers.find(
    (h: any) => h.name.toLowerCase() === "from"
  );
  const value = fromHeader?.value || "";
  const match = value.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { sender: match[1].trim(), senderEmail: match[2] };
  }
  return { sender: value, senderEmail: value };
}

function normalizeMessage(message: any): NormalizedEmail {
  const headers = message.payload?.headers || [];
  const { sender, senderEmail } = extractSender(headers);
  const subjectHeader = headers.find(
    (h: any) => h.name.toLowerCase() === "subject"
  );
  const dateHeader = headers.find(
    (h: any) => h.name.toLowerCase() === "date"
  );
  const { bodyHtml, bodyText } = extractBody(message.payload || {});

  return {
    providerMessageId: message.id,
    subject: subjectHeader?.value || "(No Subject)",
    sender,
    senderEmail,
    bodyPreview: bodyText.substring(0, 200) || bodyHtml.substring(0, 200),
    bodyHtml,
    bodyText,
    receivedAt: new Date(dateHeader?.value || message.internalDate),
    labels: message.labelIds || [],
  };
}

export async function fetchRecentEmails(
  tokens: GmailAccountTokens,
  days: number = 7
): Promise<NormalizedEmail[]> {
  const gmail = getGmailClient(tokens);

  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - days);
  const query = `after:${Math.floor(afterDate.getTime() / 1000)}`;

  const messages = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100,
  });

  if (!messages.data.messages || messages.data.messages.length === 0) {
    return [];
  }

  const emails: NormalizedEmail[] = [];

  for (const msg of messages.data.messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });
    emails.push(normalizeMessage(fullMessage.data));
  }

  return emails;
}

export async function fetchEmailById(
  tokens: GmailAccountTokens,
  messageId: string
): Promise<NormalizedEmail> {
  const gmail = getGmailClient(tokens);

  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return normalizeMessage(message.data);
}

export async function markAsRead(
  tokens: GmailAccountTokens,
  messageId: string
): Promise<void> {
  const gmail = getGmailClient(tokens);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export async function markAsUnread(
  tokens: GmailAccountTokens,
  messageId: string
): Promise<void> {
  const gmail = getGmailClient(tokens);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: ["UNREAD"] },
  });
}

export async function deleteEmail(
  tokens: GmailAccountTokens,
  messageId: string
): Promise<void> {
  const gmail = getGmailClient(tokens);

  await gmail.users.messages.trash({
    userId: "me",
    id: messageId,
  });
}

export async function archiveEmail(
  tokens: GmailAccountTokens,
  messageId: string
): Promise<void> {
  const gmail = getGmailClient(tokens);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["INBOX"] },
  });
}

export async function searchEmails(
  tokens: GmailAccountTokens,
  query: string
): Promise<NormalizedEmail[]> {
  const gmail = getGmailClient(tokens);

  const messages = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50,
  });

  if (!messages.data.messages || messages.data.messages.length === 0) {
    return [];
  }

  const emails: NormalizedEmail[] = [];

  for (const msg of messages.data.messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });
    emails.push(normalizeMessage(fullMessage.data));
  }

  return emails;
}

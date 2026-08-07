import { prisma } from "../config/database.js";
import {
  fetchRecentEmails,
  NormalizedEmail,
} from "./gmailAdapter.js";

export interface SyncResult {
  newEmails: number;
  updatedEmails: number;
}

export async function syncEmailsForAccount(
  accountId: string
): Promise<SyncResult> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });

  if (!account || !account.isActive) {
    return { newEmails: 0, updatedEmails: 0 };
  }

  const emails = await fetchRecentEmails({
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
  });

  let newEmails = 0;
  let updatedEmails = 0;

  for (const email of emails) {
    const existing = await prisma.email.findUnique({
      where: {
        accountId_providerMessageId: {
          accountId,
          providerMessageId: email.providerMessageId,
        },
      },
    });

    const isRead = !email.labels.includes("UNREAD");

    if (existing) {
      if (existing.isRead !== isRead) {
        await prisma.email.update({
          where: { id: existing.id },
          data: { isRead },
        });
        updatedEmails++;
      }
    } else {
      await prisma.email.create({
        data: {
          accountId,
          providerMessageId: email.providerMessageId,
          subject: email.subject,
          sender: email.sender,
          senderEmail: email.senderEmail,
          bodyPreview: email.bodyPreview,
          bodyHtml: email.bodyHtml,
          bodyText: email.bodyText,
          receivedAt: email.receivedAt,
          isRead,
          labels: JSON.stringify(email.labels),
        },
      });
      newEmails++;
    }
  }

  return { newEmails, updatedEmails };
}

export async function syncAllAccounts(): Promise<
  { accountId: string; result: SyncResult }[]
> {
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true },
  });

  const results: { accountId: string; result: SyncResult }[] = [];

  for (const account of accounts) {
    try {
      const result = await syncEmailsForAccount(account.id);
      results.push({ accountId: account.id, result });
    } catch (error) {
      console.error(`Sync failed for account ${account.id}:`, error);
      results.push({
        accountId: account.id,
        result: { newEmails: 0, updatedEmails: 0 },
      });
    }
  }

  return results;
}

export async function syncEmailsForUser(
  userId: string
): Promise<{ accountId: string; provider: string; providerEmail: string; result: SyncResult }[]> {
  const accounts = await prisma.emailAccount.findMany({
    where: { userId, isActive: true },
  });

  const results: { accountId: string; provider: string; providerEmail: string; result: SyncResult }[] = [];

  for (const account of accounts) {
    try {
      const result = await syncEmailsForAccount(account.id);
      results.push({
        accountId: account.id,
        provider: account.provider,
        providerEmail: account.providerEmail,
        result,
      });
    } catch (error) {
      console.error(`Sync failed for account ${account.id}:`, error);
      results.push({
        accountId: account.id,
        provider: account.provider,
        providerEmail: account.providerEmail,
        result: { newEmails: 0, updatedEmails: 0 },
      });
    }
  }

  return results;
}

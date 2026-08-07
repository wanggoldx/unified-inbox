import { Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { googleOAuth2Client, GMAIL_SCOPES } from "../config/oauth.js";
import { encrypt, decrypt } from "../services/encryptionService.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { google } from "googleapis";
import { syncEmailsForAccount } from "../services/emailSyncService.js";

export async function listAccounts(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { userId: req.user!.id, isActive: true },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        createdAt: true,
      },
    });
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
}

export async function getGmailAuthUrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const state = Buffer.from(
      JSON.stringify({ userId: req.user!.id })
    ).toString("base64");

    const url = googleOAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GMAIL_SCOPES,
      prompt: "consent",
      state,
    });

    res.json({ url });
  } catch (err) {
    next(err);
  }
}

export async function handleGmailCallback(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      const error: AppError = new Error("Missing authorization code or state");
      error.statusCode = 400;
      error.code = "OAUTH_MISSING_PARAMS";
      throw error;
    }

    const { userId } = JSON.parse(
      Buffer.from(state as string, "base64").toString()
    );

    const { tokens } = await googleOAuth2Client.getToken(code as string);
    googleOAuth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: googleOAuth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });

    const existingAccount = await prisma.emailAccount.findFirst({
      where: { userId, providerEmail: profile.data.emailAddress! },
    });

    let accountId: string;

    if (existingAccount) {
      await prisma.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encrypt(tokens.access_token!),
          refreshToken: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : existingAccount.refreshToken,
          tokenExpiry: new Date(tokens.expiry_date!),
          isActive: true,
        },
      });
      accountId = existingAccount.id;
    } else {
      const newAccount = await prisma.emailAccount.create({
        data: {
          userId,
          provider: "gmail",
          providerEmail: profile.data.emailAddress!,
          accessToken: encrypt(tokens.access_token!),
          refreshToken: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : "",
          tokenExpiry: new Date(tokens.expiry_date!),
        },
      });
      accountId = newAccount.id;
    }

    syncEmailsForAccount(accountId).catch((err) =>
      console.error("Initial sync failed:", err)
    );

    res.redirect("http://localhost:5173/dashboard");
  } catch (err) {
    next(err);
  }
}

export async function disconnectAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const account = await prisma.emailAccount.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!account) {
      const error: AppError = new Error("Account not found");
      error.statusCode = 404;
      error.code = "ACCOUNT_NOT_FOUND";
      throw error;
    }

    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });

    res.json({ message: "Account disconnected successfully" });
  } catch (err) {
    next(err);
  }
}

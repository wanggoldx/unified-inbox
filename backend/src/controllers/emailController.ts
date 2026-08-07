import { Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import * as gmailAdapter from "../services/gmailAdapter.js";

export async function listEmails(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const provider = req.query.provider as string;
    const skip = (page - 1) * limit;

    const where: any = {
      account: { userId: req.user!.id, isActive: true },
      isDeleted: false,
    };

    if (provider) {
      where.account.provider = provider;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
        include: {
          account: {
            select: { provider: true, providerEmail: true },
          },
        },
      }),
      prisma.email.count({ where }),
    ]);

    res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEmailDetail(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.id,
        account: { userId: req.user!.id },
      },
      include: {
        account: {
          select: { provider: true, providerEmail: true },
        },
      },
    });

    if (!email) {
      const error: AppError = new Error("Email not found");
      error.statusCode = 404;
      error.code = "EMAIL_NOT_FOUND";
      throw error;
    }

    res.json({ email });
  } catch (err) {
    next(err);
  }
}

export async function toggleRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.id,
        account: { userId: req.user!.id },
      },
    });

    if (!email) {
      const error: AppError = new Error("Email not found");
      error.statusCode = 404;
      error.code = "EMAIL_NOT_FOUND";
      throw error;
    }

    const newReadStatus = !email.isRead;

    await prisma.email.update({
      where: { id: email.id },
      data: { isRead: newReadStatus },
    });

    try {
      const account = await prisma.emailAccount.findUnique({
        where: { id: email.accountId },
      });
      if (account && account.provider === "gmail") {
        const tokens = { accessToken: account.accessToken, refreshToken: account.refreshToken };
        if (newReadStatus) {
          await gmailAdapter.markAsRead(tokens, email.providerMessageId);
        } else {
          await gmailAdapter.markAsUnread(tokens, email.providerMessageId);
        }
      }
    } catch (syncErr) {
      console.error("Failed to sync read status to Gmail:", syncErr);
    }

    res.json({ email: { ...email, isRead: newReadStatus } });
  } catch (err) {
    next(err);
  }
}

export async function deleteEmail(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.id,
        account: { userId: req.user!.id },
      },
    });

    if (!email) {
      const error: AppError = new Error("Email not found");
      error.statusCode = 404;
      error.code = "EMAIL_NOT_FOUND";
      throw error;
    }

    await prisma.email.update({
      where: { id: email.id },
      data: { isDeleted: true },
    });

    try {
      const account = await prisma.emailAccount.findUnique({
        where: { id: email.accountId },
      });
      if (account && account.provider === "gmail") {
        await gmailAdapter.deleteEmail(
          { accessToken: account.accessToken, refreshToken: account.refreshToken },
          email.providerMessageId
        );
      }
    } catch (syncErr) {
      console.error("Failed to sync delete to Gmail:", syncErr);
    }

    res.json({ message: "Email deleted successfully" });
  } catch (err) {
    next(err);
  }
}

export async function archiveEmail(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.id,
        account: { userId: req.user!.id },
      },
    });

    if (!email) {
      const error: AppError = new Error("Email not found");
      error.statusCode = 404;
      error.code = "EMAIL_NOT_FOUND";
      throw error;
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: email.accountId },
    });

    if (!account || account.provider !== "gmail") {
      const error: AppError = new Error("Archive is only supported for Gmail");
      error.statusCode = 400;
      error.code = "ARCHIVE_NOT_SUPPORTED";
      throw error;
    }

    await prisma.email.update({
      where: { id: email.id },
      data: { isArchived: true },
    });

    try {
      await gmailAdapter.archiveEmail(
        { accessToken: account.accessToken, refreshToken: account.refreshToken },
        email.providerMessageId
      );
    } catch (syncErr) {
      console.error("Failed to sync archive to Gmail:", syncErr);
    }

    res.json({ message: "Email archived successfully" });
  } catch (err) {
    next(err);
  }
}

export async function searchEmails(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const query = req.query.q as string;

    if (!query) {
      const error: AppError = new Error("Search query is required");
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    const emails = await prisma.email.findMany({
      where: {
        account: { userId: req.user!.id, isActive: true },
        isDeleted: false,
        OR: [
          { subject: { contains: query } },
          { sender: { contains: query } },
          { senderEmail: { contains: query } },
          { bodyPreview: { contains: query } },
        ],
      },
      orderBy: { receivedAt: "desc" },
      take: 50,
      include: {
        account: {
          select: { provider: true, providerEmail: true },
        },
      },
    });

    res.json({ emails });
  } catch (err) {
    next(err);
  }
}

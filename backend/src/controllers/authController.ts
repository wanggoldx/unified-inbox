import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

function generateToken(user: { id: string; email: string; name: string }) {
  return jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

export async function register(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      const error: AppError = new Error("Email, password, and name are required");
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const error: AppError = new Error("Email already registered");
      error.statusCode = 409;
      error.code = "DUPLICATE_EMAIL";
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error: AppError = new Error("Email and password are required");
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error: AppError = new Error("Invalid email or password");
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error: AppError = new Error("Invalid email or password");
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      throw error;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      const error: AppError = new Error("User not found");
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: AuthRequest, res: Response) {
  res.json({ message: "Logged out successfully" });
}

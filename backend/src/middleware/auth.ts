import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error: AppError = new Error("No token provided");
    error.statusCode = 401;
    error.code = "UNAUTHORIZED";
    return next(error);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    const error: AppError = new Error("Invalid token");
    error.statusCode = 401;
    error.code = "UNAUTHORIZED";
    next(error);
  }
}

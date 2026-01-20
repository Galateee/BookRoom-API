import { Request, Response, NextFunction } from "express";

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("❌ Error:", err.message);

  const statusCode = err.statusCode || 500;
  const code = err.code || "SERVER_ERROR";
  const message = err.message || "Une erreur technique est survenue";

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message:
        process.env.NODE_ENV === "production" && statusCode === 500
          ? "Une erreur technique est survenue"
          : message,
    },
  });
}

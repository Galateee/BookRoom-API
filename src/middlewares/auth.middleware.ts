import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Middleware pour protéger les routes nécessitant une authentification
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = getAuth(req);

  if (!auth.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentification requise",
      },
    });
    return;
  }

  // Ajouter l'userId à la requête pour l'utiliser dans les controllers
  req.userId = auth.userId;
  next();
}

/**
 * Middleware pour protéger les routes réservées aux administrateurs
 * Vérifie que l'utilisateur est authentifié ET a le rôle admin dans ses metadata
 */
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = getAuth(req);

  if (!auth.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentification requise",
      },
    });
    return;
  }

  try {
    // Récupérer les informations de l'utilisateur depuis Clerk
    const user = await clerkClient.users.getUser(auth.userId);
    const role = user.publicMetadata?.role as string | undefined;

    // Vérifier si l'utilisateur a le rôle admin
    if (role !== "admin") {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Accès réservé aux administrateurs",
        },
      });
      return;
    }

    req.userId = auth.userId;
    next();
  } catch (error) {
    console.error("Erreur requireAdmin:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur lors de la vérification des permissions",
      },
    });
  }
}

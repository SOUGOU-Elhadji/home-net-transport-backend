// backend/src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token d'authentification manquant" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Session expirée ou invalide. Veuillez vous reconnecter." });
  }
}

export function authorize(allowedRoles: ("SUPER_ADMIN" | "BUREAU" | "CHAUFFEUR")[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Accès interdit pour le rôle : ${req.user.role}. Rôles autorisés: ${allowedRoles.join(", ")}` 
      });
    }

    next();
  };
}

import jwt from "jsonwebtoken";
import { User } from "./models.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar
});

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function authRequired(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function loadUser(req, res, next) {
  try {
    req.user = await User.findById(req.auth.sub);
    if (!req.user || req.user.status !== "active") return res.status(401).json({ error: "Account unavailable" });
    next();
  } catch (error) {
    next(error);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
  next();
};

export const safeUser = publicUser;

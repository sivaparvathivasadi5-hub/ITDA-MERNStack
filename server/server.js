import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { attachSockets } from "./sockets.js";
import routes from "./routes.js";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set before starting the server");
if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be set before starting the server");

const app = express();
const server = http.createServer(app);
const io = attachSockets(server);
app.set("io", io);
app.use(cors({ origin: process.env.CLIENT_URL?.split(",") ?? "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "pulseroom-api" }));
app.use("/api", routes);
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "Malformed JSON request body" });
  if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ error: error.message });
  if (error.code === 11000) return res.status(409).json({ error: "A record with that value already exists" });
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT) || 5000;
await mongoose.connect(process.env.MONGO_URI);
server.listen(port, () => console.log(`PulseRoom API listening on http://localhost:${port}`));

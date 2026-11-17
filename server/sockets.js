import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Room, User, Message, QueueItem } from "./models.js";
import { applyPlaybackAction } from "./playback.js";

const canUseRoom = (room, userId) => Boolean(room
  && room.status === "live"
  && !room.bannedUsers.some((id) => id.toString() === userId)
  && (room.host.toString() === userId || room.listeners.some((id) => id.toString() === userId)));

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL?.split(",") ?? "http://localhost:5173", credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const joinedRooms = new Set();
    socket.on("room:join", async ({ roomId } = {}, ack = () => {}) => {
      try {
        const room = await Room.findById(roomId);
        if (!room || room.status !== "live") return ack({ error: "Room is unavailable" });
        if (room.bannedUsers.some((id) => id.toString() === socket.user.sub)) return ack({ error: "You are banned from this room" });
        if (!room.isPublic && !room.host.equals(socket.user.sub) && !room.listeners.some((id) => id.equals(socket.user.sub))) return ack({ error: "This room is private" });
        room.listeners.addToSet(socket.user.sub);
        room.listenerCount = room.listeners.length;
        await room.save();
        socket.join(roomId);
        joinedRooms.add(roomId);
        const listeners = await User.find({ _id: { $in: room.listeners } }).select("name avatar role");
        io.to(roomId).emit("presence:update", listeners);
        ack({ roomId, playback: room.playback, listeners });
      } catch (error) {
        ack({ error: error.message });
      }
    });

    socket.on("room:leave", async ({ roomId } = {}) => {
      if (!roomId) return;
      socket.leave(roomId);
      joinedRooms.delete(roomId);
      const room = await Room.findById(roomId);
      if (!room) return;
      room.listeners.pull(socket.user.sub);
      room.listenerCount = room.listeners.length;
      await room.save();
      const listeners = await User.find({ _id: { $in: room.listeners } }).select("name avatar role");
      io.to(roomId).emit("presence:update", listeners);
    });

    socket.on("playback:update", async ({ roomId, action, positionMs, track } = {}, ack = () => {}) => {
      try {
        const room = await Room.findById(roomId);
        if (!room || room.status !== "live" || room.host.toString() !== socket.user.sub) return ack({ error: "Only the live room host can control playback" });
        if (!["play", "pause", "seek", "next"].includes(action)) return ack({ error: "Invalid playback action" });
        applyPlaybackAction(room.playback, action, positionMs);
        if (action === "next") {
          const queue = await QueueItem.find({ room: roomId }).populate("addedBy", "name avatar");
          queue.sort((a, b) => b.votes.length - a.votes.length || a.position - b.position || a.createdAt - b.createdAt);
          const next = queue[0] ? await QueueItem.findByIdAndDelete(queue[0]._id) : null;
          room.playback.currentTrack = next?.track ?? track ?? null;
          room.playback.positionMs = 0;
          room.playback.isPlaying = Boolean(room.playback.currentTrack);
          room.playback.startedAt = new Date();
        }
        await room.save();
        if (action === "next") {
          const updatedQueue = await QueueItem.find({ room: roomId }).populate("addedBy", "name avatar");
          updatedQueue.sort((a, b) => b.votes.length - a.votes.length || a.position - b.position || a.createdAt - b.createdAt);
          io.to(roomId).emit("queue:updated", updatedQueue);
        }
        io.to(roomId).emit("playback:state", room.playback);
        ack({ playback: room.playback });
      } catch (error) {
        ack({ error: error.message });
      }
    });

    socket.on("queue:add", async ({ roomId, track } = {}, ack = () => {}) => {
      try {
        const room = await Room.findById(roomId);
        if (!canUseRoom(room, socket.user.sub) || room.mutedUsers.some((id) => id.toString() === socket.user.sub)) return ack({ error: "You cannot add tracks in this room" });
        const item = await QueueItem.create({ room: roomId, track, addedBy: socket.user.sub });
        const queue = await QueueItem.find({ room: roomId }).populate("addedBy", "name avatar");
        queue.sort((a, b) => b.votes.length - a.votes.length || a.position - b.position || a.createdAt - b.createdAt);
        io.to(roomId).emit("queue:updated", queue);
        ack({ item });
      } catch (error) {
        ack({ error: error.message });
      }
    });

    socket.on("queue:vote", async ({ roomId, itemId } = {}, ack = () => {}) => {
      try {
        const room = await Room.findById(roomId);
        if (!canUseRoom(room, socket.user.sub) || room.mutedUsers.some((id) => id.toString() === socket.user.sub)) return ack({ error: "You cannot vote in this room" });
        const item = await QueueItem.findOneAndUpdate({ _id: itemId, room: roomId }, { $addToSet: { votes: socket.user.sub } }, { new: true });
        if (!item) return ack({ error: "Queue item not found" });
        const queue = await QueueItem.find({ room: roomId }).populate("addedBy", "name avatar");
        queue.sort((a, b) => b.votes.length - a.votes.length || a.position - b.position || a.createdAt - b.createdAt);
        io.to(roomId).emit("queue:updated", queue);
        ack({ item });
      } catch (error) {
        ack({ error: error.message });
      }
    });

    socket.on("chat:send", async ({ roomId, text } = {}, ack = () => {}) => {
      try {
        const room = await Room.findById(roomId);
        if (!canUseRoom(room, socket.user.sub) || room.mutedUsers.some((id) => id.toString() === socket.user.sub)) return ack({ error: "You cannot send messages in this room" });
        const message = await Message.create({ room: roomId, sender: socket.user.sub, text });
        const populated = await message.populate("sender", "name avatar role");
        io.to(roomId).emit("chat:message", populated);
        ack({ message: populated });
      } catch (error) {
        ack({ error: error.message });
      }
    });

    socket.on("disconnect", async () => {
      for (const roomId of joinedRooms) {
        const room = await Room.findById(roomId);
        if (!room) continue;
        room.listeners.pull(socket.user.sub);
        room.listenerCount = room.listeners.length;
        await room.save();
        const listeners = await User.find({ _id: { $in: room.listeners } }).select("name avatar role");
        io.to(roomId).emit("presence:update", listeners);
      }
    });
  });

  return io;
}

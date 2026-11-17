import { Router } from "express";
import bcrypt from "bcryptjs";
import { authRequired, loadUser, requireRole, safeUser, signToken } from "./auth.js";
import { ListenEvent, Message, Payout, Playlist, QueueItem, Report, Room, Tip, User } from "./models.js";
import { applyPlaybackAction } from "./playback.js";

const router = Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const pageParams = (req) => ({
  page: Math.max(1, Number.parseInt(req.query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
});
const orderedQueue = async (roomId) => {
  const items = await QueueItem.find({ room: roomId }).populate("addedBy", "name avatar");
  return items.sort((a, b) => b.votes.length - a.votes.length || a.position - b.position || a.createdAt - b.createdAt);
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isRoomStaff = (room, user) => room && (
  room.host.toString() === user._id.toString()
  || room.moderators.some((id) => id.toString() === user._id.toString())
  || user.role === "admin"
);
const roomForUser = (roomId, user) => Room.findOne({ _id: roomId, status: "live", $or: [{ isPublic: true }, { host: user._id }, { listeners: user._id }] });
const publicRoomQuery = { status: "live", isPublic: true };
const featured = [
  { providerId: "telugu-1", title: "Naatu Naatu", artist: "Rahul Sipligunj, Kaala Bhairava", album: "RRR", language: "Telugu", artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80" },
  { providerId: "telugu-2", title: "Butta Bomma", artist: "Armaan Malik", album: "Ala Vaikunthapurramuloo", language: "Telugu", artwork: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=500&q=80" },
  { providerId: "telugu-3", title: "Samajavaragamana", artist: "Sid Sriram", album: "Ala Vaikunthapurramuloo", language: "Telugu", artwork: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80" },
  { providerId: "telugu-4", title: "Inkem Inkem Inkem Kaavaale", artist: "Sid Sriram", album: "Geetha Govindam", language: "Telugu", artwork: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80" }
];

router.post("/auth/register", asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim() || !email?.trim() || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Name, email and a password of at least 8 characters are required" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ error: "An account with this email already exists" });
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    role: role === "host" ? "host" : "listener"
  });
  res.status(201).json({ user: safeUser(user), token: signToken(user) });
}));

router.post("/auth/login", asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password))) return res.status(401).json({ error: "Email or password is incorrect" });
  if (user.status !== "active") return res.status(403).json({ error: "This account is suspended" });
  res.json({ user: safeUser(user), token: signToken(user) });
}));

router.get("/auth/me", authRequired, loadUser, (req, res) => res.json({ user: safeUser(req.user) }));

router.use(authRequired, loadUser);

// Rooms and discovery (7 room lifecycle/sync APIs + 5 discovery APIs).
router.post("/rooms", requireRole("host", "admin"), asyncRoute(async (req, res) => {
  const { name, description = "", isPublic = true, tags = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Room name is required" });
  const room = await Room.create({ name: name.trim(), description, isPublic, tags, host: req.user._id, listeners: [req.user._id] });
  res.status(201).json({ room });
}));

router.get("/rooms/live", asyncRoute(async (_req, res) => {
  res.json(await Room.find({ ...publicRoomQuery }).sort({ updatedAt: -1 }).limit(50).populate("host", "name avatar"));
}));
router.get("/rooms/trending", asyncRoute(async (_req, res) => {
  res.json(await Room.find(publicRoomQuery).sort({ listenerCount: -1, updatedAt: -1 }).limit(20).populate("host", "name avatar"));
}));
router.get("/rooms/search", asyncRoute(async (req, res) => {
  const { page, limit } = pageParams(req);
  const filter = { ...publicRoomQuery };
  if (req.query.q) filter.$or = ["name", "description", "tags"].map((field) => ({ [field]: { $regex: escapeRegex(String(req.query.q).slice(0, 80)), $options: "i" } }));
  const [rooms, total] = await Promise.all([Room.find(filter).skip((page - 1) * limit).limit(limit).populate("host", "name avatar"), Room.countDocuments(filter)]);
  res.json({ rooms, page, limit, total, pages: Math.ceil(total / limit) });
}));
router.get("/rooms/recommended", asyncRoute(async (req, res) => {
  const rooms = await Room.find({ ...publicRoomQuery, host: { $ne: req.user._id } }).sort({ listenerCount: -1 }).limit(12).populate("host", "name avatar");
  res.json(rooms);
}));
router.get("/rooms", asyncRoute(async (req, res) => {
  const { page, limit } = pageParams(req);
  const [rooms, total] = await Promise.all([Room.find(publicRoomQuery).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("host", "name avatar"), Room.countDocuments(publicRoomQuery)]);
  res.json({ rooms, page, limit, total, pages: Math.ceil(total / limit) });
}));
router.get("/rooms/:id", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id).populate("host", "name avatar").populate("listeners", "name avatar role");
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!room.isPublic && room.host._id.toString() !== req.user._id.toString() && !room.listeners.some((listener) => listener._id.equals(req.user._id))) return res.status(403).json({ error: "This room is private" });
  res.json({ room });
}));
router.put("/rooms/:id", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.host.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Only the host can update this room" });
  for (const key of ["name", "description", "isPublic", "tags"]) if (req.body[key] !== undefined) room[key] = req.body[key];
  await room.save();
  res.json({ room });
}));
router.delete("/rooms/:id", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.host.toString() !== req.user._id.toString() && req.user.role !== "admin") return res.status(403).json({ error: "Only the host can close this room" });
  room.status = "closed";
  await room.save();
  res.json({ message: "Room closed" });
}));
router.post("/rooms/:id/join", asyncRoute(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, status: "live" });
  if (!room) return res.status(404).json({ error: "Live room not found" });
  if (room.bannedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are banned from this room" });
  if (!room.isPublic && !room.host.equals(req.user._id) && !room.listeners.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "This room is private" });
  room.listeners.addToSet(req.user._id);
  room.listenerCount = room.listeners.length;
  await room.save();
  res.json({ room });
}));
router.post("/rooms/:id/leave", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  room.listeners.pull(req.user._id);
  room.listenerCount = room.listeners.length;
  await room.save();
  res.json({ message: "You left the room" });
}));
router.put("/rooms/:id/playback", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!room.host.equals(req.user._id)) return res.status(403).json({ error: "Only the host can control playback" });
  const { action, positionMs, track } = req.body;
  if (!["play", "pause", "seek", "next"].includes(action)) return res.status(400).json({ error: "Action must be play, pause, seek or next" });
  applyPlaybackAction(room.playback, action, positionMs);
  if (action === "next") {
    const nextItem = (await orderedQueue(room._id))[0];
    const next = nextItem ? await QueueItem.findByIdAndDelete(nextItem._id) : null;
    room.playback.currentTrack = next?.track ?? track ?? null;
    room.playback.positionMs = 0;
    room.playback.isPlaying = Boolean(room.playback.currentTrack);
    room.playback.startedAt = new Date();
  }
  if (track && action !== "next") room.playback.currentTrack = track;
  await room.save();
  if (action === "next") req.app.get("io").to(room.id).emit("queue:updated", await orderedQueue(room._id));
  req.app.get("io").to(room.id).emit("playback:state", room.playback);
  res.json({ playback: room.playback });
}));

// Queue and voting (6 APIs).
router.get("/rooms/:id/queue", asyncRoute(async (req, res) => {
  const room = await roomForUser(req.params.id, req.user);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(await orderedQueue(room._id));
}));
router.post("/rooms/:id/queue", asyncRoute(async (req, res) => {
  const room = await roomForUser(req.params.id, req.user);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.bannedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are banned from this room" });
  if (room.mutedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are muted in this room" });
  if (!req.body.track?.providerId || !req.body.track?.title || !req.body.track?.artist) return res.status(400).json({ error: "A valid track is required" });
  const item = await QueueItem.create({ room: room._id, track: req.body.track, addedBy: req.user._id });
  const queue = await orderedQueue(room._id);
  req.app.get("io").to(room.id).emit("queue:updated", queue);
  res.status(201).json({ item });
}));
router.delete("/queue/:itemId", asyncRoute(async (req, res) => {
  const item = await QueueItem.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: "Queue item not found" });
  const room = await Room.findById(item.room);
  if (!room || (item.addedBy.toString() !== req.user._id.toString() && !isRoomStaff(room, req.user))) return res.status(403).json({ error: "You cannot remove this queue item" });
  await item.deleteOne();
  const queue = await orderedQueue(room._id);
  req.app.get("io").to(room.id).emit("queue:updated", queue);
  res.json({ message: "Queue item removed" });
}));
router.put("/rooms/:id/queue/reorder", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.status !== "live") return res.status(400).json({ error: "Closed rooms cannot be reordered" });
  if (!isRoomStaff(room, req.user)) return res.status(403).json({ error: "Only the host or a moderator can reorder the queue" });
  if (!Array.isArray(req.body.itemIds)) return res.status(400).json({ error: "itemIds must be an array" });
  const currentIds = (await QueueItem.find({ room: room._id }).select("_id")).map((item) => item.id).sort();
  const requestedIds = req.body.itemIds.map(String).sort();
  if (currentIds.length !== requestedIds.length || currentIds.some((itemId, index) => itemId !== requestedIds[index])) {
    return res.status(400).json({ error: "itemIds must contain each queue item exactly once" });
  }
  await Promise.all(req.body.itemIds.map((id, position) => QueueItem.updateOne({ _id: id, room: room._id }, { position })));
  const queue = await orderedQueue(room._id);
  req.app.get("io").to(room.id).emit("queue:updated", queue);
  res.json(queue);
}));
router.post("/queue/:itemId/vote", asyncRoute(async (req, res) => {
  const item = await QueueItem.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: "Queue item not found" });
  const room = await Room.findOne({ _id: item.room, status: "live" });
  if (!room) return res.status(404).json({ error: "Live room not found" });
  if (room.bannedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are banned from this room" });
  if (room.mutedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are muted in this room" });
  if (!room.isPublic && !room.host.equals(req.user._id) && !room.listeners.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "This room is private" });
  await QueueItem.updateOne({ _id: item._id }, { $addToSet: { votes: req.user._id } });
  const updatedItem = await QueueItem.findById(item._id);
  const queue = await orderedQueue(item.room);
  req.app.get("io").to(item.room.toString()).emit("queue:updated", queue);
  res.json({ item: updatedItem, queue });
}));
router.delete("/queue/:itemId/vote", asyncRoute(async (req, res) => {
  const item = await QueueItem.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: "Queue item not found" });
  const room = await Room.findOne({ _id: item.room, status: "live" });
  if (!room) return res.status(404).json({ error: "Live room not found" });
  if (room.bannedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are banned from this room" });
  await QueueItem.updateOne({ _id: item._id }, { $pull: { votes: req.user._id } });
  const updatedItem = await QueueItem.findById(item._id);
  const queue = await orderedQueue(item.room);
  req.app.get("io").to(item.room.toString()).emit("queue:updated", queue);
  res.json({ item: updatedItem, queue });
}));

// Chat (5 APIs).
router.get("/rooms/:id/messages", asyncRoute(async (req, res) => {
  const room = await roomForUser(req.params.id, req.user);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const { page, limit } = pageParams(req);
  const [messages, total] = await Promise.all([
    Message.find({ room: room._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("sender", "name avatar role"),
    Message.countDocuments({ room: room._id })
  ]);
  res.json({ messages: messages.reverse(), page, limit, total, pages: Math.ceil(total / limit) });
}));
router.post("/rooms/:id/messages", asyncRoute(async (req, res) => {
  const room = await roomForUser(req.params.id, req.user);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.mutedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You are muted in this room" });
  const message = await Message.create({ room: room._id, sender: req.user._id, text: req.body.text });
  const populated = await message.populate("sender", "name avatar role");
  req.app.get("io").to(room.id).emit("chat:message", populated);
  res.status(201).json({ message: populated });
}));
router.delete("/messages/:id", asyncRoute(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });
  const room = await Room.findById(message.room);
  if (message.sender.toString() !== req.user._id.toString() && !isRoomStaff(room, req.user)) return res.status(403).json({ error: "You cannot delete this message" });
  await message.deleteOne();
  req.app.get("io").to(room.id).emit("chat:delete", { id: message.id });
  res.json({ message: "Message deleted" });
}));
router.put("/messages/:id/pin", asyncRoute(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });
  const room = await Room.findById(message.room);
  if (!isRoomStaff(room, req.user)) return res.status(403).json({ error: "Only room staff can pin messages" });
  message.pinned = req.body.pinned === undefined ? !message.pinned : Boolean(req.body.pinned);
  await message.save();
  req.app.get("io").to(room.id).emit("chat:pin", { id: message.id, pinned: message.pinned });
  res.json({ message });
}));
router.post("/messages/:id/react", asyncRoute(async (req, res) => {
  const emoji = String(req.body.emoji || "");
  if (!emoji || emoji.length > 16) return res.status(400).json({ error: "A valid emoji is required" });
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });
  const room = await roomForUser(message.room, req.user);
  if (!room || room.bannedUsers.some((id) => id.equals(req.user._id))) return res.status(403).json({ error: "You cannot react in this room" });
  const existing = message.reactions.find((reaction) => reaction.user.equals(req.user._id) && reaction.emoji === emoji);
  if (existing) existing.deleteOne();
  else message.reactions.push({ user: req.user._id, emoji });
  await message.save();
  req.app.get("io").to(message.room.toString()).emit("chat:reaction", { id: message.id, reactions: message.reactions });
  res.json({ reactions: message.reactions });
}));

// Music catalogue/provider seam (5 APIs). Catalog responses are demo data until a provider is configured.
router.get("/music/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  res.json({ tracks: featured.filter((track) => `${track.title} ${track.artist} ${track.album} ${track.language}`.toLowerCase().includes(q)), source: "demo-catalog" });
});
router.get("/music/tracks/:id", (req, res) => {
  const track = featured.find((candidate) => candidate.providerId === req.params.id);
  if (!track) return res.status(404).json({ error: "Track not found in the demo catalog" });
  res.json({ track });
});
router.get("/music/podcasts/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const podcasts = [
    { providerId: "podcast-1", title: "The Daily", artist: "The New York Times", type: "podcast", durationMs: 1800000 },
    { providerId: "podcast-2", title: "Science Vs", artist: "Gimlet", type: "podcast", durationMs: 2400000 }
  ];
  res.json({ podcasts: podcasts.filter((podcast) => `${podcast.title} ${podcast.artist}`.toLowerCase().includes(q)), source: "demo-catalog" });
});
router.get("/music/featured", (_req, res) => res.json({ tracks: featured, source: "demo-catalog" }));
router.post("/music/connect", asyncRoute(async (req, res) => {
  const { provider, accountId } = req.body;
  if (!["spotify", "apple-music", "youtube-music"].includes(provider) || !accountId) return res.status(400).json({ error: "Supported provider and accountId are required" });
  await User.updateOne({ _id: req.user._id }, { $pull: { providers: { name: provider } } });
  const user = await User.findByIdAndUpdate(req.user._id, { $push: { providers: { name: provider, accountId, connectedAt: new Date() } } }, { new: true });
  res.json({ providers: user.providers });
}));

// Library/playlists (6 APIs).
router.get("/library", asyncRoute(async (req, res) => {
  const [playlists, listenEvents] = await Promise.all([
    Playlist.find({ owner: req.user._id }).sort({ updatedAt: -1 }),
    ListenEvent.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20)
  ]);
  res.json({ playlists, recentlyPlayed: listenEvents });
}));
router.post("/playlists", asyncRoute(async (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ error: "Playlist name is required" });
  const playlist = await Playlist.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ playlist });
}));
router.get("/playlists/:id", asyncRoute(async (req, res) => {
  const playlist = await Playlist.findById(req.params.id).populate("owner", "name avatar");
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  if (!playlist.isPublic && !playlist.owner._id.equals(req.user._id)) return res.status(403).json({ error: "This playlist is private" });
  res.json({ playlist });
}));
router.put("/playlists/:id", asyncRoute(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  for (const key of ["name", "description", "isPublic"]) if (req.body[key] !== undefined) playlist[key] = req.body[key];
  if (req.body.tracks !== undefined) {
    if (!Array.isArray(req.body.tracks) || req.body.tracks.some((track) => !track.providerId || !track.title || !track.artist)) {
      return res.status(400).json({ error: "tracks must be an array of valid tracks" });
    }
    playlist.tracks = req.body.tracks;
  }
  await playlist.save();
  res.json({ playlist });
}));
router.delete("/playlists/:id", asyncRoute(async (req, res) => {
  const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  res.json({ message: "Playlist deleted" });
}));
router.post("/playlists/:id/tracks", asyncRoute(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  if (!req.body.track?.providerId || !req.body.track?.title || !req.body.track?.artist) return res.status(400).json({ error: "A valid track is required" });
  playlist.tracks.push(req.body.track);
  await playlist.save();
  res.status(201).json({ playlist });
}));

// Moderation (5 APIs).
async function moderate(req, res, action) {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!isRoomStaff(room, req.user)) return res.status(403).json({ error: "Only the host or a moderator can moderate this room" });
  if (room.host.toString() === req.params.userId) return res.status(400).json({ error: "The host cannot be moderated" });
  const target = await User.findById(req.params.userId);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (action === "mute") room.mutedUsers.addToSet(target._id);
  if (action === "kick") room.listeners.pull(target._id);
  if (action === "ban") {
    room.bannedUsers.addToSet(target._id);
    room.listeners.pull(target._id);
  }
  room.listenerCount = room.listeners.length;
  await room.save();
  if (action === "kick" || action === "ban") req.app.get("io").to(room.id).emit("room:kick", { userId: target.id, reason: action });
  return res.json({ room, user: safeUser(target) });
}
router.post("/rooms/:id/mute/:userId", asyncRoute((req, res) => moderate(req, res, "mute")));
router.post("/rooms/:id/kick/:userId", asyncRoute((req, res) => moderate(req, res, "kick")));
router.post("/rooms/:id/ban/:userId", asyncRoute((req, res) => moderate(req, res, "ban")));
router.put("/rooms/:id/moderators", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!room.host.equals(req.user._id)) return res.status(403).json({ error: "Only the host can manage moderators" });
  if (!Array.isArray(req.body.moderatorIds)) return res.status(400).json({ error: "moderatorIds must be an array" });
  const moderatorIds = [...new Set(req.body.moderatorIds.map(String))];
  if (moderatorIds.some((id) => id === room.host.toString())) return res.status(400).json({ error: "The host cannot be added as a moderator" });
  const users = await User.find({ _id: { $in: moderatorIds }, status: "active" }).select("_id");
  if (users.length !== moderatorIds.length) return res.status(400).json({ error: "Every moderator must be an active user" });
  room.moderators = moderatorIds;
  await room.save();
  res.json({ moderators: room.moderators });
}));
router.post("/reports", asyncRoute(async (req, res) => {
  if (!req.body.targetUser && !req.body.message) return res.status(400).json({ error: "A target user or message is required" });
  if (!req.body.reason?.trim()) return res.status(400).json({ error: "A report reason is required" });
  const report = await Report.create({ ...req.body, reporter: req.user._id });
  res.status(201).json({ report });
}));

// Analytics (5 APIs).
router.post("/analytics/listen-event", asyncRoute(async (req, res) => {
  const { track, durationSeconds, room } = req.body;
  if (!track?.providerId || !track?.title || !track?.artist || !Number.isFinite(Number(durationSeconds)) || Number(durationSeconds) < 1) return res.status(400).json({ error: "Track and positive durationSeconds are required" });
  const event = await ListenEvent.create({ user: req.user._id, track, durationSeconds: Number(durationSeconds), room });
  res.status(201).json({ event });
}));
router.get("/analytics/me/listen-time", asyncRoute(async (req, res) => {
  const [totals] = await ListenEvent.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: null, totalSeconds: { $sum: "$durationSeconds" }, sessions: { $sum: 1 } } }]);
  res.json({ totalSeconds: totals?.totalSeconds ?? 0, sessions: totals?.sessions ?? 0 });
}));
router.get("/analytics/rooms/:id", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!isRoomStaff(room, req.user)) return res.status(403).json({ error: "Only room staff can view room analytics" });
  const [listen] = await ListenEvent.aggregate([{ $match: { room: room._id } }, { $group: { _id: null, totalSeconds: { $sum: "$durationSeconds" }, listeners: { $addToSet: "$user" } } }]);
  const [tips, queueAdds] = await Promise.all([Tip.countDocuments({ room: room._id }), QueueItem.countDocuments({ room: room._id })]);
  res.json({ roomId: room.id, totalListenSeconds: listen?.totalSeconds ?? 0, uniqueListeners: listen?.listeners.length ?? 0, tips, queueItems: queueAdds });
}));
router.get("/analytics/top-rooms", asyncRoute(async (_req, res) => {
  const rooms = await Room.find(publicRoomQuery).sort({ listenerCount: -1 }).limit(10).select("name listenerCount host").populate("host", "name");
  res.json(rooms);
}));
router.get("/analytics/top-tracks", asyncRoute(async (_req, res) => {
  const tracks = await ListenEvent.aggregate([{ $group: { _id: "$track.providerId", track: { $first: "$track" }, plays: { $sum: 1 }, seconds: { $sum: "$durationSeconds" } } }, { $sort: { plays: -1 } }, { $limit: 10 }]);
  res.json(tracks);
}));

// Admin (5 APIs).
router.get("/admin/users", requireRole("admin"), asyncRoute(async (req, res) => {
  const { page, limit } = pageParams(req);
  const [users, total] = await Promise.all([User.find().select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments()]);
  res.json({ users, page, limit, total, pages: Math.ceil(total / limit) });
}));
router.put("/admin/users/:id/status", requireRole("admin"), asyncRoute(async (req, res) => {
  if (!["active", "suspended"].includes(req.body.status)) return res.status(400).json({ error: "status must be active or suspended" });
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
}));
router.get("/admin/reports", requireRole("admin"), asyncRoute(async (req, res) => {
  const { page, limit } = pageParams(req);
  const [reports, total] = await Promise.all([Report.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("reporter targetUser message room"), Report.countDocuments()]);
  res.json({ reports, page, limit, total, pages: Math.ceil(total / limit) });
}));
router.put("/admin/reports/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  if (!["resolved", "dismissed"].includes(req.body.status)) return res.status(400).json({ error: "status must be resolved or dismissed" });
  const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status, resolution: req.body.resolution || "" }, { new: true });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json({ report });
}));
router.get("/admin/stats", requireRole("admin"), asyncRoute(async (_req, res) => {
  const [users, rooms, liveRooms, reports, revenue] = await Promise.all([
    User.countDocuments(), Room.countDocuments(), Room.countDocuments({ status: "live" }), Report.countDocuments({ status: "open" }), Tip.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
  ]);
  res.json({ users, rooms, liveRooms, openReports: reports, tipsRecorded: revenue[0]?.total ?? 0 });
}));

// Creator monetization (5 APIs). Tips/payouts are ledger records, not payment processing.
router.post("/rooms/:id/tips", asyncRoute(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, status: "live" });
  const amount = Number(req.body.amount);
  if (!room) return res.status(404).json({ error: "Live room not found" });
  if (!Number.isFinite(amount) || amount < 1 || amount > 5000) return res.status(400).json({ error: "Tip amount must be between 1 and 5000" });
  if (req.body.currency && req.body.currency !== "USD") return res.status(400).json({ error: "Only USD tips are supported" });
  const tip = await Tip.create({ room: room._id, sender: req.user._id, creator: room.host, amount, currency: "USD", message: req.body.message || "" });
  const populated = await tip.populate("sender", "name avatar");
  req.app.get("io").to(room.id).emit("tip:received", populated);
  res.status(201).json({ tip: populated, paymentStatus: "recorded-demo-only" });
}));
router.get("/rooms/:id/tips", asyncRoute(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!isRoomStaff(room, req.user)) return res.status(403).json({ error: "Only room staff can view tips" });
  res.json(await Tip.find({ room: room._id }).sort({ createdAt: -1 }).populate("sender", "name avatar"));
}));
router.get("/creator/earnings", asyncRoute(async (req, res) => {
  const [[summary], [payouts]] = await Promise.all([
    Tip.aggregate([{ $match: { creator: req.user._id } }, { $group: { _id: null, total: { $sum: "$amount" }, tips: { $sum: 1 } } }]),
    Payout.aggregate([{ $match: { creator: req.user._id, status: "pending-provider-setup" } }, { $group: { _id: null, reserved: { $sum: "$amount" } } }])
  ]);
  const total = summary?.total ?? 0;
  res.json({ total, available: Math.max(0, total - (payouts?.reserved ?? 0)), tips: summary?.tips ?? 0, currency: "USD", payoutProcessing: "not-configured" });
}));
router.get("/creator/tips/history", asyncRoute(async (req, res) => {
  const { page, limit } = pageParams(req);
  const filter = { creator: req.user._id };
  const [tips, total] = await Promise.all([Tip.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("sender", "name avatar").populate("room", "name"), Tip.countDocuments(filter)]);
  res.json({ tips, page, limit, total, pages: Math.ceil(total / limit) });
}));
router.post("/creator/payout", asyncRoute(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 10) return res.status(400).json({ error: "Payout requests must be at least $10" });
  const [[earnings], [payouts]] = await Promise.all([
    Tip.aggregate([{ $match: { creator: req.user._id } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payout.aggregate([{ $match: { creator: req.user._id, status: "pending-provider-setup" } }, { $group: { _id: null, reserved: { $sum: "$amount" } } }])
  ]);
  const available = (earnings?.total ?? 0) - (payouts?.reserved ?? 0);
  if (available < amount) return res.status(400).json({ error: "Payout amount exceeds available recorded earnings" });
  const request = await Payout.create({ creator: req.user._id, amount, currency: "USD" });
  res.status(202).json({ request, message: "Payout request saved; connect a payment provider to process it." });
}));

export default router;

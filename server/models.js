import mongoose from "mongoose";

const { Schema, model } = mongoose;
const trackSchema = new Schema({
  providerId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  artist: { type: String, required: true, trim: true },
  album: String,
  artwork: String,
  durationMs: { type: Number, default: 0 },
  type: { type: String, enum: ["track", "podcast"], default: "track" },
  previewUrl: String
}, { _id: false });

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["host", "listener", "admin"], default: "listener" },
  avatar: String,
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  providers: [{ name: String, accountId: String, connectedAt: Date }],
  mutedIn: [{ type: Schema.Types.ObjectId, ref: "Room" }]
}, { timestamps: true });

const roomSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 500 },
  host: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isPublic: { type: Boolean, default: true },
  status: { type: String, enum: ["live", "closed"], default: "live" },
  listeners: [{ type: Schema.Types.ObjectId, ref: "User" }],
  moderators: [{ type: Schema.Types.ObjectId, ref: "User" }],
  bannedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  mutedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  playback: {
    currentTrack: { type: trackSchema, default: null },
    isPlaying: { type: Boolean, default: false },
    positionMs: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  listenerCount: { type: Number, default: 0 },
  tags: [String]
}, { timestamps: true, suppressReservedKeysWarning: true });
roomSchema.index({ status: 1, isPublic: 1, updatedAt: -1 });

const queueItemSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
  track: { type: trackSchema, required: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  position: { type: Number, default: 0 }
}, { timestamps: true });

const messageSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  pinned: { type: Boolean, default: false },
  reactions: [{ user: { type: Schema.Types.ObjectId, ref: "User" }, emoji: String }]
}, { timestamps: true });

const playlistSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 500 },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  isPublic: { type: Boolean, default: false },
  tracks: [trackSchema]
}, { timestamps: true });

const tipSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: "USD" },
  message: { type: String, default: "", maxlength: 240 },
  status: { type: String, enum: ["recorded", "paid"], default: "recorded" }
}, { timestamps: true });

const payoutSchema = new Schema({
  creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 10 },
  currency: { type: String, enum: ["USD"], default: "USD" },
  status: { type: String, enum: ["pending-provider-setup", "paid", "rejected"], default: "pending-provider-setup" }
}, { timestamps: true });

const reportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetUser: { type: Schema.Types.ObjectId, ref: "User" },
  message: { type: Schema.Types.ObjectId, ref: "Message" },
  room: { type: Schema.Types.ObjectId, ref: "Room" },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
  resolution: String
}, { timestamps: true });

const listenEventSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  room: { type: Schema.Types.ObjectId, ref: "Room", index: true },
  track: { type: trackSchema, required: true },
  durationSeconds: { type: Number, required: true, min: 1 }
}, { timestamps: true });

export const User = model("User", userSchema);
export const Room = model("Room", roomSchema);
export const QueueItem = model("QueueItem", queueItemSchema);
export const Message = model("Message", messageSchema);
export const Playlist = model("Playlist", playlistSchema);
export const Tip = model("Tip", tipSchema);
export const Payout = model("Payout", payoutSchema);
export const Report = model("Report", reportSchema);
export const ListenEvent = model("ListenEvent", listenEventSchema);

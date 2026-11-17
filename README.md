# PulseRoom

PulseRoom is a dark, music-first collaborative listening-room app. The repository contains a React/Vite client and an Express, MongoDB, and Socket.IO API.

## Features

- Register, sign in, and choose a listener or host account.
- Discover, search, and create rooms; join a live room and see who's listening.
- Manage a shared track queue, vote tracks up, and control synchronized room playback as host.
- Chat live in a room, react to messages, pin messages, and moderate listeners.
- Create and manage personal playlists; view listening stats, creator tips, and admin reports.
- Receive live updates over authenticated Socket.IO events.

The supplied music catalogue is deliberately a small demo catalogue. Playback synchronizes track state and position but does not stream audio. Tips and payout requests are demo ledger entries, not payment transactions. Connect a licensed music provider and a payment processor before enabling those production features. The `/music/connect` endpoint records a linked account identifier; it is not an OAuth flow.

## Run locally

Prerequisites: Node.js 20+ and MongoDB (local or Atlas).

1. In `server`, copy `.env.example` to `.env`, set a long random `JWT_SECRET`, and set `MONGO_URI`.
2. In `server`, run `npm install`, then `npm run dev`.
3. In `client`, copy `.env.example` to `.env`, run `npm install`, then `npm run dev`.
4. Open the Vite URL (normally `http://localhost:5173`) and create a listener or host account.

PowerShell example:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
Set-Location server
npm install
npm run dev
```

Start the client in a second terminal:

```powershell
Set-Location client
npm install
npm run dev
```

To promote a trusted account to admin, update that account directly in MongoDB; public registration never grants admin:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

## Configuration

`server/.env`:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pulseroom
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
MUSIC_API_KEY=
```

`client/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## API

All REST endpoints use the `/api` prefix. Protected endpoints require `Authorization: Bearer <token>`. List endpoints accept `page` and `limit` where applicable.

### Authentication (3)

| Method | Endpoint |
|---|---|
| POST | `/auth/register` |
| POST | `/auth/login` |
| GET | `/auth/me` |

### Room & playback (7)

| Method | Endpoint |
|---|---|
| POST | `/rooms` |
| GET | `/rooms/:id` |
| PUT | `/rooms/:id` |
| DELETE | `/rooms/:id` |
| POST | `/rooms/:id/join` |
| POST | `/rooms/:id/leave` |
| PUT | `/rooms/:id/playback` |

### Queue & voting (6)

| Method | Endpoint |
|---|---|
| POST | `/rooms/:id/queue` |
| GET | `/rooms/:id/queue` |
| DELETE | `/queue/:itemId` |
| PUT | `/rooms/:id/queue/reorder` |
| POST | `/queue/:itemId/vote` |
| DELETE | `/queue/:itemId/vote` |

### Chat (5)

| Method | Endpoint |
|---|---|
| POST | `/rooms/:id/messages` |
| GET | `/rooms/:id/messages` |
| DELETE | `/messages/:id` |
| PUT | `/messages/:id/pin` |
| POST | `/messages/:id/react` |

### Music (5)

| Method | Endpoint |
|---|---|
| GET | `/music/search?q=...` |
| GET | `/music/tracks/:id` |
| GET | `/music/podcasts/search?q=...` |
| GET | `/music/featured` |
| POST | `/music/connect` |

### Library & playlists (6)

| Method | Endpoint |
|---|---|
| GET | `/library` |
| POST | `/playlists` |
| GET | `/playlists/:id` |
| PUT | `/playlists/:id` |
| DELETE | `/playlists/:id` |
| POST | `/playlists/:id/tracks` |

### Discovery (5)

| Method | Endpoint |
|---|---|
| GET | `/rooms` |
| GET | `/rooms/live` |
| GET | `/rooms/trending` |
| GET | `/rooms/search?q=...` |
| GET | `/rooms/recommended` |

### Moderation (5)

| Method | Endpoint |
|---|---|
| POST | `/rooms/:id/mute/:userId` |
| POST | `/rooms/:id/kick/:userId` |
| POST | `/rooms/:id/ban/:userId` |
| PUT | `/rooms/:id/moderators` |
| POST | `/reports` |

### Analytics (5)

| Method | Endpoint |
|---|---|
| POST | `/analytics/listen-event` |
| GET | `/analytics/me/listen-time` |
| GET | `/analytics/rooms/:id` |
| GET | `/analytics/top-rooms` |
| GET | `/analytics/top-tracks` |

### Admin (5)

| Method | Endpoint |
|---|---|
| GET | `/admin/users` |
| PUT | `/admin/users/:id/status` |
| GET | `/admin/reports` |
| PUT | `/admin/reports/:id` |
| GET | `/admin/stats` |

### Creator monetization (5)

| Method | Endpoint |
|---|---|
| POST | `/rooms/:id/tips` |
| GET | `/rooms/:id/tips` |
| GET | `/creator/earnings` |
| GET | `/creator/tips/history` |
| POST | `/creator/payout` |

The brief's feature groups total **54 feature endpoints**, in addition to the 3 shared authentication endpoints.

## Socket.IO

Socket connections authenticate with `io(url, { auth: { token } })`.

| Direction | Event | Payload |
|---|---|---|
| Client → server | `room:join` | `{ roomId }` |
| Client → server | `room:leave` | `{ roomId }` |
| Client → server | `playback:update` | `{ roomId, action, positionMs?, track? }` |
| Client → server | `queue:add` | `{ roomId, track }` |
| Client → server | `queue:vote` | `{ roomId, itemId }` |
| Client → server | `chat:send` | `{ roomId, text }` |
| Server → clients | `playback:state` | Playback state with server timestamp |
| Server → clients | `queue:updated` | Current queue, vote-ranked |
| Server → clients | `chat:message` | Persisted chat message |
| Server → clients | `presence:update` | Current room listeners |
| Server → clients | `tip:received` | Recorded tip |

Room playback is persisted by the server. A production audio integration should use `startedAt` and `positionMs` to calculate and correct client drift.

## Checks

```powershell
Set-Location server
npm run check
Set-Location ..\client
npm run build
```

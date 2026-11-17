import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Activity, ArrowDown, ArrowDownUp, ArrowLeft, ArrowRight, ArrowUp, AudioLines, BarChart3, Bell, Check,
  ChevronDown, CircleHelp, Compass, Headphones, Heart, Home, Library, LogOut, Menu,
  Flag, MessageCircle, MoreHorizontal, Music2, Pause, Play, Plus, Radio, Search, Send,
  Settings2, Shield, SkipForward, Sparkles, ThumbsUp, UserRound, Users, Wallet, X
} from "lucide-react";
import api from "./services/api.js";
import { useAuth } from "./context/AuthContext.jsx";

const art = [
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=500&q=85",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=85",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=85",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=85"
];
const statsSlides = [
  { image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1800&q=85", label: "YOUR LISTENING, LATELY", title: "A little more you, in every song.", description: "See the rooms and tracks the community keeps coming back to." },
  { image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85", label: "FOLLOW THE FEELING", title: "Every listen leaves a little story.", description: "Your listening moments add up to something worth looking back on." },
  { image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1800&q=85", label: "SOUNDS WE SHARE", title: "Find out what's moving the room.", description: "Explore the live spaces and tracks bringing listeners together." }
];
const creatorSlides = [
  { image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1800&q=85", label: "YOUR CREATOR STUDIO", title: "Bring people together through sound.", description: "Every great room starts with a host who cares about the vibe." },
  { image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1800&q=85", label: "GOOD ENERGY GOES AROUND", title: "Your community shows the love.", description: "Keep track of tips listeners have recorded for your rooms." },
  { image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1800&q=85", label: "MAKE A ROOM WORTH STAYING IN", title: "Set the scene. Share the moment.", description: "Build a listening space people are happy to come back to." }
];
const ambientImages = {
  auth: [
    "photo-1519608487953-e999c86e7455",
    "photo-1470225620780-dba8ba36b745",
    "photo-1500530855697-b586d89ba3ee"
  ],
  discover: [
    "photo-1506157786151-b8491531f063",
    "photo-1519681393784-d120267933ba",
    "photo-1519608487953-e999c86e7455"
  ],
  create: [
    "photo-1516450360452-9312f5e86fc7",
    "photo-1506157786151-b8491531f063",
    "photo-1470225620780-dba8ba36b745"
  ],
  room: [
    "photo-1506157786151-b8491531f063",
    "photo-1470225620780-dba8ba36b745",
    "photo-1500530855697-b586d89ba3ee"
  ],
  library: [
    "photo-1500530855697-b586d89ba3ee",
    "photo-1519608487953-e999c86e7455",
    "photo-1519681393784-d120267933ba"
  ],
  playlist: [
    "photo-1519681393784-d120267933ba",
    "photo-1470225620780-dba8ba36b745",
    "photo-1500530855697-b586d89ba3ee"
  ],
  analytics: [
    "photo-1519608487953-e999c86e7455",
    "photo-1506157786151-b8491531f063",
    "photo-1519681393784-d120267933ba"
  ],
  creator: [
    "photo-1516450360452-9312f5e86fc7",
    "photo-1470225620780-dba8ba36b745",
    "photo-1506157786151-b8491531f063"
  ],
  admin: [
    "photo-1506157786151-b8491531f063",
    "photo-1516450360452-9312f5e86fc7",
    "photo-1519608487953-e999c86e7455"
  ]
};
const mediaArt = (value, index = 0) => value || art[index % art.length];
const getError = (error) => error.response?.data?.error || error.message || "Something went wrong";
const formatTime = (milliseconds) => `${Math.floor(milliseconds / 60000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}`;

function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="boot-screen"><AudioLines className="pulse-icon" /><span>Finding your frequency...</span></div>;
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={user ? <Shell /> : <AuthPage />} />
    </Routes>
  );
}

function AuthPage() {
  const { user, login, register, sessionError } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "listener" });
  useEffect(() => { if (sessionError) setError(sessionError); }, [sessionError]);
  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate("/");
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <AmbientSlideshow auth />
      <div className="auth-grain" />
      <Link className="brand auth-brand" to="/auth"><span className="brand-mark"><AudioLines size={21} /></span>pulse<span className="brand-light">room</span></Link>
      <div className="auth-grid">
        <section className="auth-story">
          <div className="eyebrow"><span className="live-dot" /> MUSIC SOUNDS BETTER TOGETHER</div>
          <h1>Find your<br /><span>people.</span><br />Press play.</h1>
          <p>Drop into rooms built around the music you love. Discover a new sound, or bring your whole crew along.</p>
          <div className="story-people"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>K</span></div><span>Listening together, right now</span><AudioLines size={17} /></div>
        </section>
        <section className="auth-card">
          <span className="eyebrow purple">{isRegister ? "YOUR NEXT FAVORITE ROOM" : "GOOD TO HAVE YOU BACK"}</span>
          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p className="muted">{isRegister ? "Your people and your playlists are waiting." : "Sign in and tune back in."}</p>
          <form onSubmit={submit} className="form-stack">
            {isRegister && <label>Your name<input required maxLength="60" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="How should we call you?" /></label>}
            <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
            <label>Password<input required minLength="8" type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>
            {isRegister && <label>I want to join as<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="listener">Listener</option><option value="host">Host</option></select></label>}
            {error && <p className="form-error">{error}</p>}
            <button className="button button-primary full-width" disabled={busy}>{busy ? "One second..." : isRegister ? "Create account" : "Sign in"} <ArrowRight size={16} /></button>
          </form>
          <p className="auth-toggle">{isRegister ? "Already part of the room?" : "New around here?"} <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>{isRegister ? "Sign in" : "Create an account"}</button></p>
          <div className="auth-note"><Shield size={14} /> Your listening is yours. Always.</div>
        </section>
      </div>
      <div className="auth-bottom"><span>© 2026 PulseRoom</span><span>Made for the moments between the songs.</span></div>
    </main>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDiscoverPage = location.pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [playerTrack, setPlayerTrack] = useState({
    providerId: "telugu-1",
    title: "Naatu Naatu",
    artist: "Rahul Sipligunj, Kaala Bhairava",
    language: "Telugu",
    artwork: art[1]
  });
  const [playerRequest, setPlayerRequest] = useState(0);
  const navItems = [
    { to: "/", label: "Discover", icon: Compass },
    { to: "/library", label: "Your library", icon: Library },
    { to: "/analytics", label: "Your stats", icon: BarChart3 },
    { to: "/creator", label: "Creator studio", icon: Wallet }
  ];
  function playTrack(track) {
    setPlayerTrack(track);
    setPlayerRequest((request) => request + 1);
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/"><span className="brand-mark"><AudioLines size={20} /></span>pulse<span className="brand-light">room</span></Link>
        <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        <div className="side-label">MENU</div>
        <nav className="primary-nav">{navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} end={to === "/"} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><Icon size={18} /><span>{label}</span>{to === "/" && <span className="nav-live" />}</NavLink>)}</nav>
        {user.role === "admin" && <><div className="side-label side-label-spaced">WORKSPACE</div><NavLink to="/admin" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><Shield size={18} /><span>Admin dashboard</span></NavLink></>}
        <div className="side-label side-label-spaced">YOUR SPACE</div>
        <div className="sidebar-promo"><div className="promo-icon"><Headphones size={19} /></div><strong>Your room, your rules.</strong><p>Start a room and let the right people find their way in.</p><Link to="/create-room" onClick={() => setMobileOpen(false)}>Create a room <ArrowRight size={14} /></Link></div>
        <div className="sidebar-spacer" />
        <div className="sidebar-help"><CircleHelp size={16} /> Help & feedback</div>
        <div className="profile-row"><div className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-meta"><strong>{user.name}</strong><span>{user.role === "host" ? "Room host" : user.role}</span></div><button className="icon-button logout-button" title="Sign out" onClick={logout}><LogOut size={16} /></button></div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <AmbientSlideshow />
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button><div className="breadcrumbs"><span>PulseRoom</span><span className="crumb-slash">/</span><strong>Listen together</strong></div><div className="top-actions"><span className="top-status"><span className="live-dot" /> All systems grooving</span><button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /></button><div className="top-avatar">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
        <div className={`page-content ${isDiscoverPage ? "discover-content" : ""}`}><Routes><Route path="/" element={<DiscoverPage onPlayTrack={playTrack} />} /><Route path="/create-room" element={<CreateRoomPage />} /><Route path="/room/:id" element={<LiveRoomPage />} /><Route path="/library" element={<LibraryPage />} /><Route path="/playlist/:id" element={<PlaylistPage />} /><Route path="/analytics" element={<AnalyticsPage />} /><Route path="/creator" element={<CreatorPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<DiscoverPage onPlayTrack={playTrack} />} /></Routes></div>
      </main>
      {isDiscoverPage && <BottomPlayer
        track={playerTrack}
        request={playerRequest}
      />}
    </div>
  );
}

function AmbientSlideshow({ auth = false }) {
  const { pathname } = useLocation();
  const section = auth ? "auth" : pathname === "/" ? "discover"
    : pathname.startsWith("/create-room") ? "create"
      : pathname.startsWith("/room/") ? "room"
        : pathname.startsWith("/library") ? "library"
          : pathname.startsWith("/playlist/") ? "playlist"
            : pathname.startsWith("/analytics") ? "analytics"
              : pathname.startsWith("/creator") ? "creator"
                : pathname.startsWith("/admin") ? "admin" : "discover";
  const photos = ambientImages[section];
  const [slides, setSlides] = useState({ current: 0, previous: 0 });
  useEffect(() => {
    setSlides({ current: 0, previous: 0 });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setSlides(({ current }) => {
        const next = (current + 1) % photos.length;
        const image = new Image();
        image.src = `https://images.unsplash.com/${photos[next]}?auto=format&fit=crop&w=1800&q=80`;
        return { previous: current, current: next };
      });
    }, 7200);
    return () => window.clearInterval(timer);
  }, [pathname, photos.length]);
  return <div className={`ambient-slideshow ${auth ? "ambient-slideshow-auth" : ""}`} aria-hidden="true">
    {[slides.previous, slides.current].map((photoIndex, layerIndex) => (
      <img
        key={`${layerIndex}-${photoIndex}`}
        className={layerIndex === 1 ? "active" : ""}
        src={`https://images.unsplash.com/${photos[photoIndex]}?auto=format&fit=crop&w=1800&q=80`}
        alt=""
      />
    ))}
  </div>;
}

function BottomPlayer({ track, request }) {
  const spotifyTrackId = track?.spotifyTrackId;
  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track?.title || ""} ${track?.artist || ""}`)}`;
  return <section className="bottom-player" aria-label="Music player">
    <div className="bottom-track">
      <img src={mediaArt(track?.artwork)} alt="" />
      <span className="bottom-track-copy"><strong>{track?.title || "Choose a track"}</strong><small>{track?.artist || "Your player is ready"}</small></span>
      <Heart size={16} className="bottom-track-like" aria-hidden="true" />
    </div>
    {spotifyTrackId ? <iframe
      key={`${track.providerId}-${request}`}
      className="spotify-player"
      src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0${request ? "&autoplay=1" : ""}`}
      title={`Play ${track.title} by ${track.artist} on Spotify`}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="eager"
    /> : <a className="spotify-listen-link" href={spotifySearchUrl} target="_blank" rel="noreferrer"><span>Listen to {track?.title || "this track"} on Spotify</span><ArrowRight size={16} /></a>}
  </section>;
}

function DiscoverPage({ onPlayTrack }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("For you");
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  useEffect(() => {
    Promise.all([api.get("/rooms/live"), api.get("/music/featured")])
      .then(([roomData, musicData]) => { setRooms(roomData.data); setTracks(musicData.data.tracks); })
      .catch((err) => setError(getError(err)))
      .finally(() => setLoading(false));
  }, []);
  async function search(event) {
    event.preventDefault();
    if (!query.trim()) {
      setTab("For you");
      try {
        const { data } = await api.get("/rooms/live");
        setRooms(data);
        setError("");
      } catch (err) { setError(getError(err)); }
      return;
    }
    setTab("Search");
    try {
      const { data } = await api.get("/rooms/search", { params: { q: query } });
      setRooms(data.rooms);
      setError("");
    } catch (err) { setError(getError(err)); }
  }
  return (
    <div className="page-enter discover-page">
      <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> YOUR LISTENING ROOM IS READY</div><h1>{greeting}, {user.name.split(" ")[0]}<span className="title-period">.</span></h1><p className="subtitle">Find a sound, find your people.</p></div><Link className="button button-primary" to="/create-room"><Plus size={17} /> Start a room</Link></div>
      {error && <Notice>{error}</Notice>}
      <section className="hero-banner"><div className="hero-glow" /><div className="hero-copy"><span className="eyebrow hero-eyebrow"><Sparkles size={13} /> THE LISTENING ROOM</span><h2>It's better<br />when we're <span>together.</span></h2><p>Live rooms for people who feel music a little more.</p><Link to="/create-room" className="button hero-button">Find your frequency <ArrowRight size={16} /></Link></div><div className="hero-visual"><div className="hero-disc"><div className="disc-center"><AudioLines size={26} /></div></div><div className="sound-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><span className="floating-note note-one">♪</span><span className="floating-note note-two">♫</span><div className="hero-now"><span className="live-dot" /> LIVE NOW <b>{rooms.reduce((sum, room) => sum + (room.listenerCount || room.listeners?.length || 0), 0)} listening</b></div></div></section>
      <form onSubmit={search} className="discover-tools"><div className="tabs">{["For you", "Live now", "Trending"].map((label) => <button type="button" key={label} className={`tab ${tab === label ? "selected" : ""}`} onClick={async () => { setTab(label); try { const path = label === "Trending" ? "/rooms/trending" : label === "For you" ? "/rooms/recommended" : "/rooms/live"; const { data } = await api.get(path); setRooms(data.rooms || data); setError(""); } catch (err) { setError(getError(err)); } }}>{label}{label === "Live now" && <span className="tab-live" />}</button>)}</div><div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rooms, artists, moods..." /><kbd>↵</kbd></div></form>
      <section className="section-block"><div className="section-heading"><div><div className="eyebrow section-eyebrow"><span className="live-dot" /> HAPPENING RIGHT NOW</div><h2>{tab === "Search" ? "Room results" : "Rooms you'll love"}</h2></div><button className="text-button" onClick={async () => { try { const { data } = await api.get("/rooms"); setRooms(data.rooms); } catch (err) { setError(getError(err)); } }}>See all <ArrowRight size={15} /></button></div>
        {loading ? <div className="loading-row">Finding live rooms...</div> : rooms.length ? <div className="room-grid">{rooms.slice(0, 6).map((room, index) => <RoomCard key={room._id} room={room} index={index} />)}</div> : <Empty icon={Radio} title="No rooms on air yet" text="Be the first one to start a listening party." action={<Link className="button button-outline" to="/create-room"><Plus size={15} /> Create a room</Link>} />}
      </section>
      <section className="section-block track-section"><div className="section-heading"><div><div className="eyebrow section-eyebrow"><Sparkles size={13} /> TELUGU TRACKS</div><h2>Made for the moment</h2></div><span className="muted small-copy">Choose a song, then listen on Spotify</span></div><div className="track-strip">{tracks.slice(0, 4).map((track, index) => <div className="track-card" key={track.providerId}><div className="track-art-wrap"><img src={mediaArt(track.artwork, index)} alt="" /><span className="track-language-pill">{track.language || "TELUGU"}</span><button className="track-play track-launch" onClick={() => onPlayTrack(track)} aria-label={`Listen to ${track.title}`} title={`Listen to ${track.title}`}><Play size={17} fill="currentColor" /></button><TrackSaveButton track={track} /></div><strong>{track.title}</strong><span>{track.artist}</span></div>)}</div></section>
    </div>
  );
}

function RoomCard({ room, index = 0 }) {
  return <Link className="room-card" to={`/room/${room._id}`}><div className="room-card-art" style={{ backgroundImage: `linear-gradient(180deg, transparent 18%, rgba(9,10,15,.9) 100%), url("${mediaArt(room.playback?.currentTrack?.artwork, index)}")` }}><div className="room-card-top"><span className="live-pill"><span className="live-dot animate-pulse" /> LIVE</span><span className="listener-pill"><Users size={13} /> {room.listenerCount || room.listeners?.length || 0}</span></div><div className="room-card-bottom"><span className="room-tag">{room.tags?.[0] || ["ALT / INDIE", "LATE NIGHT", "SOFT FOCUS"][index % 3]}</span><h3>{room.name}</h3><div className="room-host"><span className="mini-avatar">{room.host?.name?.slice(0, 1) || "P"}</span> hosted by <b>{room.host?.name || "PulseRoom host"}</b></div></div></div><div className="room-card-footer"><span className="room-track"><Music2 size={13} /> {room.playback?.currentTrack?.title || "Setting the mood"}</span><ArrowRight size={15} className="room-arrow" /></div></Link>;
}

function TrackSaveButton({ track }) {
  const [playlists, setPlaylists] = useState(null);
  const [error, setError] = useState("");
  async function openPicker() {
    if (playlists) {
      setPlaylists(null);
      return;
    }
    try {
      const { data } = await api.get("/library");
      setPlaylists(data.playlists);
      setError("");
    } catch (err) { setError(getError(err)); }
  }
  async function save(playlist) {
    try {
      await api.post(`/playlists/${playlist._id}/tracks`, { track });
      setPlaylists(null);
    } catch (err) { setError(getError(err)); }
  }
  return <div className="track-save-wrap">
    <button className="track-play" onClick={openPicker} aria-label={`Save ${track.title} to a playlist`} title="Save to playlist"><Plus size={19} /></button>
    {playlists && <div className="track-save-menu">
      <strong>Save to playlist</strong>
      {playlists.length ? playlists.map((playlist) => <button key={playlist._id} onClick={() => save(playlist)}>{playlist.name}</button>) : <Link to="/library">Create a playlist first</Link>}
      <button className="track-save-close" onClick={() => setPlaylists(null)}>Close</button>
    </div>}
    {error && <span className="save-error" role="status">{error}</span>}
  </div>;
}

function CreateRoomPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", isPublic: true, tags: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/rooms", { ...form, tags: form.tags });
      navigate(`/room/${data.room._id}`);
    } catch (err) { setError(getError(err)); }
    finally { setBusy(false); }
  }
  return <div className="page-enter narrow-page"><PageHeading eyebrow="SET THE SCENE" title="Start a room." subtitle="Give your listening party a name. The right people will find their way in." /><form className="panel form-stack room-create-form" onSubmit={submit}><label>Room name<input required maxLength="80" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunday Slowdown" /></label><label>What are we listening to?<textarea maxLength="500" rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Give your room a little personality..." /></label><label>Room vibe<input value={form.tags.join(", ")} onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="indie, focus, late night" /></label><label className="switch-row"><span><strong>Public room</strong><small>Anyone can find and join your room.</small></span><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /></label>{error && <Notice>{error}</Notice>}<button className="button button-primary" disabled={busy}>{busy ? "Opening your room..." : "Open my room"} <ArrowRight size={16} /></button></form><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to discover</Link></div>;
}

function LiveRoomPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [messages, setMessages] = useState([]);
  const [listeners, setListeners] = useState([]);
  const [playback, setPlayback] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [musicKind, setMusicKind] = useState("track");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [moderatorIds, setModeratorIds] = useState([]);
  const token = localStorage.getItem("pulseroom-token");
  const isHost = room?.host?._id === user.id || room?.host === user.id;
  const isModerator = room?.moderators?.some((moderator) => String(moderator._id || moderator) === user.id) || false;
  const canModerate = isHost || isModerator || user.role === "admin";
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!room || !playback?.isPlaying || !playback.currentTrack) return undefined;
    const timer = window.setInterval(() => {
      api.post("/analytics/listen-event", {
        room: id,
        track: playback.currentTrack,
        durationSeconds: 30
      }).catch((err) => setError(getError(err)));
    }, 30000);
    return () => window.clearInterval(timer);
  }, [id, room, playback?.isPlaying, playback?.currentTrack?.providerId]);
  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/rooms/${id}`), api.get(`/rooms/${id}/queue`), api.get(`/rooms/${id}/messages`), api.post(`/rooms/${id}/join`)])
      .then(([roomData, queueData, messageData]) => {
        if (!active) return;
        setRoom(roomData.data.room);
        setPlayback(roomData.data.room.playback);
        setQueue(queueData.data);
        setMessages(messageData.data.messages || []);
        setListeners(roomData.data.room.listeners || []);
      })
      .catch((err) => setError(getError(err)));
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token } });
    socket.on("connect", () => socket.emit("room:join", { roomId: id }, (response) => { if (response?.playback) setPlayback(response.playback); if (response?.listeners) setListeners(response.listeners); }));
    socket.on("playback:state", setPlayback);
    socket.on("queue:updated", setQueue);
    socket.on("chat:message", (chatMessage) => setMessages((current) => [...current, chatMessage]));
    socket.on("chat:delete", ({ id: messageId }) => setMessages((current) => current.filter((item) => item._id !== messageId)));
    socket.on("chat:pin", ({ id: messageId, pinned }) => setMessages((current) => current.map((item) => item._id === messageId ? { ...item, pinned } : item)));
    socket.on("chat:reaction", ({ id: messageId, reactions }) => setMessages((current) => current.map((item) => item._id === messageId ? { ...item, reactions } : item)));
    socket.on("presence:update", setListeners);
    socket.on("tip:received", (tip) => { setToast(`${tip.sender?.name || "Someone"} sent a $${tip.amount} tip`); window.setTimeout(() => setToast(""), 4000); });
    socket.on("room:kick", (event) => {
      if (event.userId === user.id) {
        setToast("You were removed from this room");
        navigate("/");
      }
    });
    return () => { socket.emit("room:leave", { roomId: id }); socket.disconnect(); };
  }, [id, token, user.id, navigate]);
  async function run(action, positionMs) {
    try {
      const { data } = await api.put(`/rooms/${id}/playback`, { action, positionMs });
      setPlayback(data.playback);
    } catch (err) { setError(getError(err)); }
  }
  async function searchMusic(event) {
    event.preventDefault();
    if (!search.trim()) return;
    try {
      const endpoint = musicKind === "podcast" ? "/music/podcasts/search" : "/music/search";
      const { data } = await api.get(endpoint, { params: { q: search } });
      setResults(musicKind === "podcast" ? data.podcasts : data.tracks);
      setError("");
    } catch (err) { setError(getError(err)); }
  }
  async function addTrack(track) {
    try {
      await api.post(`/rooms/${id}/queue`, { track });
      setResults([]);
      setSearch("");
    } catch (err) { setError(getError(err)); }
  }
  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      const { data } = await api.post(`/rooms/${id}/messages`, { text: message });
      setMessages((current) => current.some((item) => item._id === data.message._id) ? current : [...current, data.message]);
      setMessage("");
    } catch (err) { setError(getError(err)); }
  }
  async function vote(itemId) {
    try {
      const item = queue.find((entry) => entry._id === itemId);
      const alreadyVoted = item?.votes?.some((voteId) => String(voteId) === user.id);
      const { data } = alreadyVoted
        ? await api.delete(`/queue/${itemId}/vote`)
        : await api.post(`/queue/${itemId}/vote`);
      setQueue(data.queue);
    } catch (err) { setError(getError(err)); }
  }
  async function reorderQueue(itemId, direction) {
    const index = queue.findIndex((item) => item._id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= queue.length) return;
    const itemIds = queue.map((item) => item._id);
    [itemIds[index], itemIds[nextIndex]] = [itemIds[nextIndex], itemIds[index]];
    try {
      const { data } = await api.put(`/rooms/${id}/queue/reorder`, { itemIds });
      setQueue(data);
    } catch (err) { setError(getError(err)); }
  }
  async function reactToMessage(messageId, emoji) {
    try {
      const { data } = await api.post(`/messages/${messageId}/react`, { emoji });
      setMessages((current) => current.map((item) => item._id === messageId ? { ...item, reactions: data.reactions } : item));
    } catch (err) { setError(getError(err)); }
  }
  async function togglePin(item) {
    try {
      const { data } = await api.put(`/messages/${item._id}/pin`, { pinned: !item.pinned });
      setMessages((current) => current.map((entry) => entry._id === item._id ? data.message : entry));
    } catch (err) { setError(getError(err)); }
  }
  async function reportListener(listener) {
    const reason = window.prompt(`Why are you reporting ${listener.name || "this listener"}?`);
    if (!reason?.trim()) return;
    try {
      await api.post("/reports", { room: id, targetUser: listener._id || listener.id, reason: reason.trim() });
      setToast("Report sent to the moderation team");
    } catch (err) { setError(getError(err)); }
  }
  async function moderateListener(listener, action) {
    const listenerId = listener._id || listener.id;
    try {
      await api.post(`/rooms/${id}/${action}/${listenerId}`);
      if (action !== "mute") setListeners((current) => current.filter((entry) => (entry._id || entry.id) !== listenerId));
      setToast(`Listener ${action}ed`);
    } catch (err) { setError(getError(err)); }
  }
  async function saveModerators() {
    try {
      const { data } = await api.put(`/rooms/${id}/moderators`, { moderatorIds });
      setRoom((current) => ({ ...current, moderators: data.moderators }));
      setToast("Room moderators updated");
    } catch (err) { setError(getError(err)); }
  }
  if (error && !room) return <Notice>{error}</Notice>;
  if (!room) return <div className="loading-row">Tuning into the room...</div>;
  const track = playback?.currentTrack || queue[0]?.track;
  const durationMs = track?.durationMs || 0;
  const elapsedMs = playback?.isPlaying && playback.startedAt ? Math.max(0, clock - new Date(playback.startedAt).getTime()) : 0;
  const positionMs = Math.min(durationMs || Number.MAX_SAFE_INTEGER, (playback?.positionMs || 0) + elapsedMs);
  const progressPercent = durationMs ? Math.min(100, positionMs / durationMs * 100) : 0;
  return <div className="page-enter live-page">
    <div className="room-header-row"><Link className="back-link" to="/"><ArrowLeft size={15} /> All rooms</Link><span className="live-pill"><span className="live-dot" /> LIVE ROOM</span><button className="button button-outline button-small" onClick={async () => { try { await api.post(`/rooms/${id}/tips`, { amount: 5, message: "Love the room!" }); setToast("Thanks for supporting the host!"); } catch (err) { setError(getError(err)); } }}><Heart size={14} /> Send $5 tip</button>{isHost && <button className="button button-outline button-small" onClick={async () => { if (!window.confirm("Close this room for everyone?")) return; try { await api.delete(`/rooms/${id}`); navigate("/"); } catch (err) { setError(getError(err)); } }}>Close room</button>}</div>
    {toast && <div className="toast"><Check size={15} /> {toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={14} /></button></div>}
    {error && <Notice>{error}</Notice>}
    <div className="live-layout">
      <div className="live-main">
        <section className="now-playing panel"><div className="now-art" style={{ backgroundImage: `url("${mediaArt(track?.artwork)}")` }}><div className="vinyl"><div /></div></div><div className="now-copy"><div className="eyebrow section-eyebrow"><span className="live-dot" /> NOW PLAYING IN</div><h1>{room.name}</h1><p className="muted">{room.description || "A little room for the music we're feeling."}</p><div className="track-now"><span className="track-now-art" style={{ backgroundImage: `url("${mediaArt(track?.artwork)}")` }} /><span><b>{track?.title || "Choose a track to get started"}</b><small>{track?.artist || "The room is yours"}</small></span><Heart size={17} className="muted" /></div><div className={`progress-line ${isHost ? "progress-seekable" : ""}`} role={isHost ? "slider" : undefined} aria-label={isHost ? "Seek playback" : undefined} aria-valuemin={isHost ? 0 : undefined} aria-valuemax={isHost ? durationMs : undefined} aria-valuenow={isHost ? positionMs : undefined} tabIndex={isHost ? 0 : -1} onClick={isHost && durationMs ? (event) => { const bounds = event.currentTarget.getBoundingClientRect(); run("seek", Math.round((event.clientX - bounds.left) / bounds.width * durationMs)); } : undefined} onKeyDown={isHost && durationMs ? (event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); run("seek", Math.max(0, Math.min(durationMs, positionMs + (event.key === "ArrowRight" ? 5000 : -5000)))); } } : undefined}><span style={{ width: `${progressPercent}%` }} /></div><div className="time-row"><span>{formatTime(positionMs)}</span><span>{durationMs ? formatTime(durationMs) : "—:—"}</span></div><div className="player-controls"><button className="icon-button" aria-label="Previous track" disabled><SkipForward className="flip-icon" size={18} /></button><button className="play-large" onClick={() => run(playback?.isPlaying ? "pause" : "play")} aria-label={playback?.isPlaying ? "Pause" : "Play"} disabled={!isHost}>{playback?.isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button><button className="icon-button" onClick={() => run("next")} aria-label="Next track" disabled={!isHost}><SkipForward size={18} /></button><span className="control-divider" /><button className="icon-button" title="Copy room link" onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast("Room link copied"); }}><MoreHorizontal size={18} /></button></div></div></section>
        <section className="panel queue-panel">
          <div className="panel-heading"><div><div className="eyebrow section-eyebrow"><AudioLines size={13} /> THE LINEUP</div><h2>Up next <span className="count-chip">{queue.length}</span></h2></div><ArrowDownUp size={17} className="muted" /></div>
          <div className="music-search-modes"><button className={musicKind === "track" ? "selected" : ""} onClick={() => { setMusicKind("track"); setResults([]); }}>Tracks</button><button className={musicKind === "podcast" ? "selected" : ""} onClick={() => { setMusicKind("podcast"); setResults([]); }}>Podcasts</button></div>
          <form className="music-search" onSubmit={searchMusic}><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${musicKind === "podcast" ? "podcasts" : "tracks"} to add...`} /><button className="search-submit" aria-label="Search"><ArrowRight size={15} /></button></form>
          {results.length > 0 && <div className="search-results">{results.map((result, index) => <div key={result.providerId} className="search-result"><img src={mediaArt(result.artwork, index)} alt="" /><span><b>{result.title}</b><small>{result.artist}</small></span><button className="icon-button add-track" onClick={() => addTrack(result)} aria-label={`Add ${result.title}`}><Plus size={17} /></button></div>)}</div>}
          {queue.length ? <div className="queue-list">{queue.map((item, index) => {
            const voted = item.votes?.some((voteId) => String(voteId) === user.id);
            const owner = String(item.addedBy?._id) === user.id;
            return <div className="queue-item" key={item._id}>
              <span className="queue-index">{String(index + 1).padStart(2, "0")}</span>
              <img className="queue-art" src={mediaArt(item.track.artwork, index)} alt="" />
              <span className="queue-info"><b>{item.track.title}</b><small>{item.track.artist} · added by {item.addedBy?.name || "a listener"}</small></span>
              <button className={`vote-button ${voted ? "voted" : ""}`} onClick={() => vote(item._id)} aria-label={voted ? "Remove your vote" : "Vote this track up"}><Heart size={14} fill={voted ? "currentColor" : "none"} /> {item.votes?.length || 0}</button>
              {isHost && <span className="queue-reorder"><button className="icon-button" disabled={index === 0} onClick={() => reorderQueue(item._id, -1)} aria-label="Move track up"><ArrowUp size={14} /></button><button className="icon-button" disabled={index === queue.length - 1} onClick={() => reorderQueue(item._id, 1)} aria-label="Move track down"><ArrowDown size={14} /></button></span>}
              {(isHost || owner) && <button className="icon-button remove-queue" title="Remove from queue" onClick={async () => { try { await api.delete(`/queue/${item._id}`); setQueue((list) => list.filter((entry) => entry._id !== item._id)); } catch (err) { setError(getError(err)); } }}><X size={14} /></button>}
            </div>;
          })}</div> : <div className="empty-queue"><Music2 size={22} /><span>It's quiet in here. Add the first track.</span></div>}
        </section>
      </div>
      <aside className="live-aside">
        <section className="panel listeners-panel">
          <div className="panel-heading"><div><div className="eyebrow section-eyebrow"><Users size={13} /> IN THIS ROOM</div><h2>Listening now <span className="count-chip">{listeners.length || room.listenerCount || 1}</span></h2></div><span className="live-dot" /></div>
          <div className="listeners-list">{listeners.slice(0, 12).map((listener, index) => {
            const listenerId = listener._id || listener.id;
            const ownsRoom = String(listenerId) === String(room.host?._id || room.host);
            const isSelf = String(listenerId) === user.id;
            const isListenerModerator = room.moderators?.some((moderator) => String(moderator._id || moderator) === String(listenerId));
            return <div className="listener-row listener-row-wrap" key={listenerId || index}>
              <span className={`listener-avatar listener-avatar-${index % 4}`}>{listener.name?.slice(0, 1) || "P"}</span>
              <span className="listener-details"><b>{listener.name || "Listener"}{ownsRoom && <small className="role-chip">HOST</small>}{isListenerModerator && <small className="role-chip">MOD</small>}</b><small>{isSelf ? "You" : "Listening"}</small></span>
              {canModerate && !ownsRoom && !isSelf && <div className="listener-actions"><button className="icon-button" title="Mute listener" onClick={() => moderateListener(listener, "mute")}><Shield size={13} /></button><button className="icon-button" title="Remove listener" onClick={() => moderateListener(listener, "kick")}><X size={14} /></button><button className="icon-button danger-action" title="Ban listener" onClick={() => moderateListener(listener, "ban")}><Flag size={13} /></button></div>}
              {!isSelf && !ownsRoom && <button className="icon-button report-listener" title="Report listener" onClick={() => reportListener(listener)}><Flag size={13} /></button>}
              {isHost && !ownsRoom && <label className="moderator-check" title="Make moderator"><input type="checkbox" checked={moderatorIds.includes(String(listenerId)) || isListenerModerator} onChange={(event) => setModeratorIds((current) => event.target.checked ? [...new Set([...current, String(listenerId)])] : current.filter((value) => value !== String(listenerId)))} /><span>MOD</span></label>}
              <AudioLines size={14} className="muted listener-wave" />
            </div>;
          })}{!listeners.length && <div className="muted small-copy">You found the room first. Invite a friend.</div>}</div>
          {isHost && <button className="button button-outline full-width mod-button" onClick={saveModerators}><Shield size={14} /> Save moderator roles</button>}
          <button className="button button-outline full-width invite-button" onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast("Room link copied"); }}>Invite someone <Plus size={15} /></button>
        </section>
        <section className="panel chat-panel">
          <div className="panel-heading"><div><div className="eyebrow section-eyebrow"><MessageCircle size={13} /> ROOM CHAT</div><h2>Say hello</h2></div><span className="muted small-copy">{messages.length} messages</span></div>
          <div className="chat-messages">{messages.slice(-30).map((item, index) => {
            const senderId = String(item.sender?._id || "");
            const canDeleteMessage = canModerate || senderId === user.id;
            const reactions = item.reactions || [];
            return <div className="chat-line" key={item._id || `${index}-${item.text}`}>
              <span className="chat-avatar">{item.sender?.name?.slice(0, 1) || "P"}</span>
              <div className="chat-line-content"><div className="chat-message-meta"><b>{item.sender?.name || "You"}</b>{item.pinned && <small className="pinned-label">PINNED</small>}</div><p>{item.text}</p>
                <div className="chat-message-actions">{["💜", "🔥", "👏"].map((emoji) => <button key={emoji} onClick={() => reactToMessage(item._id, emoji)} aria-label={`React ${emoji}`}>{emoji}<small>{reactions.filter((reaction) => reaction.emoji === emoji).length || ""}</small></button>)}{(isHost || isModerator) && <button onClick={() => togglePin(item)}>{item.pinned ? "Unpin" : "Pin"}</button>}{canDeleteMessage && <button onClick={async () => { try { await api.delete(`/messages/${item._id}`); setMessages((current) => current.filter((entry) => entry._id !== item._id)); } catch (err) { setError(getError(err)); } }}>Delete</button>}</div>
              </div>
            </div>;
          })}{!messages.length && <div className="chat-empty">The first hello is yours <span>✦</span></div>}</div>
          <form className="chat-compose" onSubmit={sendMessage}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something nice..." maxLength="1000" /><button aria-label="Send message" disabled={!message.trim()}><Send size={16} /></button></form>
        </section>
      </aside>
    </div>
  </div>;
}

function LibraryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const librarySlides = [
    { image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1800&q=85", eyebrow: "YOUR SOUNDTRACK, YOUR STORY", title: "Every mood has a playlist.", caption: "Keep the songs that feel like you, all in one place." },
    { image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1800&q=85", eyebrow: "MADE FOR THE MOMENTS", title: "Make room for the music.", caption: "Build a collection for late nights, long drives, and everything in between." },
    { image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85", eyebrow: "A LITTLE INSPIRATION", title: "Find your next favorite.", caption: "Revisit the tracks you love and let your next playlist take shape." }
  ];
  async function load() { try { const response = await api.get("/library"); setData(response.data); } catch (err) { setError(getError(err)); } }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSlideshowPlaying(false);
  }, []);
  useEffect(() => {
    if (!slideshowPlaying) return undefined;
    const timer = window.setInterval(() => setSlideIndex((index) => (index + 1) % librarySlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slideshowPlaying, librarySlides.length]);
  function moveSlide(direction) {
    setSlideIndex((index) => (index + direction + librarySlides.length) % librarySlides.length);
  }
  async function createPlaylist(event) {
    event.preventDefault();
    try { const { data: response } = await api.post("/playlists", { name }); setCreateOpen(false); setName(""); navigate(`/playlist/${response.playlist._id}`); }
    catch (err) { setError(getError(err)); }
  }
  const slide = librarySlides[slideIndex];
  const playlists = data?.playlists || [];
  const recentTracks = data?.recentlyPlayed?.map((item) => item.track) || [];
  return <div className="page-enter library-page">
    <section className="library-hero" aria-label="Library slideshow">
      <img key={slide.image} className="library-hero-image" src={slide.image} alt="" />
      <div className="library-hero-shade" />
      <div className="library-hero-copy">
        <span className="library-hero-eyebrow"><AudioLines size={14} /> {slide.eyebrow}</span>
        <h1>{slide.title}</h1>
        <p>{slide.caption}</p>
        <button className="button library-hero-button" onClick={() => setCreateOpen(true)}><Plus size={16} /> Create a playlist</button>
      </div>
      <div className="library-slide-controls" aria-label="Slideshow controls">
        <button className="library-slide-arrow" onClick={() => moveSlide(-1)} aria-label="Previous slide"><ArrowLeft size={16} /></button>
        <div className="library-slide-dots">{librarySlides.map((item, index) => <button key={item.title} className={`library-slide-dot ${index === slideIndex ? "active" : ""}`} onClick={() => setSlideIndex(index)} aria-label={`Show slide ${index + 1}`} aria-current={index === slideIndex ? "true" : undefined} />)}</div>
        <button className="library-slide-arrow" onClick={() => moveSlide(1)} aria-label="Next slide"><ArrowRight size={16} /></button>
        <button className="library-slide-arrow library-slide-toggle" onClick={() => setSlideshowPlaying((playing) => !playing)} aria-label={slideshowPlaying ? "Pause slideshow" : "Play slideshow"}>{slideshowPlaying ? <Pause size={14} /> : <Play size={14} />}</button>
      </div>
      <div className="library-hero-stat"><Library size={15} /><span><b>{playlists.length}</b> playlists</span><i /><span><b>{recentTracks.length}</b> recent tracks</span></div>
    </section>
    {error && <Notice>{error}</Notice>}
    <div className="library-page-heading"><div><span className="eyebrow section-eyebrow"><Library size={13} /> YOUR CORNER OF THE INTERNET</span><h2>Your collection</h2><p>All the songs and playlists you want to come back to.</p></div><button className="button button-primary" onClick={() => setCreateOpen(!createOpen)}><Plus size={16} /> New playlist</button></div>
    {createOpen && <form className="inline-create panel" onSubmit={createPlaylist}><input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" /><button className="button button-primary">Create playlist</button><button className="icon-button" type="button" onClick={() => setCreateOpen(false)} aria-label="Cancel"><X size={16} /></button></form>}
    <section className="section-block library-section">
      <div className="section-heading"><div><div className="eyebrow section-eyebrow"><Sparkles size={13} /> MADE BY YOU</div><h2>Your playlists</h2></div><span className="library-count">{playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}</span></div>
      {data ? playlists.length ? <div className="room-grid playlist-grid">{playlists.map((playlist, index) => {
        const cover = playlist.tracks?.[0]?.artwork || librarySlides[index % librarySlides.length].image;
        return <Link className="playlist-card" to={`/playlist/${playlist._id}`} key={playlist._id}>
          <div className="playlist-cover" style={{ backgroundImage: `linear-gradient(180deg, rgba(9, 8, 16, .04), rgba(9, 8, 16, .7)), url("${cover}")` }}>
            <span className="playlist-cover-icon"><Music2 size={22} /></span>
            <span className="playlist-track-count">{String(playlist.tracks?.length || 0).padStart(2, "0")} TRACKS</span>
            <span className="playlist-open"><ArrowRight size={17} /></span>
          </div>
          <b>{playlist.name}</b><small>{playlist.description || "Your own little soundtrack."}</small>
        </Link>;
      })}</div> : <Empty icon={Library} title="Your library, your rules." text="Save your first playlist and keep the good stuff close." action={<button className="button button-outline" onClick={() => setCreateOpen(true)}><Plus size={15} /> Make a playlist</button>} /> : <div className="panel empty-inline">Loading your playlists...</div>}
    </section>
    <section className="section-block library-section recently-played-section">
      <div className="section-heading"><div><div className="eyebrow section-eyebrow"><Activity size={13} /> RECENTLY IN YOUR HEADPHONES</div><h2>Recently played</h2></div><span className="library-count">{recentTracks.length} {recentTracks.length === 1 ? "track" : "tracks"}</span></div>
      {recentTracks.length ? <TrackTable tracks={recentTracks} /> : <div className="panel empty-inline">Your listening history will show up here as you go.</div>}
    </section>
  </div>;
}

function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get(`/playlists/${id}`).then(({ data }) => setPlaylist(data.playlist)).catch((err) => setError(getError(err))); }, [id]);
  async function remove() {
    try { await api.delete(`/playlists/${id}`); window.location.assign("/library"); }
    catch (err) { setError(getError(err)); }
  }
  if (error) return <Notice>{error}</Notice>;
  if (!playlist) return <div className="loading-row">Opening your playlist...</div>;
  return <div className="page-enter"><Link className="back-link" to="/library"><ArrowLeft size={15} /> Your library</Link><div className="playlist-detail-head"><div className="playlist-cover detail-cover"><Music2 size={38} /></div><div><div className="eyebrow section-eyebrow">YOUR PLAYLIST</div><h1>{playlist.name}</h1><p className="muted">{playlist.description || "A collection made by you."}</p><small>{playlist.tracks.length} tracks · {playlist.owner?.name}</small></div><button className="button button-outline button-small" onClick={remove}>Delete playlist</button></div><TrackTable tracks={playlist.tracks} /></div>;
}

function TrackTable({ tracks }) {
  return <div className="track-table">{tracks.map((track, index) => <div className="track-table-row" key={`${track.providerId}-${index}`}><span className="queue-index">{String(index + 1).padStart(2, "0")}</span><img src={mediaArt(track.artwork, index)} alt="" /><span><b>{track.title}</b><small>{track.artist}</small></span><span className="track-duration">{track.durationMs ? `${Math.floor(track.durationMs / 60000)}:${String(Math.floor(track.durationMs / 1000) % 60).padStart(2, "0")}` : "—"}</span><button className="icon-button" aria-label="Like track"><Heart size={16} /></button></div>)}</div>;
}

function AnalyticsPage() {
  const [listen, setListen] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.get("/analytics/me/listen-time"), api.get("/analytics/top-rooms"), api.get("/analytics/top-tracks")])
      .then(([time, topRooms, topTracks]) => { setListen(time.data); setRooms(topRooms.data); setTracks(topTracks.data); })
      .catch((err) => setError(getError(err)));
  }, []);
  return <div className="page-enter visual-dashboard-page stats-page">
    <PageSlideshow className="stats-slideshow" slides={statsSlides} icon={Activity} stats={`${listen?.sessions || 0} listening moments · ${rooms.length} live rooms · ${tracks.length} top tracks`} />
    {error && <Notice>{error}</Notice>}
    <div className="stats-grid">
      <StatCard icon={Headphones} label="Listening time" value={listen ? `${Math.floor(listen.totalSeconds / 3600)}h ${Math.floor(listen.totalSeconds % 3600 / 60)}m` : "—"} detail={`${listen?.sessions || 0} listening moments`} />
      <StatCard icon={Radio} label="Live rooms" value={rooms.length || "—"} detail="Rooms with people in them" />
      <StatCard icon={Music2} label="Top tracks" value={tracks.length || "—"} detail="Tracks listened to by the community" />
    </div>
    <div className="analytics-columns">
      <section className="panel analytics-panel"><div className="panel-heading"><div><div className="eyebrow section-eyebrow"><Radio size={13} /> THE COMMUNITY</div><h2>Rooms on the rise</h2></div></div>{rooms.length ? rooms.slice(0, 5).map((room, i) => <div className="rank-row" key={room._id}><span className="rank-num">0{i + 1}</span><div><b>{room.name}</b><small>by {room.host?.name || "a host"}</small></div><span className="rank-listeners"><Users size={13} /> {room.listenerCount}</span></div>) : <p className="muted">Room stats will appear as people listen.</p>}</section>
      <section className="panel analytics-panel"><div className="panel-heading"><div><div className="eyebrow section-eyebrow"><Music2 size={13} /> COMMUNITY FAVORITES</div><h2>Tracks in rotation</h2></div></div>{tracks.length ? tracks.slice(0, 5).map((entry, i) => <div className="rank-row" key={entry._id}><span className="rank-num">0{i + 1}</span><img className="rank-art" src={mediaArt(entry.track.artwork, i)} alt="" /><div><b>{entry.track.title}</b><small>{entry.track.artist}</small></div><span className="rank-listeners">{entry.plays} plays</span></div>) : <p className="muted">Listening stats are warming up.</p>}</section>
    </div>
  </div>;
}

function CreatorPage() {
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => { Promise.all([api.get("/creator/earnings"), api.get("/creator/tips/history")]).then(([summary, tips]) => { setEarnings(summary.data); setHistory(tips.data.tips); }).catch((err) => setError(getError(err))); }, []);
  async function payout() {
    try { const { data } = await api.post("/creator/payout", { amount: Math.floor(Number(earnings?.total || 0)) }); setToast(data.message); }
    catch (err) { setError(getError(err)); }
  }
  return <div className="page-enter visual-dashboard-page creator-page">
    <PageSlideshow
      className="creator-slideshow"
      slides={creatorSlides}
      icon={Wallet}
      stats={`${earnings?.tips || 0} tips received · $${Number(earnings?.total || 0).toFixed(2)} recorded`}
      action={<button className="button visual-hero-button" onClick={payout}><Wallet size={16} /> Request payout</button>}
    />
    {error && <Notice>{error}</Notice>}
    {toast && <Notice>{toast}</Notice>}
    <div className="earnings-card"><div className="earnings-orb"><Wallet size={22} /></div><div className="eyebrow">YOUR RECORDED TIPS</div><div className="earnings-amount">${Number(earnings?.total || 0).toFixed(2)} <span>USD</span></div><div className="earnings-footer"><span>{earnings?.tips || 0} tips received</span><span className="payout-status"><span className="live-dot" /> Payouts need payment-provider setup</span></div></div>
    <section className="section-block creator-tip-section"><div className="section-heading"><div><div className="eyebrow section-eyebrow"><Heart size={13} /> SOME LOVE CAME THROUGH</div><h2>Tip history</h2></div><span className="library-count">{history.length} {history.length === 1 ? "tip" : "tips"}</span></div>{history.length ? history.map((tip, index) => <div className="tip-row panel" style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }} key={tip._id}><span className="tip-heart"><Heart size={16} /></span><span><b>{tip.sender?.name || "Listener"}</b><small>{tip.room?.name || "Live room"} · {new Date(tip.createdAt).toLocaleDateString()}</small></span><strong>${Number(tip.amount).toFixed(2)}</strong></div>) : <Empty icon={Heart} title="Your first tip is still out there." text="Make a room worth staying in. The good energy follows." />}</section>
  </div>;
}

function PageSlideshow({ className, slides, icon: Icon, stats, action }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [playing, setPlaying] = useState(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const slide = slides[slideIndex];
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setSlideIndex((index) => (index + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);
  function moveSlide(direction) {
    setSlideIndex((index) => (index + direction + slides.length) % slides.length);
  }
  return <section className={`visual-slideshow ${className}`} aria-label="Page slideshow">
    <img key={slide.image} className="visual-slideshow-image" src={slide.image} alt="" />
    <div className="visual-slideshow-shade" />
    <div className="visual-slideshow-copy" key={slide.title}>
      <span className="visual-slideshow-eyebrow"><Icon size={15} /> {slide.label}</span>
      <h1>{slide.title}</h1>
      <p>{slide.description}</p>
      {action}
    </div>
    <div className="visual-slideshow-footer"><span className="visual-slideshow-stat"><Icon size={15} /> {stats}</span>
      <div className="visual-slideshow-controls">
        <button onClick={() => moveSlide(-1)} aria-label="Previous slide"><ArrowLeft size={15} /></button>
        <div className="visual-slideshow-dots">{slides.map((item, index) => <button key={item.title} className={index === slideIndex ? "active" : ""} onClick={() => setSlideIndex(index)} aria-label={`Show slide ${index + 1}`} aria-current={index === slideIndex ? "true" : undefined} />)}</div>
        <button onClick={() => moveSlide(1)} aria-label="Next slide"><ArrowRight size={15} /></button>
        <button onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause slideshow" : "Play slideshow"}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
      </div>
    </div>
  </section>;
}

function AdminPage() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  async function load() {
    try {
      const [statsRes, reportRes, userRes] = await Promise.all([api.get("/admin/stats"), api.get("/admin/reports"), api.get("/admin/users")]);
      setStats(statsRes.data); setReports(reportRes.data.reports); setUsers(userRes.data.users);
    } catch (err) { setError(getError(err)); }
  }
  useEffect(() => { load(); }, []);
  async function resolve(report, status) {
    try { await api.put(`/admin/reports/${report._id}`, { status, resolution: status === "resolved" ? "Reviewed by an administrator" : "Dismissed after review" }); load(); }
    catch (err) { setError(getError(err)); }
  }
  async function setUserStatus(user, status) {
    try { await api.put(`/admin/users/${user._id}/status`, { status }); load(); }
    catch (err) { setError(getError(err)); }
  }
  return <div className="page-enter"><PageHeading eyebrow="THE BIG PICTURE" title="Admin dashboard." subtitle="A pulse check on the community." />{error && <Notice>{error}</Notice>}<div className="stats-grid">{[["People", stats?.users, UserRound], ["Live rooms", stats?.liveRooms, Radio], ["Open reports", stats?.openReports, Shield], ["Tips recorded", `$${stats?.tipsRecorded || 0}`, Wallet]].map(([label, value, Icon]) => <StatCard key={label} icon={Icon} label={label} value={value ?? "—"} detail="Across PulseRoom" />)}</div><div className="analytics-columns"><section className="panel analytics-panel"><div className="panel-heading"><div><div className="eyebrow section-eyebrow"><Shield size={13} /> COMMUNITY CARE</div><h2>Open reports</h2></div></div>{reports.length ? reports.map((report) => <div className="admin-row" key={report._id}><div><b>{report.reason}</b><small>Reported by {report.reporter?.name || "listener"}</small></div><button className="button button-outline button-small" onClick={() => resolve(report, "resolved")}>Resolve</button><button className="icon-button" onClick={() => resolve(report, "dismissed")} aria-label="Dismiss report"><X size={15} /></button></div>) : <p className="muted">No open reports. The room is feeling good.</p>}</section><section className="panel analytics-panel"><div className="panel-heading"><div><div className="eyebrow section-eyebrow"><Users size={13} /> LISTENER ROSTER</div><h2>People</h2></div></div>{users.slice(0, 8).map((member) => <div className="admin-row" key={member._id}><div><b>{member.name}</b><small>{member.email} · {member.role}</small></div><button className="button button-outline button-small" onClick={() => setUserStatus(member, member.status === "active" ? "suspended" : "active")}>{member.status === "active" ? "Suspend" : "Activate"}</button></div>)}</section></div></div>;
}

function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div><div className="eyebrow section-eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</div>; }
function StatCard({ icon: Icon, label, value, detail }) { return <div className="panel stat-card"><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function Notice({ children }) { return <div className="notice"><CircleHelp size={16} /> {children}</div>; }
function Empty({ icon: Icon, title, text, action }) { return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p>{action}</div>; }

export default App;

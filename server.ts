import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { COSMETICS } from './src/game/progression';
import {
  getCoalCartMaxHp,
  groundHeightAt,
  isArmoredCoalCart,
  rollSpecialTrainKind,
  STAGES,
} from './src/game/stages';
import {
  AbilityId,
  AuthUser,
  BackCosmeticId,
  EquippedCosmetics,
  HeadCosmeticId,
  LeaderboardEntry,
  NetCoinSpawn,
  NetPlayerKinematics,
  NetTrackSpawn,
  OnlineRoomState,
  OnlineRoomSummary,
  SpeedRank,
  TrainBehavior,
} from './src/game/types';

// Ensure Vite HMR is disabled in Cloud Run / middleware proxy mode to avoid failed WS port 24678 handshakes
process.env.DISABLE_HMR = 'true';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const LEADERBOARD_FILE = path.resolve(DATA_DIR, 'leaderboard.json');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'sessions.json');

if (
  !LEADERBOARD_FILE.startsWith(DATA_DIR + path.sep) ||
  !USERS_FILE.startsWith(DATA_DIR + path.sep) ||
  !SESSIONS_FILE.startsWith(DATA_DIR + path.sep)
) {
  throw new Error('Invalid data storage path configuration');
}

const SESSION_COOKIE_NAME = 'trilhos_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

const VALID_ABILITIES: AbilityId[] = [
  'dash_basic',
  'double_jump',
  'iron_shield',
  'seismic_smash',
  'coal_beacon',
  'time_stop',
  'slide_boost',
];
const VALID_RANKS: SpeedRank[] = ['D', 'C', 'B', 'A', 'S', 'S+'];
const VALID_COSMETIC_IDS = new Set(COSMETICS.map((c) => c.id));

interface StoredUser extends AuthUser {
  nicknameLower: string;
  passwordHash: string;
  createdAt: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

function ensureDataFiles(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(LEADERBOARD_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, '[]', 'utf8');
  }
}

function readSessions(): StoredSession[] {
  try {
    ensureDataFiles();
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (s): s is StoredSession =>
        Boolean(s && typeof s.tokenHash === 'string' && typeof s.userId === 'string' && s.expiresAt > now)
    );
  } catch {
    return [];
  }
}

function atomicWriteFile(filePath: string, content: string): void {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function writeSessions(sessions: StoredSession[]): void {
  ensureDataFiles();
  atomicWriteFile(SESSIONS_FILE, JSON.stringify(sessions.slice(-500), null, 2));
}

function readUsers(): StoredUser[] {
  try {
    ensureDataFiles();
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  ensureDataFiles();
  atomicWriteFile(USERS_FILE, JSON.stringify(users, null, 2));
}

function toPublicUser(u: StoredUser): AuthUser {
  return {
    userId: u.userId,
    nickname: u.nickname,
    displayName: u.displayName,
    coins: u.coins,
    unlockedAbilities: u.unlockedAbilities,
    equippedAbility: u.equippedAbility,
    unlockedCosmetics: u.unlockedCosmetics,
    equippedCosmetics: u.equippedCosmetics,
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function createPersistentSession(userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const sessions = readSessions();
  sessions.push({
    tokenHash: hashSessionToken(rawToken),
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  writeSessions(sessions);
  return rawToken;
}

function revokePersistentSession(rawToken: string | undefined): void {
  if (!rawToken) return;
  const targetHash = hashSessionToken(rawToken);
  const next = readSessions().filter((s) => s.tokenHash !== targetHash);
  writeSessions(next);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function extractSessionToken(req: { headers: { authorization?: string; cookie?: string } }): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

function verifySessionToken(rawToken: string | undefined): { uid: string } | null {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const clean = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
  if (clean.length < 16) return null;
  const tokenHash = hashSessionToken(clean);
  const sessions = readSessions();
  const match = sessions.find((s) => s.tokenHash === tokenHash);
  if (!match) return null;
  return { uid: match.userId };
}

function isHttpsRequest(req: express.Request): boolean {
  const xfProto = req.headers['x-forwarded-proto'];
  if (typeof xfProto === 'string' && xfProto.split(',')[0].trim() === 'https') return true;
  return Boolean(req.secure);
}

function setSessionCookie(req: express.Request, res: express.Response, rawToken: string): void {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const encoded = encodeURIComponent(rawToken);
  if (isHttpsRequest(req)) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
    );
  }
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  if (isHttpsRequest(req)) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
  }
}

function isTrustedMutationRequest(req: express.Request): boolean {
  const xrw = req.headers['x-requested-with'];
  if (xrw === 'TrilhosClient') return true;
  const origin = req.headers.origin;
  const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  if (origin && expectedHost) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }
  return false;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Monday 00:00 BRT (UTC-3) reference epoch: 2024-01-01T03:00:00.000Z
const WEEK_EPOCH_MS = Date.UTC(2024, 0, 1, 3, 0, 0, 0);

function getCurrentWeekWindow(nowMs = Date.now()): {
  weekKey: string;
  weekStartsAt: string;
  weekEndsAt: string;
  nextResetInMs: number;
} {
  const weekIndex = Math.max(0, Math.floor((nowMs - WEEK_EPOCH_MS) / WEEK_MS));
  const startMs = WEEK_EPOCH_MS + weekIndex * WEEK_MS;
  const endMs = startMs + WEEK_MS;
  return {
    weekKey: `semana-${weekIndex}`,
    weekStartsAt: new Date(startMs).toISOString(),
    weekEndsAt: new Date(endMs).toISOString(),
    nextResetInMs: Math.max(0, endMs - nowMs),
  };
}

function writeLeaderboard(entries: LeaderboardEntry[]): void {
  ensureDataFiles();
  atomicWriteFile(LEADERBOARD_FILE, JSON.stringify(entries.slice(0, 500), null, 2));
}

function readLeaderboard(): LeaderboardEntry[] {
  try {
    ensureDataFiles();
    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const { weekKey } = getCurrentWeekWindow();
    const currentEntries = (parsed as LeaderboardEntry[]).filter(
      (e) => e && typeof e.elapsedSeconds === 'number' && e.weekKey === weekKey
    );
    if (currentEntries.length !== parsed.length) {
      writeLeaderboard(currentEntries);
    }
    currentEntries.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || b.avgSpeedKmh - a.avgSpeedKmh);
    return currentEntries;
  } catch {
    return [];
  }
}

function sanitizeText(val: unknown, fallback: string, maxLen = 24): string {
  if (typeof val !== 'string') return fallback;
  const cleaned = val.replace(/[<>]/g, '').trim();
  return cleaned.length >= 2 ? cleaned.slice(0, maxLen) : fallback;
}

function sanitizeCosmetics(val: unknown): EquippedCosmetics {
  const c = (val && typeof val === 'object' ? val : {}) as Partial<EquippedCosmetics>;
  const head: HeadCosmeticId =
    typeof c.head === 'string' && (c.head === 'none' || VALID_COSMETIC_IDS.has(c.head as HeadCosmeticId))
      ? (c.head as HeadCosmeticId)
      : 'none';
  const back: BackCosmeticId =
    typeof c.back === 'string' && (c.back === 'none' || VALID_COSMETIC_IDS.has(c.back as BackCosmeticId))
      ? (c.back as BackCosmeticId)
      : 'none';
  return { head, back };
}

function sanitizeAbility(val: unknown): AbilityId {
  return VALID_ABILITIES.includes(val as AbilityId) ? (val as AbilityId) : 'dash_basic';
}

function recordLeaderboardEntry(
  entry: Omit<LeaderboardEntry, 'id' | 'createdAt' | 'weekKey'>
): LeaderboardEntry {
  const { weekKey } = getCurrentWeekWindow();
  const list = readLeaderboard();
  const normalizedElapsed = Math.max(4, Math.round(entry.elapsedSeconds * 10) / 10);

  const playerKey = entry.userId
    ? `uid:${entry.userId}`
    : `name:${entry.playerName.trim().toLowerCase()}`;

  const existingIdx = list.findIndex((item) => {
    const itemKey = item.userId
      ? `uid:${item.userId}`
      : `name:${item.playerName.trim().toLowerCase()}`;
    return itemKey === playerKey && item.stageId === entry.stageId && item.mode === entry.mode;
  });

  const candidate: LeaderboardEntry = {
    ...entry,
    elapsedSeconds: normalizedElapsed,
    weekKey,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  let kept = candidate;
  if (existingIdx !== -1) {
    const prev = list[existingIdx];
    const isFaster =
      candidate.elapsedSeconds < prev.elapsedSeconds ||
      (candidate.elapsedSeconds === prev.elapsedSeconds &&
        candidate.avgSpeedKmh > prev.avgSpeedKmh);
    if (isFaster) {
      list[existingIdx] = candidate;
    } else {
      kept = prev;
    }
  } else {
    list.push(candidate);
  }

  list.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || b.avgSpeedKmh - a.avgSpeedKmh);
  writeLeaderboard(list.slice(0, 500));
  return kept;
}

interface ServerPlayer {
  playerId: string;
  ws: WebSocket;
  isAlivePing: boolean;
  slot: number;
  name: string;
  ready: boolean;
  alive: boolean;
  cosmetics: EquippedCosmetics;
  abilityId: AbilityId;
  kinematics: NetPlayerKinematics;
}

interface ServerRoom {
  roomId: string;
  name: string;
  stageIndex: number;
  status: 'LOBBY' | 'PLAYING';
  hostId: string;
  players: ServerPlayer[];
  coalHps: number[];
  coalMaxHp: number;
  coins: Map<number, NetCoinSpawn>;
  nextCoinId: number;
  nextTrackId: number;
  spawnTimer: number;
  timeStopUntil: number;
  matchStartMs: number;
  lastTickMs: number;
  climaxStarted: boolean;
  climaxEndMs: number;
}

const rooms = new Map<string, ServerRoom>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function toRoomSummary(r: ServerRoom): OnlineRoomSummary {
  const host = r.players.find((p) => p.playerId === r.hostId);
  return {
    roomId: r.roomId,
    name: r.name,
    stageIndex: r.stageIndex,
    status: r.status,
    playerCount: r.players.length,
    maxPlayers: 3,
    hostName: host?.name || 'Host',
  };
}

function toRoomState(r: ServerRoom): OnlineRoomState {
  return {
    roomId: r.roomId,
    name: r.name,
    stageIndex: r.stageIndex,
    status: r.status,
    hostId: r.hostId,
    players: r.players.map((p) => ({
      playerId: p.playerId,
      slot: p.slot,
      name: p.name,
      ready: p.ready,
      alive: p.alive,
      cosmetics: p.cosmetics,
      abilityId: p.abilityId,
    })),
  };
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(r: ServerRoom, payload: unknown): void {
  const raw = JSON.stringify(payload);
  for (const p of r.players) {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(raw);
    }
  }
}

function computeGroundYEstimate(x: number, z: number, stageIndex: number): number {
  const stage = STAGES[stageIndex] || STAGES[0];
  return groundHeightAt(x, z, stage);
}

function startRoomMatch(r: ServerRoom): void {
  const stage = STAGES[r.stageIndex] || STAGES[0];
  r.status = 'PLAYING';
  r.coalMaxHp = stage.isBoss ? 120 : 100;
  r.coalHps = Array.from({ length: stage.coalCount }, (_, idx) => getCoalCartMaxHp(stage, idx));
  r.coins.clear();
  r.nextCoinId = 1;
  r.nextTrackId = 1;
  r.spawnTimer = 1.9;
  r.timeStopUntil = 0;
  r.matchStartMs = Date.now();
  r.lastTickMs = Date.now();
  r.climaxStarted = false;
  r.climaxEndMs = 0;

  const startOffsets: [number, number][] = [
    [0, 0],
    [-3.2, -2.5],
    [3.2, -2.5],
  ];

  r.players.forEach((p, idx) => {
    p.slot = idx;
    p.alive = true;
    const [sx, sz] = startOffsets[idx % 3];
    const sy = computeGroundYEstimate(sx, sz, r.stageIndex);
    p.kinematics = {
      slot: idx,
      x: sx,
      y: sy,
      z: sz,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      armPhase: idx * 1.4,
      boostTimer: 0,
      attackTimer: 0,
      shieldActive: false,
      alive: true,
    };
  });

  const initialCoins: NetCoinSpawn[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const rad = 14 + (i % 3) * 10;
    const cx = Math.cos(a) * rad;
    const cz = Math.sin(a) * rad;
    const coin: NetCoinSpawn = {
      id: r.nextCoinId++,
      x: cx,
      y: computeGroundYEstimate(cx, cz, r.stageIndex) + 1.1,
      z: cz,
      value: 10,
    };
    r.coins.set(coin.id, coin);
    initialCoins.push(coin);
  }

  broadcastRoom(r, {
    type: 'MATCH_STARTED',
    room: toRoomState(r),
    coalHps: r.coalHps,
    coins: initialCoins,
  });
}

function checkAllPlayersDead(r: ServerRoom): void {
  if (r.status !== 'PLAYING' || r.climaxStarted) return;
  const anyAlive = r.players.some((p) => p.alive);
  if (!anyAlive) {
    r.status = 'LOBBY';
    for (const p of r.players) {
      p.ready = p.playerId === r.hostId;
      p.alive = true;
    }
    broadcastRoom(r, {
      type: 'MATCH_END',
      outcome: 'GAME_OVER',
      elapsedSeconds: Math.max(1, Math.round((Date.now() - r.matchStartMs) / 1000)),
      room: toRoomState(r),
    });
  }
}

setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (r.status !== 'PLAYING') continue;
    const dt = Math.min(0.25, Math.max(0.01, (now - r.lastTickMs) / 1000));
    r.lastTickMs = now;

    if (r.climaxStarted) {
      if (now >= r.climaxEndMs) {
        const elapsedRaw = Math.max(4, (now - r.matchStartMs) / 1000);
        const elapsedSec = Math.round(elapsedRaw * 10) / 10;
        const stage = STAGES[r.stageIndex] || STAGES[0];
        const squadNames = r.players.map((p) => p.name).join(', ').slice(0, 36);
        const avgSpeedKmh = Math.round(Math.min(95, Math.max(38, 1800 / Math.max(18, elapsedSec))));
        const rank: SpeedRank =
          avgSpeedKmh >= 75 ? 'S+' : avgSpeedKmh >= 64 ? 'S' : avgSpeedKmh >= 52 ? 'A' : 'B';

        recordLeaderboardEntry({
          playerName: squadNames || 'Esquadrão Online',
          stageId: stage.id,
          stageName: stage.name,
          elapsedSeconds: elapsedSec,
          avgSpeedKmh,
          peakSpeedKmh: avgSpeedKmh + 14,
          rank,
          mode: 'ONLINE',
        });

        r.status = 'LOBBY';
        for (const p of r.players) {
          p.ready = p.playerId === r.hostId;
          p.alive = true;
        }
        broadcastRoom(r, {
          type: 'MATCH_END',
          outcome: 'STAGE_CLEAR',
          elapsedSeconds: elapsedSec,
          rank,
          room: toRoomState(r),
        });
      }
      continue;
    }

    if (now < r.timeStopUntil) {
      continue;
    }

    const stage = STAGES[r.stageIndex] || STAGES[0];
    const destroyed = r.coalHps.filter((hp) => hp <= 0).length;
    const ratio = destroyed / Math.max(1, r.coalHps.length - 1);
    const spawnInterval = Math.max(
      stage.minSpawnInterval,
      stage.baseSpawnInterval - ratio * (stage.baseSpawnInterval - stage.minSpawnInterval)
    );
    const telegraphDelay = Math.max(
      stage.minDelay,
      stage.baseDelay - ratio * (stage.baseDelay - stage.minDelay)
    );
    const trainSpeed = stage.baseTrainSpeed + ratio * 22;

    r.spawnTimer -= dt;
    if (r.spawnTimer <= 0) {
      r.spawnTimer = spawnInterval;
      const alivePlayers = r.players.filter((p) => p.alive);
      if (alivePlayers.length === 0) continue;

      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const k = target.kinematics;
      const spd = Math.hypot(k.vx, k.vz);
      const moveAngle = spd > 1.2 ? Math.atan2(k.vx, k.vz) : k.yaw;
      const lookAhead = spd > 1.2 ? 9 + Math.random() * 10 : 3 + Math.random() * 6;
      const ax = Math.max(-48, Math.min(48, k.x + Math.sin(moveAngle) * lookAhead + (Math.random() - 0.5) * 6));
      const az = Math.max(-48, Math.min(48, k.z + Math.cos(moveAngle) * lookAhead + (Math.random() - 0.5) * 6));
      const cutAngle =
        moveAngle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 1.1;

      const behaviors = stage.trainBehaviors;
      const behavior: TrainBehavior = behaviors[Math.floor(Math.random() * behaviors.length)] || 'straight';
      const curvature =
        behavior === 'curving'
          ? (Math.random() > 0.5 ? 1 : -1) * (stage.curveStrength || 0.015) * (0.85 + Math.random() * 0.35)
          : 0;

      const makeRedShift = () =>
        stage.isBoss && Math.random() < 0.44
          ? {
              isRedShift: true,
              shiftPivotS: -8 + Math.random() * 16,
              shiftDeltaYaw: (Math.random() > 0.5 ? 1 : -1) * (0.58 + Math.random() * 0.58),
            }
          : {};

      const coalDestroyedRatio = destroyed / Math.max(1, r.coalHps.length);

      const tracksToSpawn: NetTrackSpawn[] = [
        {
          id: r.nextTrackId++,
          anchorX: ax,
          anchorZ: az,
          angle: cutAngle,
          curvature,
          behavior,
          telegraphDelay,
          trainSpeed,
          isDying: false,
          specialKind: rollSpecialTrainKind(stage, coalDestroyedRatio),
          ...makeRedShift(),
        },
      ];

      const crossThreshold = stage.isBoss ? 2 : 4;
      if (destroyed >= crossThreshold && Math.random() < (stage.isBoss ? 0.45 : 0.3)) {
        tracksToSpawn.push({
          id: r.nextTrackId++,
          anchorX: ax,
          anchorZ: az,
          angle: cutAngle + Math.PI * 0.48,
          curvature: -curvature,
          behavior: behaviors.includes('curving') ? 'curving' : 'straight',
          telegraphDelay: telegraphDelay + 0.38,
          trainSpeed,
          isDying: false,
          specialKind: rollSpecialTrainKind(stage, coalDestroyedRatio),
          ...makeRedShift(),
        });
      }

      broadcastRoom(r, { type: 'TRACK_SPAWN', tracks: tracksToSpawn });
    }
  }
}, 100);

async function bootstrap() {
  ensureDataFiles();
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // --- AUTHENTICATION ROUTES ---
  app.post('/api/auth/register', (req, res) => {
    const body = req.body as { nickname?: unknown; displayName?: unknown; password?: unknown };
    const rawNick = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const rawDisplay = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const rawPass = typeof body.password === 'string' ? body.password : '';

    if (!/^[a-zA-Z0-9_.-]{3,18}$/.test(rawNick)) {
      res.status(400).json({
        error: 'Nickname único deve ter 3 a 18 caracteres (apenas letras, números, _, . ou -).',
      });
      return;
    }
    if (rawDisplay.replace(/[<>]/g, '').length < 2 || rawDisplay.length > 24) {
      res.status(400).json({ error: 'Nome de exibição deve ter entre 2 e 24 caracteres.' });
      return;
    }
    if (rawPass.length < 4 || rawPass.length > 72) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
      return;
    }

    const users = readUsers();
    const nicknameLower = rawNick.toLowerCase();
    if (users.some((u) => u.nicknameLower === nicknameLower)) {
      res.status(409).json({ error: 'Esse nickname único já está em uso.' });
      return;
    }

    const newUser: StoredUser = {
      userId: `usr_${crypto.randomUUID()}`,
      nickname: rawNick,
      nicknameLower,
      displayName: sanitizeText(rawDisplay, rawNick, 24),
      passwordHash: hashPassword(rawPass),
      coins: 0,
      unlockedAbilities: ['dash_basic'],
      equippedAbility: 'dash_basic',
      unlockedCosmetics: [],
      equippedCosmetics: { head: 'none', back: 'none' },
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    writeUsers(users);

    const token = createPersistentSession(newUser.userId);
    setSessionCookie(req, res, token);
    res.status(201).json({ user: toPublicUser(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = req.body as { nickname?: unknown; password?: unknown };
    const rawNick = typeof body.nickname === 'string' ? body.nickname.trim().toLowerCase() : '';
    const rawPass = typeof body.password === 'string' ? body.password : '';

    if (!rawNick || !rawPass) {
      res.status(400).json({ error: 'Informe nickname e senha.' });
      return;
    }

    const users = readUsers();
    const user = users.find((u) => u.nicknameLower === rawNick);
    if (!user || !verifyPassword(rawPass, user.passwordHash)) {
      res.status(401).json({ error: 'Nickname ou senha inválidos.' });
      return;
    }

    const token = createPersistentSession(user.userId);
    setSessionCookie(req, res, token);
    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (!isTrustedMutationRequest(req)) {
      res.status(403).json({ error: 'Origem não autorizada.' });
      return;
    }
    const token = extractSessionToken(req);
    revokePersistentSession(token);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const claims = verifySessionToken(extractSessionToken(req));
    if (!claims) {
      res.status(401).json({ error: 'Sessão inválida ou expirada.' });
      return;
    }
    const users = readUsers();
    const user = users.find((u) => u.userId === claims.uid);
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  });

  app.put('/api/auth/profile', (req, res) => {
    if (!isTrustedMutationRequest(req)) {
      res.status(403).json({ error: 'Origem não autorizada.' });
      return;
    }
    const claims = verifySessionToken(extractSessionToken(req));
    if (!claims) {
      res.status(401).json({ error: 'Sessão inválida.' });
      return;
    }
    const users = readUsers();
    const idx = users.findIndex((u) => u.userId === claims.uid);
    if (idx === -1) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const body = req.body as Partial<AuthUser>;
    const user = users[idx];

    if (typeof body.displayName === 'string') {
      user.displayName = sanitizeText(body.displayName, user.displayName, 24);
    }
    if (typeof body.coins === 'number' && Number.isFinite(body.coins) && body.coins >= 0) {
      user.coins = Math.min(999999, Math.floor(body.coins));
    }
    if (Array.isArray(body.unlockedAbilities)) {
      user.unlockedAbilities = Array.from(
        new Set<AbilityId>([
          'dash_basic',
          ...body.unlockedAbilities.filter((a) => VALID_ABILITIES.includes(a as AbilityId)),
        ])
      );
    }
    if (body.equippedAbility && user.unlockedAbilities.includes(body.equippedAbility)) {
      user.equippedAbility = body.equippedAbility;
    }
    if (Array.isArray(body.unlockedCosmetics)) {
      user.unlockedCosmetics = Array.from(
        new Set(body.unlockedCosmetics.filter((id) => VALID_COSMETIC_IDS.has(id as HeadCosmeticId)))
      );
    }
    if (body.equippedCosmetics) {
      user.equippedCosmetics = sanitizeCosmetics(body.equippedCosmetics);
    }

    users[idx] = user;
    writeUsers(users);
    res.json({ user: toPublicUser(user) });
  });

  // --- ROOMS & LEADERBOARD ROUTES ---
  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map(toRoomSummary);
    res.json({ rooms: list });
  });

  app.get('/api/leaderboard', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const stageId = req.query.stageId ? Number(req.query.stageId) : null;
    const all = readLeaderboard();
    const filtered =
      stageId && Number.isFinite(stageId) ? all.filter((e) => e.stageId === stageId) : all;
    const windowInfo = getCurrentWeekWindow();
    res.json({
      entries: filtered.slice(0, 50),
      ...windowInfo,
    });
  });

  app.post('/api/leaderboard', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const body = req.body as Partial<LeaderboardEntry>;
    const stageId = Number(body.stageId);
    const stage = STAGES.find((s) => s.id === stageId);
    if (!stage) {
      res.status(400).json({ error: 'Fase inválida.' });
      return;
    }
    const elapsedSeconds = Number(body.elapsedSeconds);
    const avgSpeedKmh = Number(body.avgSpeedKmh);
    const peakSpeedKmh = Number(body.peakSpeedKmh);
    if (
      !Number.isFinite(elapsedSeconds) ||
      elapsedSeconds < 4 ||
      elapsedSeconds > 3600 ||
      !Number.isFinite(avgSpeedKmh) ||
      avgSpeedKmh < 0 ||
      avgSpeedKmh > 250
    ) {
      res.status(400).json({ error: 'Tempo ou velocidade inválidos.' });
      return;
    }

    const rank: SpeedRank = VALID_RANKS.includes(body.rank as SpeedRank)
      ? (body.rank as SpeedRank)
      : 'B';
    const mode = body.mode === 'ONLINE' ? 'ONLINE' : 'SOLO';

    const claims = verifySessionToken(extractSessionToken(req));
    const authUser = claims ? readUsers().find((u) => u.userId === claims.uid) : undefined;
    const playerName = authUser
      ? authUser.displayName
      : sanitizeText(body.playerName, 'Macaco Anônimo', 24);

    const saved = recordLeaderboardEntry({
      userId: authUser?.userId,
      playerName,
      playerNickname: authUser?.nickname,
      stageId: stage.id,
      stageName: stage.name,
      elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
      avgSpeedKmh: Math.round(avgSpeedKmh),
      peakSpeedKmh: Math.round(Number.isFinite(peakSpeedKmh) ? Math.min(280, peakSpeedKmh) : avgSpeedKmh),
      rank,
      mode,
    });
    res.status(201).json({ entry: saved });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // 15s heartbeat to keep WebSocket alive behind reverse proxies
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 15000);

  wss.on('close', () => clearInterval(pingInterval));

  wss.on('connection', (ws, req) => {
    const playerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const cookieToken = extractSessionToken(req);
    let currentRoomId: string | null = null;

    sendJson(ws, { type: 'WELCOME', playerId });

    const leaveCurrentRoom = () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      currentRoomId = null;
      if (!room) return;

      const idx = room.players.findIndex((p) => p.playerId === playerId);
      if (idx !== -1) {
        room.players.splice(idx, 1);
      }
      if (room.players.length === 0) {
        rooms.delete(room.roomId);
        return;
      }
      if (room.hostId === playerId) {
        room.hostId = room.players[0].playerId;
        room.players[0].ready = true;
      }
      if (room.status === 'LOBBY') {
        room.players.forEach((p, i) => {
          p.slot = i;
          p.kinematics.slot = i;
        });
      }
      broadcastRoom(room, { type: 'ROOM_STATE', room: toRoomState(room) });
      if (room.status === 'PLAYING') {
        checkAllPlayersDead(room);
      }
    };

    const resolvePlayerDisplayName = (msg: Record<string, unknown>, fallback: string): string => {
      const tokenToVerify = typeof msg.token === 'string' && msg.token ? msg.token : cookieToken;
      if (tokenToVerify) {
        const claims = verifySessionToken(tokenToVerify);
        if (claims) {
          const u = readUsers().find((usr) => usr.userId === claims.uid);
          if (u) return `${u.displayName} (@${u.nickname})`.slice(0, 24);
        }
      }
      return sanitizeText(msg.playerName, fallback, 24);
    };

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString('utf8'));
      } catch {
        return;
      }

      const type = msg.type;
      if (type === 'PING') {
        sendJson(ws, { type: 'PONG' });
        return;
      }

      if (type === 'CREATE_ROOM') {
        leaveCurrentRoom();
        if (rooms.size >= 40) {
          sendJson(ws, { type: 'ERROR', message: 'Servidor cheio. Tente entrar em uma sala existente.' });
          return;
        }
        const roomId = generateRoomId();
        const playerName = resolvePlayerDisplayName(msg, 'Macaco-1');
        const roomName = sanitizeText(msg.roomName, `Sala de ${playerName}`, 24);
        const stageIndex = Math.max(0, Math.min(STAGES.length - 1, Number(msg.stageIndex) || 0));
        const cosmetics = sanitizeCosmetics(msg.cosmetics);
        const abilityId = sanitizeAbility(msg.abilityId);

        const room: ServerRoom = {
          roomId,
          name: roomName,
          stageIndex,
          status: 'LOBBY',
          hostId: playerId,
          players: [
            {
              playerId,
              ws,
              isAlivePing: true,
              slot: 0,
              name: playerName,
              ready: true,
              alive: true,
              cosmetics,
              abilityId,
              kinematics: {
                slot: 0,
                x: 0,
                y: 0,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: 0,
                armPhase: 0,
                boostTimer: 0,
                attackTimer: 0,
                shieldActive: false,
                alive: true,
              },
            },
          ],
          coalHps: [],
          coalMaxHp: 100,
          coins: new Map(),
          nextCoinId: 1,
          nextTrackId: 1,
          spawnTimer: 2,
          timeStopUntil: 0,
          matchStartMs: 0,
          lastTickMs: 0,
          climaxStarted: false,
          climaxEndMs: 0,
        };
        rooms.set(roomId, room);
        currentRoomId = roomId;
        sendJson(ws, { type: 'ROOM_JOINED', room: toRoomState(room), yourSlot: 0, playerId });
        return;
      }

      if (type === 'JOIN_ROOM') {
        const roomId = sanitizeText(msg.roomId, '', 10).toUpperCase();
        const room = rooms.get(roomId);
        if (!room) {
          sendJson(ws, { type: 'ERROR', message: 'Sala não encontrada.' });
          return;
        }
        if (room.status !== 'LOBBY') {
          sendJson(ws, { type: 'ERROR', message: 'A partida desta sala já começou.' });
          return;
        }
        if (room.players.length >= 3) {
          sendJson(ws, { type: 'ERROR', message: 'Sala lotada (máximo 3 macacos).' });
          return;
        }

        leaveCurrentRoom();
        const slot = room.players.length;
        const playerName = resolvePlayerDisplayName(msg, `Macaco-${slot + 1}`);
        const cosmetics = sanitizeCosmetics(msg.cosmetics);
        const abilityId = sanitizeAbility(msg.abilityId);

        room.players.push({
          playerId,
          ws,
          isAlivePing: true,
          slot,
          name: playerName,
          ready: false,
          alive: true,
          cosmetics,
          abilityId,
          kinematics: {
            slot,
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            yaw: 0,
            armPhase: 0,
            boostTimer: 0,
            attackTimer: 0,
            shieldActive: false,
            alive: true,
          },
        });
        currentRoomId = roomId;
        sendJson(ws, { type: 'ROOM_JOINED', room: toRoomState(room), yourSlot: slot, playerId });
        broadcastRoom(room, { type: 'ROOM_STATE', room: toRoomState(room) });
        return;
      }

      if (type === 'LEAVE_ROOM') {
        leaveCurrentRoom();
        sendJson(ws, { type: 'ROOM_LEFT' });
        return;
      }

      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.playerId === playerId);
      if (!player) return;

      if (type === 'UPDATE_LOADOUT') {
        player.cosmetics = sanitizeCosmetics(msg.cosmetics);
        player.abilityId = sanitizeAbility(msg.abilityId);
        player.name = resolvePlayerDisplayName(msg, player.name);
        broadcastRoom(room, { type: 'ROOM_STATE', room: toRoomState(room) });
        return;
      }

      if (type === 'SET_STAGE' && room.hostId === playerId && room.status === 'LOBBY') {
        room.stageIndex = Math.max(0, Math.min(STAGES.length - 1, Number(msg.stageIndex) || 0));
        broadcastRoom(room, { type: 'ROOM_STATE', room: toRoomState(room) });
        return;
      }

      if (type === 'TOGGLE_READY' && room.status === 'LOBBY') {
        player.ready = !player.ready;
        broadcastRoom(room, { type: 'ROOM_STATE', room: toRoomState(room) });
        return;
      }

      if (type === 'START_MATCH' && room.hostId === playerId && room.status === 'LOBBY') {
        startRoomMatch(room);
        return;
      }

      if (room.status !== 'PLAYING') return;

      if (type === 'PLAYER_STATE') {
        const k = msg.state as Partial<NetPlayerKinematics> | undefined;
        if (!k || !player.alive) return;
        player.kinematics = {
          slot: player.slot,
          x: Number(k.x) || 0,
          y: Number(k.y) || 0,
          z: Number(k.z) || 0,
          vx: Number(k.vx) || 0,
          vy: Number(k.vy) || 0,
          vz: Number(k.vz) || 0,
          yaw: Number(k.yaw) || 0,
          armPhase: Number(k.armPhase) || 0,
          boostTimer: Math.max(0, Number(k.boostTimer) || 0),
          slideTimer: Math.max(0, Number(k.slideTimer) || 0),
          attackTimer: Math.max(0, Number(k.attackTimer) || 0),
          shieldActive: Boolean(k.shieldActive),
          alive: player.alive,
        };
        const raw = JSON.stringify({
          type: 'PLAYER_KINEMATICS',
          player: player.kinematics,
        });
        for (const other of room.players) {
          if (other.playerId !== playerId && other.ws.readyState === WebSocket.OPEN) {
            other.ws.send(raw);
          }
        }
        return;
      }

      if (type === 'COAL_HIT') {
        const coalIdx = Number(msg.coalIndex);
        const rawDmg = Number(msg.damage);
        if (!Number.isInteger(coalIdx) || coalIdx < 0 || coalIdx >= room.coalHps.length) return;
        if (room.coalHps[coalIdx] <= 0 || room.climaxStarted) return;

        const dmg = Math.max(5, Math.min(75, Number.isFinite(rawDmg) ? rawDmg : 20));
        room.coalHps[coalIdx] = Math.max(0, room.coalHps[coalIdx] - dmg);
        const destroyedNow = room.coalHps[coalIdx] <= 0;

        const spawnedCoins: NetCoinSpawn[] = [];
        if (destroyedNow) {
          const stage = STAGES[room.stageIndex] || STAGES[0];
          const coinDrops = isArmoredCoalCart(stage, coalIdx) ? 4 : 3;
          const cx = Number(msg.x) || 0;
          const cz = Number(msg.z) || 0;
          for (let c = 0; c < coinDrops; c++) {
            const ang = (c / coinDrops) * Math.PI * 2 + Math.random();
            const px = cx + Math.cos(ang) * 3.4;
            const pz = cz + Math.sin(ang) * 3.4;
            const coin: NetCoinSpawn = {
              id: room.nextCoinId++,
              x: px,
              y: computeGroundYEstimate(px, pz, room.stageIndex) + 1.1,
              z: pz,
              value: 15,
            };
            room.coins.set(coin.id, coin);
            spawnedCoins.push(coin);
          }
        }

        broadcastRoom(room, {
          type: 'COAL_UPDATE',
          coalIndex: coalIdx,
          hp: room.coalHps[coalIdx],
          destroyed: destroyedNow,
          spawnedCoins,
        });

        if (room.coalHps.every((hp) => hp <= 0)) {
          room.climaxStarted = true;
          room.climaxEndMs = Date.now() + 3000;
          broadcastRoom(room, { type: 'CLIMAX_STOP' });
        }
        return;
      }

      if (type === 'COLLECT_COIN') {
        const coinId = Number(msg.coinId);
        const coin = room.coins.get(coinId);
        if (!coin) return;
        room.coins.delete(coinId);
        broadcastRoom(room, {
          type: 'COIN_COLLECTED',
          coinId,
          value: coin.value,
          collectorSlot: player.slot,
        });
        return;
      }

      if (type === 'USE_ABILITY') {
        const abilityId = sanitizeAbility(msg.abilityId);
        if (abilityId === 'time_stop') {
          room.timeStopUntil = Math.max(room.timeStopUntil, Date.now() + 3000);
          broadcastRoom(room, {
            type: 'TIME_STOP',
            durationMs: 3000,
            bySlot: player.slot,
          });
        } else {
          broadcastRoom(room, {
            type: 'ABILITY_FX',
            abilityId,
            bySlot: player.slot,
          });
        }
        return;
      }

      if (type === 'PLAYER_HIT') {
        if (!player.alive || room.climaxStarted) return;
        player.alive = false;
        player.kinematics.alive = false;
        broadcastRoom(room, {
          type: 'PLAYER_DEAD',
          slot: player.slot,
          playerId: player.playerId,
        });
        checkAllPlayersDead(room);
      }
    });

    ws.on('close', leaveCurrentRoom);
  });

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result?.code) return next();
        const patched = result.code.replace(
          /transport\.connect\(createHMRHandler\(handleMessage\)\);/g,
          '/* HMR disabled */'
        );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.send(patched);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Trilhos de Cinza server listening on http://localhost:${PORT}`);
  });
}

bootstrap();

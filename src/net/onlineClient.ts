import {
  AbilityId,
  AuthUser,
  EquippedCosmetics,
  LeaderboardEntry,
  LeaderboardResponse,
  NetCoinSpawn,
  NetPlayerKinematics,
  NetTrackSpawn,
  OnlineRoomState,
  OnlineRoomSummary,
  SpeedRank,
} from '../game/types';

export type ServerEvent =
  | { type: 'WELCOME'; playerId: string }
  | { type: 'PONG' }
  | { type: 'ERROR'; message: string }
  | { type: 'ROOM_JOINED'; room: OnlineRoomState; yourSlot: number; playerId: string }
  | { type: 'ROOM_STATE'; room: OnlineRoomState }
  | { type: 'ROOM_LEFT' }
  | { type: 'MATCH_STARTED'; room: OnlineRoomState; coalHps: number[]; coins: NetCoinSpawn[] }
  | { type: 'PLAYER_KINEMATICS'; player: NetPlayerKinematics }
  | { type: 'TRACK_SPAWN'; tracks: NetTrackSpawn[] }
  | {
      type: 'COAL_UPDATE';
      coalIndex: number;
      hp: number;
      destroyed: boolean;
      spawnedCoins: NetCoinSpawn[];
    }
  | { type: 'COIN_COLLECTED'; coinId: number; value: number; collectorSlot: number }
  | { type: 'TIME_STOP'; durationMs: number; bySlot: number }
  | { type: 'ABILITY_FX'; abilityId: AbilityId; bySlot: number }
  | { type: 'PLAYER_DEAD'; slot: number; playerId: string }
  | { type: 'CLIMAX_STOP' }
  | {
      type: 'MATCH_END';
      outcome: 'STAGE_CLEAR' | 'GAME_OVER';
      elapsedSeconds: number;
      rank?: SpeedRank;
      room: OnlineRoomState;
    };

export async function registerUser(payload: {
  nickname: string;
  displayName: string;
  password: string;
}): Promise<{ user: AuthUser }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'TrilhosClient',
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { user?: AuthUser; error?: string };
  if (!res.ok || !data.user) {
    throw new Error(data.error || 'Erro ao criar conta.');
  }
  return { user: data.user };
}

export async function loginUser(payload: {
  nickname: string;
  password: string;
}): Promise<{ user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'TrilhosClient',
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { user?: AuthUser; error?: string };
  if (!res.ok || !data.user) {
    throw new Error(data.error || 'Nickname ou senha incorretos.');
  }
  return { user: data.user };
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AuthUser };
    return data.user || null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'TrilhosClient' },
    });
  } catch {
    // Best-effort logout
  }
}

export async function saveServerProfile(payload: Partial<AuthUser>): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'TrilhosClient',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AuthUser };
    return data.user || null;
  } catch {
    return null;
  }
}

export async function fetchRooms(): Promise<OnlineRoomSummary[]> {
  const res = await fetch('/api/rooms');
  if (!res.ok) throw new Error('Falha ao carregar salas.');
  const data = (await res.json()) as { rooms: OnlineRoomSummary[] };
  return data.rooms || [];
}

export async function fetchLeaderboard(stageId?: number): Promise<LeaderboardResponse> {
  const url = stageId ? `/api/leaderboard?stageId=${encodeURIComponent(stageId)}` : '/api/leaderboard';
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Falha ao carregar ranking.');
  const data = (await res.json()) as Partial<LeaderboardResponse>;
  return {
    entries: data.entries || [],
    weekKey: data.weekKey || 'semana-atual',
    weekStartsAt: data.weekStartsAt || new Date().toISOString(),
    weekEndsAt: data.weekEndsAt || new Date().toISOString(),
    nextResetInMs: typeof data.nextResetInMs === 'number' ? data.nextResetInMs : 0,
  };
}

export async function submitLeaderboardEntry(payload: {
  playerName: string;
  stageId: number;
  elapsedSeconds: number;
  avgSpeedKmh: number;
  peakSpeedKmh: number;
  rank: SpeedRank;
  mode: 'SOLO' | 'ONLINE';
}): Promise<LeaderboardEntry | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'TrilhosClient',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { entry?: LeaderboardEntry };
      return data.entry || null;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }
  return null;
}

export class OnlineClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(ev: ServerEvent) => void>();
  private connectPromise: Promise<void> | null = null;
  private keepAliveId: number | null = null;
  public playerId: string | null = null;
  public authToken: string | null = null;

  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  public subscribe(fn: (ev: ServerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private clearKeepAlive(): void {
    if (this.keepAliveId !== null) {
      window.clearInterval(this.keepAliveId);
      this.keepAliveId = null;
    }
  }

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      this.ws = ws;

      ws.onopen = () => {
        this.connectPromise = null;
        this.clearKeepAlive();
        this.keepAliveId = window.setInterval(() => {
          this.send({ type: 'PING' });
        }, 20000);
        resolve();
      };
      ws.onerror = () => {
        this.connectPromise = null;
        this.clearKeepAlive();
        reject(new Error('Não foi possível conectar ao servidor online.'));
      };
      ws.onclose = () => {
        this.ws = null;
        this.connectPromise = null;
        this.clearKeepAlive();
        for (const fn of this.listeners) {
          fn({ type: 'ROOM_LEFT' });
        }
      };
      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data as string) as ServerEvent;
          if (parsed.type === 'WELCOME') {
            this.playerId = parsed.playerId;
          }
          for (const fn of this.listeners) fn(parsed);
        } catch {
          // Ignore invalid JSON
        }
      };
    });

    return this.connectPromise;
  }

  public send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public async createRoom(params: {
    roomName: string;
    playerName: string;
    stageIndex: number;
    cosmetics: EquippedCosmetics;
    abilityId: AbilityId;
  }): Promise<void> {
    await this.connect();
    this.send({ type: 'CREATE_ROOM', ...params, token: this.authToken });
  }

  public async joinRoom(params: {
    roomId: string;
    playerName: string;
    cosmetics: EquippedCosmetics;
    abilityId: AbilityId;
  }): Promise<void> {
    await this.connect();
    this.send({ type: 'JOIN_ROOM', ...params, token: this.authToken });
  }

  public leaveRoom(): void {
    this.send({ type: 'LEAVE_ROOM' });
  }

  public updateLoadout(params: {
    playerName: string;
    cosmetics: EquippedCosmetics;
    abilityId: AbilityId;
  }): void {
    this.send({ type: 'UPDATE_LOADOUT', ...params, token: this.authToken });
  }

  public setStage(stageIndex: number): void {
    this.send({ type: 'SET_STAGE', stageIndex });
  }

  public toggleReady(): void {
    this.send({ type: 'TOGGLE_READY' });
  }

  public startMatch(): void {
    this.send({ type: 'START_MATCH' });
  }

  public disconnect(): void {
    this.clearKeepAlive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Coins,
  Crown,
  Flame,
  Home,
  Layers,
  Lock,
  LogIn,
  LogOut,
  Music,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Shirt,
  Sparkles,
  Timer,
  TrainFront,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { MonkeyTagEngine3D } from './game/engine3d';
import {
  ABILITIES,
  COSMETICS,
  computeStageClearCoinBonus,
  CrateRewardResult,
  getAbilityDef,
  loadProfile,
  PlayerProfile,
  rollPrizeCrate,
  saveProfile,
} from './game/progression';
import { STAGES } from './game/stages';
import {
  AbilityId,
  AuthUser,
  BackCosmeticId,
  GameSettings,
  GraphicsQuality,
  HeadCosmeticId,
  HudSnapshot,
  LeaderboardEntry,
  OnlineRoomState,
  OnlineRoomSummary,
} from './game/types';
import {
  fetchCurrentUser,
  fetchLeaderboard,
  fetchRooms,
  loginUser,
  logoutUser,
  OnlineClient,
  registerUser,
  saveServerProfile,
  ServerEvent,
  submitLeaderboardEntry,
} from './net/onlineClient';
import { MonkeyWardrobePreview } from './components/MonkeyWardrobePreview';
import {
  DEFAULT_MOBILE_HUD_LAYOUT,
  MobileHudEditor,
  normalizeMobileHudLayout,
} from './components/MobileHudEditor';
import { CatalogSoundKind, TrainsCatalogTab } from './components/TrainsCatalogTab';
import { TutorialGuide } from './components/TutorialGuide';
import { PrizeCrateCard } from './components/PrizeCrateCard';
import { OfflineIndicator } from './pwa/OfflineIndicator';

type LobbyTab =
  | 'HOME'
  | 'STAGES'
  | 'TRAINS'
  | 'ONLINE'
  | 'WARDROBE'
  | 'RECORDS'
  | 'SETTINGS'
  | 'LOGIN';

const SETTINGS_STORAGE_KEY = 'trilhos_settings_v1';

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

function getDefaultSettings(isMobile: boolean): GameSettings {
  return isMobile
    ? {
        graphicsQuality: 'low',
        shadows: false,
        fogEffects: true,
        resolutionScale: 0.75,
        masterVolume: 0.65,
        muted: false,
        musicEnabled: true,
        mobileHudLayout: DEFAULT_MOBILE_HUD_LAYOUT,
      }
    : {
        graphicsQuality: 'medium',
        shadows: true,
        fogEffects: true,
        resolutionScale: 1,
        masterVolume: 0.65,
        muted: false,
        musicEnabled: true,
        mobileHudLayout: DEFAULT_MOBILE_HUD_LAYOUT,
      };
}

function loadSettings(isMobile: boolean): GameSettings {
  const defaults = getDefaultSettings(isMobile);
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const graphicsQuality: GraphicsQuality =
      parsed.graphicsQuality === 'low' ||
      parsed.graphicsQuality === 'medium' ||
      parsed.graphicsQuality === 'high'
        ? parsed.graphicsQuality
        : defaults.graphicsQuality;
    return {
      graphicsQuality,
      shadows: typeof parsed.shadows === 'boolean' ? parsed.shadows : defaults.shadows,
      fogEffects: typeof parsed.fogEffects === 'boolean' ? parsed.fogEffects : defaults.fogEffects,
      resolutionScale:
        typeof parsed.resolutionScale === 'number'
          ? Math.max(0.65, Math.min(1.25, parsed.resolutionScale))
          : defaults.resolutionScale,
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.masterVolume))
          : defaults.masterVolume,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : defaults.muted,
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : defaults.musicEnabled,
      mobileHudLayout: normalizeMobileHudLayout(parsed.mobileHudLayout),
    };
  } catch {
    return defaults;
  }
}

function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

const INITIAL_HUD: HudSnapshot = {
  gameState: 'TITLE_MENU',
  isOnline: false,
  spectating: false,
  stageIndex: 0,
  stageTotal: STAGES.length,
  stageName: STAGES[0].name,
  stageIsBoss: STAGES[0].isBoss,
  trainLabel: STAGES[0].trainLabel,
  monkeysAlive: 3,
  monkeyStatuses: [true, true, true],
  monkeyNames: ['Macaco 1', 'Parceiro 2', 'Parceiro 3'],
  coalDestroyed: 0,
  coalTotal: STAGES[0].coalCount,
  currentDelay: STAGES[0].baseDelay,
  currentInterval: STAGES[0].baseSpawnInterval,
  elapsedSeconds: 0,
  vaultsUsed: 0,
  currentSpeed: 0,
  avgSpeed: 0,
  peakSpeed: 0,
  liveRank: 'D',
  finalRank: 'D',
  boostActive: false,
  isSliding: false,
  coalBlinkRemaining: 0,
  nearSupport: false,
  nearCoal: false,
  nearArmoredCoal: false,
  isStoppingClimax: false,
  muted: false,
  dangerWarning: false,
  gamepadConnected: false,
  coinsRun: 0,
  equippedAbility: 'dash_basic',
  abilityCooldown: 0,
  abilityMaxCooldown: 4.5,
  abilityActiveTimer: 0,
  timeStopRemaining: 0,
  shieldActive: false,
  smokeLevel: 0,
  slowed: false,
  quakeActive: false,
  flashOpacity: 0,
  runResultNonce: 0,
};

function MonkeyIcon({ alive }: { alive: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`w-6 h-6 transition-opacity duration-150 ${alive ? 'opacity-100' : 'opacity-25'}`}
      aria-hidden="true"
    >
      <circle
        cx="6"
        cy="15"
        r="4"
        fill={alive ? '#18181b' : '#09090b'}
        stroke={alive ? '#ededf2' : '#52525b'}
        strokeWidth="2"
      />
      <circle
        cx="26"
        cy="15"
        r="4"
        fill={alive ? '#18181b' : '#09090b'}
        stroke={alive ? '#ededf2' : '#52525b'}
        strokeWidth="2"
      />
      <circle
        cx="16"
        cy="16"
        r="9.5"
        fill={alive ? '#141418' : '#09090b'}
        stroke={alive ? '#ededf2' : '#52525b'}
        strokeWidth="2"
      />
      {alive ? (
        <>
          <ellipse cx="12.5" cy="15" rx="2" ry="1.6" fill="#f4f4f6" />
          <ellipse cx="19.5" cy="15" rx="2" ry="1.6" fill="#f4f4f6" />
        </>
      ) : (
        <path
          d="M10 10 L22 22 M22 10 L10 22"
          stroke="#71717a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function CoalIcon() {
  return (
    <svg viewBox="0 0 28 28" className="w-5 h-5" aria-hidden="true">
      <polygon points="6,13 10,6 15,8 19,5 22,13" fill="#27272a" stroke="#e4e4ec" strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="4,13 24,13 22,21 6,21" fill="#141418" stroke="#ededf2" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="9" cy="23.5" r="2.3" fill="#09090b" stroke="#ededf2" strokeWidth="1.5" />
      <circle cx="19" cy="23.5" r="2.3" fill="#09090b" stroke="#ededf2" strokeWidth="1.5" />
    </svg>
  );
}

function formatTime(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatRecordTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const tenthsTotal = Math.round(safe * 10);
  const whole = Math.floor(tenthsTotal / 10);
  const tenths = tenthsTotal % 10;
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function formatResetCountdown(ms: number): string {
  if (ms <= 0) return 'em breve';
  const totalMinutes = Math.max(1, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MonkeyTagEngine3D | null>(null);
  const onlineClientRef = useRef<OnlineClient | null>(null);
  const myPlayerIdRef = useRef<string>('');
  const mySlotRef = useRef<number>(0);
  const lastProcessedNonceRef = useRef(0);
  const skipNextServerSyncRef = useRef(false);
  const currentRoomRef = useRef<OnlineRoomState | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [isTouchUi, setIsTouchUi] = useState(() => detectTouchDevice());
  const [stickKnob, setStickKnob] = useState({ x: 0, y: 0 });
  const stickPointerIdRef = useRef<number | null>(null);
  const stickOriginRef = useRef({ x: 0, y: 0 });
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('HOME');
  const [stagesSubTab, setStagesSubTab] = useState<'LIST' | 'TUTORIALS'>('LIST');
  const [settingsSubTab, setSettingsSubTab] = useState<'GENERAL' | 'MOBILE_HUD'>('GENERAL');
  const [wardrobeSubTab, setWardrobeSubTab] = useState<'COSMETICS' | 'ABILITIES'>('COSMETICS');
  const [wardrobeSlotFilter, setWardrobeSlotFilter] = useState<'all' | 'head' | 'back'>('all');
  const [wardrobeQuery, setWardrobeQuery] = useState('');
  const [wardrobeOnlyUnlocked, setWardrobeOnlyUnlocked] = useState(false);
  const [previewCosmetic, setPreviewCosmetic] = useState<{
    slot: 'head' | 'back';
    id: HeadCosmeticId | BackCosmeticId;
    name: string;
  } | null>(null);
  const [stageChapter, setStageChapter] = useState(0);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings(detectTouchDevice()));

  // Auth State (Persistent server-side HttpOnly session cookie)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authNickname, setAuthNickname] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Online Room State
  const [rooms, setRooms] = useState<OnlineRoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<OnlineRoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);

  // Leaderboard State (Shared Weekly Podium)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardStageFilter, setLeaderboardStageFilter] = useState<number | undefined>(undefined);
  const [leaderboardResetInMs, setLeaderboardResetInMs] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const leaderboardStageFilterRef = useRef<number | undefined>(undefined);
  leaderboardStageFilterRef.current = leaderboardStageFilter;

  // End-of-stage Crate & Reward State
  const [stageBonusCoins, setStageBonusCoins] = useState(0);
  const [crateOpened, setCrateOpened] = useState(false);
  const [crateReward, setCrateReward] = useState<CrateRewardResult | null>(null);

  const activePlayerName = authUser ? authUser.displayName : profile.playerName;

  // Restore existing server session on page reload
  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((user) => {
      if (!active || !user) return;
      skipNextServerSyncRef.current = true;
      setAuthUser(user);
      setProfile({
        playerName: user.displayName,
        coins: user.coins,
        unlockedAbilities: user.unlockedAbilities,
        equippedAbility: user.equippedAbility,
        unlockedCosmetics: user.unlockedCosmetics,
        equippedCosmetics: user.equippedCosmetics,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync profile changes to 3D engine, localStorage, server account, and online room
  useEffect(() => {
    saveProfile(profile);
    engineRef.current?.setLocalLoadout(
      activePlayerName,
      profile.equippedCosmetics,
      profile.equippedAbility
    );
    if (authUser) {
      if (skipNextServerSyncRef.current) {
        skipNextServerSyncRef.current = false;
      } else {
        saveServerProfile({
          displayName: profile.playerName,
          coins: profile.coins,
          unlockedAbilities: profile.unlockedAbilities,
          equippedAbility: profile.equippedAbility,
          unlockedCosmetics: profile.unlockedCosmetics,
          equippedCosmetics: profile.equippedCosmetics,
        });
      }
    }
    if (currentRoomRef.current && currentRoomRef.current.status === 'LOBBY') {
      onlineClientRef.current?.updateLoadout({
        playerName: activePlayerName,
        cosmetics: profile.equippedCosmetics,
        abilityId: profile.equippedAbility,
      });
    }
  }, [profile, activePlayerName, authUser]);

  // Initialize 3D Engine safely
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let engine: MonkeyTagEngine3D | null = null;
    try {
      engine = new MonkeyTagEngine3D(container, (snapshot) => {
        setHud(snapshot);
      });
      const initProf = loadProfile();
      engine.setLocalLoadout(
        initProf.playerName,
        initProf.equippedCosmetics,
        initProf.equippedAbility
      );
      engine.applySettings(loadSettings(detectTouchDevice()));
      engineRef.current = engine;
      engine.start();
      setWebglError(null);
    } catch {
      setWebglError(
        'Não foi possível iniciar o gráfico 3D neste navegador. Tente abrir no Chrome ou Safari atualizado.'
      );
    }

    return () => {
      engine?.destroy();
      engineRef.current = null;
    };
  }, []);

  // Persist and apply Graphics & Sound settings live
  useEffect(() => {
    saveSettings(settings);
    engineRef.current?.applySettings(settings);
  }, [settings]);

  // Unlock Web Audio smoothly on first user interaction so lobby music starts right away
  useEffect(() => {
    const unlockOnce = () => {
      engineRef.current?.sound.unlock();
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
  }, []);

  // Keep settings.muted aligned if toggled via keyboard M / gamepad
  useEffect(() => {
    setSettings((prev) => (prev.muted === hud.muted ? prev : { ...prev, muted: hud.muted }));
  }, [hud.muted]);

  // Initialize persistent Online Client ONCE (empty deps avoids disconnect loops!)
  useEffect(() => {
    const client = new OnlineClient();
    onlineClientRef.current = client;

    const unsub = client.subscribe((ev: ServerEvent) => {
      if (ev.type === 'WELCOME') {
        myPlayerIdRef.current = ev.playerId;
        setMyPlayerId(ev.playerId);
      } else if (ev.type === 'ERROR') {
        setOnlineError(ev.message);
        setOnlineBusy(false);
      } else if (ev.type === 'ROOM_JOINED') {
        mySlotRef.current = ev.yourSlot;
        myPlayerIdRef.current = ev.playerId;
        setMyPlayerId(ev.playerId);
        currentRoomRef.current = ev.room;
        setCurrentRoom(ev.room);
        setOnlineError(null);
        setOnlineBusy(false);
      } else if (ev.type === 'ROOM_STATE') {
        currentRoomRef.current = ev.room;
        setCurrentRoom(ev.room);
      } else if (ev.type === 'ROOM_LEFT') {
        const wasPlayingOnline =
          engineRef.current?.gameState === 'PLAYING' && Boolean(currentRoomRef.current);
        currentRoomRef.current = null;
        setCurrentRoom(null);
        if (wasPlayingOnline) {
          setOnlineError('Conexão com a sala online foi encerrada.');
          setLobbyTab('ONLINE');
        }
      } else if (ev.type === 'MATCH_STARTED') {
        currentRoomRef.current = ev.room;
        setCurrentRoom(ev.room);
        const me = ev.room.players.find(
          (p) => p.playerId === (client.playerId || myPlayerIdRef.current)
        );
        const slot = me ? me.slot : mySlotRef.current;
        mySlotRef.current = slot;
        engineRef.current?.startOnlineMatch(ev.room, slot, ev.coalHps, ev.coins, client);
      } else if (ev.type === 'MATCH_END') {
        currentRoomRef.current = ev.room;
        setCurrentRoom(ev.room);
      }
    });

    return () => {
      unsub();
      client.disconnect();
    };
  }, []);

  const refreshRooms = useCallback(async () => {
    try {
      const list = await fetchRooms();
      setRooms(list);
    } catch {
      setRooms([]);
    }
  }, []);

  const refreshLeaderboard = useCallback(async (stageId?: number) => {
    setLeaderboardLoading(true);
    try {
      const res = await fetchLeaderboard(stageId);
      setLeaderboard(res.entries);
      setLeaderboardResetInMs(res.nextResetInMs);
    } catch {
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Handle stage completion / game over coin rewards & leaderboard submission
  useEffect(() => {
    if (hud.runResultNonce === 0 || hud.runResultNonce === lastProcessedNonceRef.current) return;
    lastProcessedNonceRef.current = hud.runResultNonce;

    const cleared = hud.gameState === 'STAGE_CLEAR' || hud.gameState === 'VICTORY';
    const clearBonus = cleared
      ? computeStageClearCoinBonus(hud.stageIndex, hud.stageIsBoss, hud.finalRank)
      : 0;
    const totalEarned = hud.coinsRun + clearBonus;
    setStageBonusCoins(clearBonus);
    setCrateOpened(false);
    setCrateReward(null);

    if (totalEarned > 0) {
      setProfile((prev) => ({
        ...prev,
        coins: prev.coins + totalEarned,
      }));
    }

    if (cleared && !hud.isOnline) {
      const stage = STAGES[hud.stageIndex] || STAGES[0];
      submitLeaderboardEntry({
        playerName: activePlayerName,
        stageId: stage.id,
        elapsedSeconds: Number(Math.max(4, hud.elapsedSeconds).toFixed(1)),
        avgSpeedKmh: hud.avgSpeed,
        peakSpeedKmh: hud.peakSpeed,
        rank: hud.finalRank,
        mode: 'SOLO',
      }).then(() => {
        refreshLeaderboard(leaderboardStageFilterRef.current);
      });
    } else if (cleared && hud.isOnline) {
      refreshLeaderboard(leaderboardStageFilterRef.current);
    }
  }, [
    hud.runResultNonce,
    hud.gameState,
    hud.coinsRun,
    hud.stageIndex,
    hud.stageIsBoss,
    hud.finalRank,
    hud.isOnline,
    hud.elapsedSeconds,
    hud.avgSpeed,
    hud.peakSpeed,
    activePlayerName,
    refreshLeaderboard,
  ]);

  useEffect(() => {
    if (hud.gameState !== 'TITLE_MENU') return;
    if (lobbyTab === 'ONLINE') {
      refreshRooms();
      if (!currentRoom) {
        const id = window.setInterval(refreshRooms, 3500);
        return () => window.clearInterval(id);
      }
    }
    if (lobbyTab === 'RECORDS') refreshLeaderboard(leaderboardStageFilter);
  }, [hud.gameState, lobbyTab, currentRoom, leaderboardStageFilter, refreshRooms, refreshLeaderboard]);

  const applyAuthenticatedUser = (user: AuthUser) => {
    skipNextServerSyncRef.current = true;
    setAuthUser(user);
    setProfile({
      playerName: user.displayName,
      coins: user.coins,
      unlockedAbilities: user.unlockedAbilities,
      equippedAbility: user.equippedAbility,
      unlockedCosmetics: user.unlockedCosmetics,
      equippedCosmetics: user.equippedCosmetics,
    });
    setLobbyTab('HOME');
    setAuthError(null);
    setAuthPassword('');
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (authMode === 'REGISTER') {
        const res = await registerUser({
          nickname: authNickname.trim(),
          displayName: authDisplayName.trim(),
          password: authPassword,
        });
        applyAuthenticatedUser(res.user);
      } else {
        const res = await loginUser({
          nickname: authNickname.trim(),
          password: authPassword,
        });
        applyAuthenticatedUser(res.user);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (currentRoom) {
      onlineClientRef.current?.leaveRoom();
      currentRoomRef.current = null;
      setCurrentRoom(null);
    }
    await logoutUser();
    setAuthUser(null);
    setLobbyTab('LOGIN');
  };

  const handleOpenCrate = () => {
    if (crateOpened) return;
    engineRef.current?.sound.playCrateOpen();
    const { nextProfile, reward } = rollPrizeCrate(profile);
    setProfile(nextProfile);
    setCrateReward(reward);
    setCrateOpened(true);
  };

  const handleCreateRoom = async () => {
    if (!onlineClientRef.current) return;
    setOnlineBusy(true);
    setOnlineError(null);
    try {
      await onlineClientRef.current.createRoom({
        roomName: roomNameInput.trim() || `Sala de ${activePlayerName}`,
        playerName: activePlayerName,
        stageIndex: hud.stageIndex,
        cosmetics: profile.equippedCosmetics,
        abilityId: profile.equippedAbility,
      });
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Erro ao criar sala.');
      setOnlineBusy(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!onlineClientRef.current || !roomId.trim()) return;
    setOnlineBusy(true);
    setOnlineError(null);
    try {
      await onlineClientRef.current.joinRoom({
        roomId: roomId.trim().toUpperCase(),
        playerName: activePlayerName,
        cosmetics: profile.equippedCosmetics,
        abilityId: profile.equippedAbility,
      });
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Erro ao entrar na sala.');
      setOnlineBusy(false);
    }
  };

  const handleBuyOrEquipAbility = (abilityId: AbilityId, cost: number) => {
    const unlocked = profile.unlockedAbilities.includes(abilityId);
    if (unlocked) {
      setProfile((prev) => ({ ...prev, equippedAbility: abilityId }));
      return;
    }
    if (profile.coins < cost) return;
    engineRef.current?.sound.playCrateOpen();
    setProfile((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      unlockedAbilities: [...prev.unlockedAbilities, abilityId],
      equippedAbility: abilityId,
    }));
  };

  const handleEquipCosmetic = (slot: 'head' | 'back', id: string) => {
    setPreviewCosmetic((prev) => (prev && prev.slot === slot ? null : prev));
    setProfile((prev) => ({
      ...prev,
      equippedCosmetics: {
        ...prev.equippedCosmetics,
        [slot]: slot === 'head' ? (id as HeadCosmeticId) : (id as BackCosmeticId),
      },
    }));
  };

  const handlePlayTutorialHorn = (kind: CatalogSoundKind) => {
    const snd = engineRef.current?.sound;
    if (!snd) return;
    snd.unlock();
    if (kind === 'quake') snd.playQuakeTrainHorn(0, 1);
    else if (kind === 'flash') snd.playFlashTrainHorn(0, 1);
    else if (kind === 'red') {
      snd.playTrackAppear(0);
      snd.playTrainHorn(0, 1);
    } else snd.playTrainHorn(0, 1);
  };

  const wardrobeDisplayCosmetics = previewCosmetic
    ? {
        ...profile.equippedCosmetics,
        [previewCosmetic.slot]: previewCosmetic.id,
      }
    : profile.equippedCosmetics;

  const selectedStage = STAGES[hud.stageIndex] || STAGES[0];
  const equippedAbilityDef = getAbilityDef(hud.equippedAbility);
  const isHost = Boolean(
    currentRoom && currentRoom.hostId === (onlineClientRef.current?.playerId || myPlayerId)
  );
  const chapterCount = Math.ceil(STAGES.length / 6);
  const visibleStages = STAGES.slice(stageChapter * 6, stageChapter * 6 + 6);

  const handleStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerIdRef.current !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    stickPointerIdRef.current = e.pointerId;
    stickOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const updateStickFromPointer = (cx: number, cy: number) => {
    const scale = settings.mobileHudLayout.joystick.scale || 1;
    const maxR = 38;
    const dx = (cx - stickOriginRef.current.x) / scale;
    const dy = (cy - stickOriginRef.current.y) / scale;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 0.5 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 0.5 ? Math.sin(angle) * clamped : 0;
    setStickKnob({ x: kx, y: ky });
    engineRef.current?.setTouchMove(kx / maxR, ky / maxR);
  };

  const handleStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleStickUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    stickPointerIdRef.current = null;
    setStickKnob({ x: 0, y: 0 });
    engineRef.current?.setTouchMove(0, 0);
  };

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-black select-none">
      {/* Isolated 3D WebGL Viewport Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {webglError && (
        <div className="fixed bottom-4 left-4 right-4 z-50 border border-zinc-500 bg-[#101014]/95 px-4 py-3 text-xs font-mono-tabular text-zinc-100">
          {webglError}
        </div>
      )}

      {/* SOMBER LOBBY / TITLE MENU (Live 3D Black-Void Train & Dark Trees Backdrop) */}
      {hud.gameState === 'TITLE_MENU' && (
        <section
          className="absolute inset-0 z-20 flex flex-col justify-between bg-transparent overflow-y-auto"
          onClickCapture={(e) => {
            const target = e.target as HTMLElement | null;
            const btn = target?.closest('button');
            if (btn && !btn.hasAttribute('disabled')) {
              engineRef.current?.sound.playUiClick();
            }
          }}
        >
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 via-42% to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/60" />
          </div>

          {/* Top Bar */}
          <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-12 pt-4 pb-3 border-b border-zinc-900/90">
            <svg
              viewBox="0 0 360 72"
              className="w-40 sm:w-56 h-auto"
              role="img"
              aria-label="Trilhos de Cinza"
            >
              <g transform="skewX(-7)">
                <path d="M6 10 L330 6 L326 12 L4 15 Z" fill="#ededf2" opacity="0.85" />
                <text
                  x="8"
                  y="48"
                  fill="#f4f4f8"
                  fontFamily="Oswald, sans-serif"
                  fontWeight="700"
                  fontSize="36"
                  letterSpacing="2"
                >
                  TRILHOS DE CINZA
                </text>
                <path d="M8 58 L240 55 L238 60 L6 62 Z" fill="#52525b" />
              </g>
            </svg>

            <div className="flex flex-wrap items-center gap-2">
              {authUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewCosmetic(null);
                    setLobbyTab('LOGIN');
                  }}
                  className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-mono-tabular cursor-pointer whitespace-nowrap ${
                    lobbyTab === 'LOGIN'
                      ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                      : 'bg-[#0d0d10] border-zinc-700 text-zinc-200 hover:border-zinc-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="font-bold">{activePlayerName}</span>
                  <span className={lobbyTab === 'LOGIN' ? 'text-zinc-700 hidden sm:inline' : 'text-zinc-500 hidden sm:inline'}>
                    @{authUser.nickname}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewCosmetic(null);
                    setLobbyTab('LOGIN');
                  }}
                  className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-mono-tabular cursor-pointer whitespace-nowrap ${
                    lobbyTab === 'LOGIN'
                      ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                      : 'bg-[#0d0d10] border-zinc-700 text-zinc-200 hover:border-zinc-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}

              <div className="flex items-center gap-2 bg-[#0d0d10] border border-zinc-700 px-3 py-2 text-sm font-mono-tabular text-white">
                <Coins className="w-4 h-4 text-zinc-300" />
                <span className="font-bold">{profile.coins}</span>
              </div>

              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, muted: !prev.muted }))}
                aria-label={hud.muted ? 'Ativar som' : 'Silenciar som'}
                className="inline-flex items-center justify-center w-10 h-10 border border-zinc-700 bg-[#0d0d10] text-zinc-200 hover:border-zinc-400 hover:text-white cursor-pointer"
              >
                {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewCosmetic(null);
                  setLobbyTab('SETTINGS');
                }}
                aria-label="Configurações"
                title="Configurações"
                className={`inline-flex items-center justify-center w-10 h-10 border cursor-pointer transition-colors ${
                  lobbyTab === 'SETTINGS'
                    ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                    : 'border-zinc-700 bg-[#0d0d10] text-zinc-200 hover:border-zinc-400 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* MAIN LOBBY CONTENT */}
          <div
            className={`relative z-10 flex-1 flex flex-col justify-start px-4 sm:px-12 py-5 pb-16 sm:pb-6 ${
              lobbyTab === 'WARDROBE' || lobbyTab === 'TRAINS'
                ? 'max-w-5xl'
                : 'sm:justify-center max-w-3xl'
            }`}
          >
            <nav className="flex flex-wrap items-center gap-1.5 mb-6" aria-label="Menu do Lobby">
              {(
                [
                  { id: 'HOME', label: 'Início', icon: Home },
                  { id: 'STAGES', label: 'Fases', icon: Layers },
                  { id: 'TRAINS', label: 'Trens', icon: TrainFront },
                  { id: 'ONLINE', label: 'Salas Online', icon: Users },
                  { id: 'WARDROBE', label: 'Vestiário', icon: Shirt },
                  { id: 'RECORDS', label: 'Recordes', icon: Trophy },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = lobbyTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (id !== 'WARDROBE') setPreviewCosmetic(null);
                      setLobbyTab(id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-display uppercase tracking-wider border transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                        : 'bg-[#0e0e12]/90 text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* TAB 1: SIMPLE INITIAL LOBBY WITH MINI TUTORIAL */}
            {lobbyTab === 'HOME' && (
              <div className="max-w-xl py-3">
                <p className="text-xs font-mono-tabular uppercase tracking-[0.18em] text-zinc-400 mb-2">
                  Sobrevivência Expressionista · {STAGES.length} Fases
                </p>
                <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-wide text-white leading-tight mb-4">
                  Fuja dos trilhos. Quebre o carvão.
                </h1>

                <TutorialGuide
                  compact
                  onPlayTrainSound={handlePlayTutorialHorn}
                  onOpenFullTutorials={() => {
                    setStagesSubTab('TUTORIALS');
                    setLobbyTab('STAGES');
                  }}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0b0e]/90 border border-zinc-800 px-4 py-3 mb-5">
                  <div>
                    <div className="text-[11px] font-mono-tabular uppercase text-zinc-500">
                      Fase Selecionada
                    </div>
                    <div className="text-sm font-bold text-white">
                      Fase {selectedStage.id}: {selectedStage.name}
                      {selectedStage.isBoss ? ' · Boss' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStagesSubTab('LIST');
                      setLobbyTab('STAGES');
                    }}
                    className="text-xs font-mono-tabular text-zinc-300 hover:text-white underline cursor-pointer"
                  >
                    Escolher fase →
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.startGame(hud.stageIndex)}
                    className="inline-flex items-center justify-center gap-3 min-h-[52px] px-9 py-3 bg-[#f2f2f6] text-[#08080a] font-display text-xl tracking-wider uppercase font-bold hover:bg-white active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Jogar Agora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLobbyTab('ONLINE')}
                    className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 border border-zinc-700 bg-[#0d0d11]/90 text-zinc-200 font-display text-lg tracking-wider uppercase hover:border-zinc-400 hover:text-white cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Salas Online</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: FASES (36 Stages + Tutoriais Sub-Tab) */}
            {lobbyTab === 'STAGES' && (
              <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStagesSubTab('LIST')}
                      className={`px-3.5 py-2 text-xs font-display uppercase tracking-wider border cursor-pointer ${
                        stagesSubTab === 'LIST'
                          ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                          : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                      }`}
                    >
                      Fases ({STAGES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagesSubTab('TUTORIALS')}
                      className={`px-3.5 py-2 text-xs font-display uppercase tracking-wider border cursor-pointer ${
                        stagesSubTab === 'TUTORIALS'
                          ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                          : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                      }`}
                    >
                      Tutoriais
                    </button>
                  </div>

                  {stagesSubTab === 'LIST' && (
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: chapterCount }, (_, cIdx) => {
                        const start = cIdx * 6 + 1;
                        const end = Math.min(STAGES.length, start + 5);
                        const active = stageChapter === cIdx;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => setStageChapter(cIdx)}
                            className={`px-2 py-1 text-[11px] font-mono-tabular border cursor-pointer ${
                              active
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#121216] text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            {start}–{end}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {stagesSubTab === 'LIST' ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                      {visibleStages.map((st) => {
                        const idx = st.id - 1;
                        const active = idx === hud.stageIndex;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => engineRef.current?.selectStage(idx)}
                            className={`px-3 py-2.5 text-left border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                                : 'bg-[#121216] text-zinc-200 border-zinc-800 hover:border-zinc-500'
                            }`}
                          >
                            <div className="text-xs font-mono-tabular font-bold">
                              Fase {st.id}{st.isBoss ? ' · Boss' : ''}
                            </div>
                            <div
                              className={`text-xs truncate ${
                                active ? 'text-zinc-800' : 'text-zinc-400'
                              }`}
                            >
                              {st.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border border-zinc-800 bg-[#101014] px-3.5 py-2.5 mb-5">
                      <div className="text-sm font-medium text-white">
                        Fase {selectedStage.id}: {selectedStage.name} — {selectedStage.trainLabel}
                        {selectedStage.id >= 35 ? ' · Carvão Blindado (1.8x)' : ''}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono-tabular mt-0.5">
                        {selectedStage.subtitle}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => engineRef.current?.startGame(hud.stageIndex)}
                      className="inline-flex items-center justify-center gap-3 min-h-[48px] px-8 py-2.5 bg-[#f2f2f6] text-[#08080a] font-display text-lg tracking-wider uppercase font-bold hover:bg-white active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Iniciar Fase {selectedStage.id}</span>
                    </button>
                  </>
                ) : (
                  <TutorialGuide onPlayTrainSound={handlePlayTutorialHorn} />
                )}
              </div>
            )}

            {/* TAB 2B: GUIA DE TRENS */}
            {lobbyTab === 'TRAINS' && (
              <TrainsCatalogTab onPlayTrainSound={handlePlayTutorialHorn} />
            )}

                {/* TAB 3: SALAS ONLINE */}
                {lobbyTab === 'ONLINE' && (
                  <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-6">
                    {onlineError && (
                      <div className="mb-4 border border-zinc-500 bg-[#18181d] px-3.5 py-2 text-xs text-zinc-100 font-mono-tabular">
                        {onlineError}
                      </div>
                    )}

                    {!currentRoom ? (
                      <>
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                          <input
                            type="text"
                            maxLength={24}
                            placeholder="Nome da nova sala..."
                            value={roomNameInput}
                            onChange={(e) => setRoomNameInput(e.target.value)}
                            className="flex-1 bg-[#121216] border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                          />
                          <button
                            type="button"
                            disabled={onlineBusy}
                            onClick={handleCreateRoom}
                            className="px-5 py-2.5 bg-[#f2f2f6] text-[#08080a] font-display uppercase tracking-wider font-bold hover:bg-white disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            Criar Sala
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mb-5 pb-5 border-b border-zinc-800">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Código (ex: A7K2P)"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                            className="flex-1 bg-[#121216] border border-zinc-700 px-3.5 py-2 text-sm font-mono-tabular text-white uppercase placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                          />
                          <button
                            type="button"
                            disabled={onlineBusy || joinCodeInput.trim().length < 4}
                            onClick={() => handleJoinRoom(joinCodeInput)}
                            className="px-5 py-2 border border-zinc-600 bg-[#15151a] text-white font-display uppercase tracking-wider hover:border-zinc-300 disabled:opacity-40 cursor-pointer"
                          >
                            Entrar por Código
                          </button>
                          <button
                            type="button"
                            onClick={refreshRooms}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-zinc-700 bg-[#111114] text-zinc-300 hover:text-white cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span className="text-xs font-mono-tabular">Atualizar</span>
                          </button>
                        </div>

                        <div className="text-xs font-mono-tabular uppercase text-zinc-400 mb-2">
                          Salas Abertas ({rooms.length})
                        </div>
                        {rooms.length === 0 ? (
                          <div className="border border-zinc-800/80 bg-[#09090b] p-5 text-center text-xs font-mono-tabular text-zinc-500">
                            Nenhuma sala ativa no momento. Crie uma sala para jogar com até 3 pessoas.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                            {rooms.map((r) => (
                              <div
                                key={r.roomId}
                                className="flex items-center justify-between gap-3 bg-[#111115] border border-zinc-800 px-4 py-3"
                              >
                                <div>
                                  <div className="text-sm font-bold text-white">
                                    {r.name}{' '}
                                    <span className="text-xs font-mono-tabular text-zinc-400">
                                      #{r.roomId}
                                    </span>
                                  </div>
                                  <div className="text-xs font-mono-tabular text-zinc-400">
                                    Host: {r.hostName} · Fase {r.stageIndex + 1} · {r.playerCount}/
                                    {r.maxPlayers} macacos
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={r.status !== 'LOBBY' || r.playerCount >= r.maxPlayers || onlineBusy}
                                  onClick={() => handleJoinRoom(r.roomId)}
                                  className="px-4 py-2 bg-[#f2f2f6] text-[#08080a] text-xs font-display uppercase font-bold disabled:opacity-35 cursor-pointer"
                                >
                                  {r.status === 'PLAYING'
                                    ? 'Em Jogo'
                                    : r.playerCount >= r.maxPlayers
                                    ? 'Cheia'
                                    : 'Entrar'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-zinc-800">
                          <div>
                            <div className="text-xs font-mono-tabular text-zinc-400 uppercase">
                              Sala #{currentRoom.roomId} · Compartilhe este código
                            </div>
                            <h3 className="font-display text-2xl font-bold text-white">
                              {currentRoom.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => onlineClientRef.current?.leaveRoom()}
                            className="px-3.5 py-2 border border-zinc-700 text-xs font-mono-tabular text-zinc-300 hover:border-zinc-400 hover:text-white cursor-pointer"
                          >
                            Sair da Sala
                          </button>
                        </div>

                        <div className="mb-4">
                          <div className="text-xs font-mono-tabular text-zinc-400 mb-1.5">
                            Fase Selecionada:{' '}
                            <strong className="text-white">
                              Fase {currentRoom.stageIndex + 1} —{' '}
                              {STAGES[currentRoom.stageIndex]?.name}
                            </strong>
                          </div>
                          {isHost && (
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {STAGES.map((st, idx) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => onlineClientRef.current?.setStage(idx)}
                                  className={`px-2 py-1 text-[11px] font-mono-tabular border cursor-pointer ${
                                    currentRoom.stageIndex === idx
                                      ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                      : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500'
                                  }`}
                                >
                                  F{st.id}{st.isBoss ? '·B' : ''}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                          {[0, 1, 2].map((slotIdx) => {
                            const rp = currentRoom.players.find((p) => p.slot === slotIdx);
                            if (!rp) {
                              return (
                                <div
                                  key={slotIdx}
                                  className="border border-dashed border-zinc-800 bg-[#09090b] p-3.5 text-xs font-mono-tabular text-zinc-600 flex flex-col justify-center items-center"
                                >
                                  <span>Macaco {slotIdx + 1}</span>
                                  <span>Aguardando...</span>
                                </div>
                              );
                            }
                            const isMe =
                              rp.playerId === (onlineClientRef.current?.playerId || myPlayerId);
                            return (
                              <div
                                key={rp.playerId}
                                className={`border p-3.5 ${
                                  isMe
                                    ? 'border-zinc-400 bg-[#141419]'
                                    : 'border-zinc-800 bg-[#0e0e12]'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-mono-tabular text-zinc-400">
                                    Macaco {slotIdx + 1}{' '}
                                    {rp.playerId === currentRoom.hostId ? '· Host' : ''}
                                  </span>
                                  <span
                                    className={`text-[11px] font-mono-tabular px-1.5 py-0.5 ${
                                      rp.ready
                                        ? 'bg-[#ededf2] text-[#08080a] font-bold'
                                        : 'bg-zinc-900 text-zinc-400'
                                    }`}
                                  >
                                    {rp.ready ? 'Pronto' : 'Aguardando'}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-white truncate">
                                  {rp.name}
                                </div>
                                <div className="text-[11px] font-mono-tabular text-zinc-400 mt-1 truncate">
                                  {getAbilityDef(rp.abilityId).name}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {!isHost && (
                            <button
                              type="button"
                              onClick={() => onlineClientRef.current?.toggleReady()}
                              className="px-6 py-3 bg-[#f2f2f6] text-[#08080a] font-display text-lg uppercase font-bold hover:bg-white cursor-pointer"
                            >
                              Alternar Pronto
                            </button>
                          )}
                          {isHost && (
                            <button
                              type="button"
                              onClick={() => onlineClientRef.current?.startMatch()}
                              className="inline-flex items-center gap-2 px-7 py-3 bg-[#f2f2f6] text-[#08080a] font-display text-lg uppercase font-bold hover:bg-white cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>Iniciar Partida Online</span>
                            </button>
                          )}
                          <span className="text-xs font-mono-tabular text-zinc-400">
                            Acaba apenas quando todos os macacos morrerem ou o carvão esgotar.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: VESTIÁRIO & HABILIDADES */}
                {lobbyTab === 'WARDROBE' && (
                  <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-zinc-800 pb-4">
                      <div>
                        <h3 className="font-display text-2xl uppercase font-bold text-white">
                          Vestiário dos Macacos
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono-tabular">
                          {wardrobeSubTab === 'COSMETICS'
                            ? 'Clique em qualquer item para ver no macaco 3D e gire-o em 360°.'
                            : 'Desbloqueie habilidades com moedas para usar nas partidas.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWardrobeSubTab('COSMETICS')}
                          className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider border cursor-pointer ${
                            wardrobeSubTab === 'COSMETICS'
                              ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                              : 'bg-[#121216] text-zinc-300 border-zinc-700 hover:text-white'
                          }`}
                        >
                          Acessórios ({profile.unlockedCosmetics.length}/{COSMETICS.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setWardrobeSubTab('ABILITIES')}
                          className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider border cursor-pointer ${
                            wardrobeSubTab === 'ABILITIES'
                              ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                              : 'bg-[#121216] text-zinc-300 border-zinc-700 hover:text-white'
                          }`}
                        >
                          Habilidades ({profile.coins} moedas)
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-5 items-stretch">
                      <div className="w-full md:w-[295px] shrink-0">
                        <MonkeyWardrobePreview
                          cosmetics={wardrobeDisplayCosmetics}
                          previewLabel={previewCosmetic?.name ?? null}
                          onClearPreview={() => setPreviewCosmetic(null)}
                          lowDetail={settings.graphicsQuality === 'low' || isTouchUi}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {wardrobeSubTab === 'COSMETICS' ? (
                          <div className="space-y-3">
                            {/* Search & Slot Filters for 120+ items */}
                            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
                              <div className="relative flex-1 min-w-[160px]">
                                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={wardrobeQuery}
                                  onChange={(e) => setWardrobeQuery(e.target.value)}
                                  placeholder="Buscar item (ex: Asinhas de Anjo)..."
                                  className="w-full bg-[#121216] border border-zinc-700 pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                {(
                                  [
                                    { id: 'all', label: 'Todos' },
                                    { id: 'head', label: 'Cabeça' },
                                    { id: 'back', label: 'Costas' },
                                  ] as const
                                ).map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setWardrobeSlotFilter(f.id)}
                                    className={`px-2.5 py-1.5 text-[11px] font-mono-tabular uppercase border cursor-pointer ${
                                      wardrobeSlotFilter === f.id
                                        ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                        : 'bg-[#121216] text-zinc-300 border-zinc-700 hover:text-white'
                                    }`}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setWardrobeOnlyUnlocked((v) => !v)}
                                  className={`px-2.5 py-1.5 text-[11px] font-mono-tabular uppercase border cursor-pointer ${
                                    wardrobeOnlyUnlocked
                                      ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                      : 'bg-[#121216] text-zinc-300 border-zinc-700 hover:text-white'
                                  }`}
                                >
                                  Meus ({profile.unlockedCosmetics.length})
                                </button>
                              </div>
                            </div>

                            <div className="max-h-[340px] overflow-y-auto pr-1 space-y-5">
                              {(['head', 'back'] as const)
                                .filter((st) => wardrobeSlotFilter === 'all' || wardrobeSlotFilter === st)
                                .map((slotType) => {
                                  const q = wardrobeQuery.trim().toLowerCase();
                                  const filteredItems = COSMETICS.filter((c) => {
                                    if (c.slot !== slotType) return false;
                                    if (
                                      wardrobeOnlyUnlocked &&
                                      !profile.unlockedCosmetics.includes(c.id)
                                    ) {
                                      return false;
                                    }
                                    if (
                                      q &&
                                      !c.name.toLowerCase().includes(q) &&
                                      !c.description.toLowerCase().includes(q) &&
                                      !c.rarity.toLowerCase().includes(q)
                                    ) {
                                      return false;
                                    }
                                    return true;
                                  });

                                  return (
                                    <div key={slotType}>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-mono-tabular uppercase tracking-wider text-zinc-400">
                                          {slotType === 'head' ? 'Cabeça' : 'Costas'} ({filteredItems.length})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleEquipCosmetic(slotType, 'none')}
                                          className="text-xs font-mono-tabular text-zinc-400 hover:text-white underline cursor-pointer"
                                        >
                                          Remover item
                                        </button>
                                      </div>

                                      {filteredItems.length === 0 ? (
                                        <div className="border border-zinc-800/80 bg-[#09090b] p-3 text-[11px] font-mono-tabular text-zinc-500">
                                          Nenhum item encontrado neste filtro.
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {filteredItems.map((item) => {
                                            const unlocked = profile.unlockedCosmetics.includes(item.id);
                                            const equipped =
                                              slotType === 'head'
                                                ? profile.equippedCosmetics.head === item.id
                                                : profile.equippedCosmetics.back === item.id;
                                            const previewing =
                                              previewCosmetic?.slot === slotType &&
                                              previewCosmetic.id === item.id;
                                            return (
                                              <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                  if (unlocked) {
                                                    handleEquipCosmetic(slotType, item.id);
                                                  } else {
                                                    setPreviewCosmetic((prev) =>
                                                      prev &&
                                                      prev.slot === slotType &&
                                                      prev.id === item.id
                                                        ? null
                                                        : {
                                                            slot: slotType,
                                                            id: item.id as
                                                              | HeadCosmeticId
                                                              | BackCosmeticId,
                                                            name: item.name,
                                                          }
                                                    );
                                                  }
                                                }}
                                                className={`flex items-center justify-between gap-3 p-3 text-left border transition-colors cursor-pointer ${
                                                  equipped
                                                    ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                                                    : previewing
                                                    ? 'bg-[#1a1a24] text-white border-zinc-300'
                                                    : unlocked
                                                    ? 'bg-[#121217] text-white border-zinc-700 hover:border-zinc-400'
                                                    : 'bg-[#09090b] text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                                                }`}
                                              >
                                                <div className="min-w-0">
                                                  <div className="text-xs font-bold flex items-center gap-1.5">
                                                    {!unlocked && <Lock className="w-3.5 h-3.5 shrink-0" />}
                                                    <span className="truncate">{item.name}</span>
                                                  </div>
                                                  <div
                                                    className={`text-[11px] font-mono-tabular truncate ${
                                                      equipped ? 'text-zinc-700' : 'text-zinc-500'
                                                    }`}
                                                  >
                                                    {item.rarity} · {item.description}
                                                  </div>
                                                </div>
                                                <span className="text-[11px] font-mono-tabular shrink-0 font-bold">
                                                  {equipped
                                                    ? 'Equipado'
                                                    : previewing
                                                    ? 'Em prévia'
                                                    : unlocked
                                                    ? 'Equipar'
                                                    : 'Ver · Caixa'}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                            {ABILITIES.map((ab) => {
                              const unlocked = profile.unlockedAbilities.includes(ab.id);
                              const equipped = profile.equippedAbility === ab.id;
                              const canAfford = profile.coins >= ab.cost;
                              return (
                                <div
                                  key={ab.id}
                                  className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-3.5 border ${
                                    equipped
                                      ? 'bg-[#17171d] border-zinc-300'
                                      : 'bg-[#101014] border-zinc-800'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {ab.id === 'time_stop' ? (
                                        <Timer className="w-4 h-4 text-white" />
                                      ) : ab.id === 'iron_shield' ? (
                                        <Shield className="w-4 h-4 text-zinc-300" />
                                      ) : ab.id === 'seismic_smash' ? (
                                        <Sparkles className="w-4 h-4 text-zinc-300" />
                                      ) : ab.id === 'coal_beacon' ? (
                                        <Flame className="w-4 h-4 text-red-400" />
                                      ) : ab.id === 'slide_boost' ? (
                                        <Wind className="w-4 h-4 text-zinc-200" />
                                      ) : (
                                        <Zap className="w-4 h-4 text-zinc-300" />
                                      )}
                                      <span className="font-bold text-sm text-white">{ab.name}</span>
                                      <span className="text-[11px] font-mono-tabular text-zinc-400">
                                        Recarga {ab.cooldown}s
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">{ab.description}</p>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={!unlocked && !canAfford}
                                    onClick={() => handleBuyOrEquipAbility(ab.id, ab.cost)}
                                    className={`px-4 py-2 text-xs font-display uppercase tracking-wider font-bold shrink-0 whitespace-nowrap border transition-colors ${
                                      equipped
                                        ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] cursor-default'
                                        : unlocked
                                        ? 'bg-[#1b1b22] text-white border-zinc-500 hover:bg-zinc-200 hover:text-black cursor-pointer'
                                        : canAfford
                                        ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] hover:bg-white cursor-pointer'
                                        : 'bg-[#09090b] text-zinc-600 border-zinc-800 cursor-not-allowed'
                                    }`}
                                  >
                                    {equipped
                                      ? 'Equipada'
                                      : unlocked
                                      ? 'Equipar'
                                      : `Comprar · ${ab.cost} moedas`}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: RECORDES COMPETITIVOS */}
                {lobbyTab === 'RECORDS' && (
                  <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-5 sm:p-6 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-400">
                          <Timer className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Ranking Semanal Compartilhado</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-zinc-200">
                            Reseta em {formatResetCountdown(leaderboardResetInMs)}
                          </span>
                        </div>
                        <h3 className="font-display text-2xl uppercase font-bold text-white mt-0.5">
                          Recordes e Pódio da Semana
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono-tabular">
                          Visível para todas as contas · Quem concluir em menos tempo fica no topo.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => refreshLeaderboard(leaderboardStageFilter)}
                          className="inline-flex items-center gap-1.5 bg-[#121216] border border-zinc-700 px-3 py-1.5 text-xs font-mono-tabular text-zinc-200 hover:border-zinc-400 hover:text-white cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${leaderboardLoading ? 'animate-spin' : ''}`} />
                          <span>Atualizar</span>
                        </button>
                        <select
                          value={leaderboardStageFilter ?? ''}
                          onChange={(e) =>
                            setLeaderboardStageFilter(
                              e.target.value ? Number(e.target.value) : undefined
                            )
                          }
                          className="bg-[#121216] border border-zinc-700 px-3 py-1.5 text-xs font-mono-tabular text-white focus:outline-none"
                        >
                          <option value="">Todas as {STAGES.length} fases</option>
                          {STAGES.map((st) => (
                            <option key={st.id} value={st.id}>
                              Fase {st.id} — {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {leaderboardLoading ? (
                      <div className="py-8 text-center text-xs font-mono-tabular text-zinc-400">
                        Carregando pódio semanal...
                      </div>
                    ) : leaderboard.length === 0 ? (
                      <div className="border border-zinc-800 bg-[#09090b] p-6 text-center text-xs font-mono-tabular text-zinc-500">
                        Nenhum recorde registrado nesta semana ainda. Complete uma fase para assumir o 1º lugar do pódio!
                      </div>
                    ) : (
                      <>
                        {/* TOP 3 WEEKLY PODIUM */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {leaderboard.slice(0, 3).map((row, idx) => {
                            const isMine = Boolean(authUser && row.userId && authUser.userId === row.userId);
                            const placeLabels = ['1º Lugar · Líder', '2º Lugar', '3º Lugar'];
                            return (
                              <div
                                key={`podium-${row.id}`}
                                className={`border p-3.5 flex flex-col justify-between gap-2 ${
                                  idx === 0
                                    ? 'bg-[#16161c] border-zinc-300'
                                    : isMine
                                    ? 'bg-[#121217] border-zinc-500'
                                    : 'bg-[#101014] border-zinc-800'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular uppercase">
                                  <span className={idx === 0 ? 'text-white font-bold' : 'text-zinc-400'}>
                                    {idx === 0 ? <Crown className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> : null}
                                    {placeLabels[idx]}
                                  </span>
                                  <span className="text-zinc-400">
                                    F{row.stageId} · {row.mode}
                                  </span>
                                </div>

                                <div>
                                  <div className="font-display text-lg font-bold uppercase tracking-wide text-white truncate">
                                    {row.playerName}
                                  </div>
                                  {row.playerNickname ? (
                                    <div className="text-[11px] font-mono-tabular text-zinc-400 truncate">
                                      @{row.playerNickname}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="flex items-baseline justify-between border-t border-zinc-800/80 pt-2 font-mono-tabular">
                                  <span className="text-base font-bold text-white">
                                    {formatRecordTime(row.elapsedSeconds)}
                                  </span>
                                  <span className="text-[11px] text-zinc-400">
                                    {row.avgSpeedKmh} km/h · {row.rank}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="overflow-x-auto max-h-60 overflow-y-auto border border-zinc-800/80 bg-[#09090b]/80 px-3">
                          <table className="w-full text-left font-mono-tabular text-xs">
                            <thead className="text-zinc-500 border-b border-zinc-800 uppercase sticky top-0 bg-[#09090b]">
                              <tr>
                                <th className="py-2 pr-3">#</th>
                                <th className="py-2 pr-3">Jogador</th>
                                <th className="py-2 pr-3">Fase</th>
                                <th className="py-2 pr-3">Tempo</th>
                                <th className="py-2 pr-3">Vel. Méd</th>
                                <th className="py-2 pr-3">Modo</th>
                                <th className="py-2 text-right">Rank</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {leaderboard.map((row, idx) => {
                                const isMine = Boolean(authUser && row.userId && authUser.userId === row.userId);
                                return (
                                  <tr
                                    key={row.id}
                                    className={isMine ? 'bg-[#17171f]/80 text-white' : 'text-zinc-200'}
                                  >
                                    <td className="py-2 pr-3 font-bold text-white whitespace-nowrap">
                                      {idx === 0 ? <Crown className="w-3.5 h-3.5 inline mr-1" /> : null}
                                      {idx + 1}º
                                    </td>
                                    <td className="py-2 pr-3 font-medium max-w-[165px] truncate">
                                      <span>{row.playerName}</span>
                                      {row.playerNickname ? (
                                        <span className="text-zinc-500 ml-1.5">@{row.playerNickname}</span>
                                      ) : null}
                                    </td>
                                    <td className="py-2 pr-3 text-zinc-400">F{row.stageId}</td>
                                    <td className="py-2 pr-3 font-bold text-white">
                                      {formatRecordTime(row.elapsedSeconds)}
                                    </td>
                                    <td className="py-2 pr-3">{row.avgSpeedKmh} km/h</td>
                                    <td className="py-2 pr-3 text-zinc-400">{row.mode}</td>
                                    <td className="py-2 text-right font-display text-base font-bold text-white">
                                      {row.rank}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 6: LOGIN / CONTA */}
                {lobbyTab === 'LOGIN' && (
                  <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-6 max-w-md">
                    {authUser ? (
                      <div>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
                          <div>
                            <div className="text-xs font-mono-tabular uppercase text-zinc-400">
                              Conta Conectada
                            </div>
                            <h3 className="font-display text-2xl font-bold text-white">
                              @{authUser.nickname}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-3.5 py-2 border border-zinc-700 text-xs font-mono-tabular text-zinc-300 hover:border-zinc-400 hover:text-white cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sair</span>
                          </button>
                        </div>

                        <div className="mb-5">
                          <label className="block text-xs font-mono-tabular text-zinc-400 uppercase mb-1.5">
                            Nome de Exibição
                          </label>
                          <input
                            type="text"
                            maxLength={24}
                            value={profile.playerName}
                            onChange={(e) => {
                              const v = e.target.value.slice(0, 24);
                              setProfile((prev) => ({ ...prev, playerName: v }));
                              setAuthUser((prev) => (prev ? { ...prev, displayName: v } : null));
                            }}
                            className="w-full bg-[#121216] border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-300"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center font-mono-tabular text-xs">
                          <div className="bg-[#111115] border border-zinc-800 p-3">
                            <div className="text-zinc-500">Moedas</div>
                            <div className="text-lg font-bold text-white mt-0.5">{profile.coins}</div>
                          </div>
                          <div className="bg-[#111115] border border-zinc-800 p-3">
                            <div className="text-zinc-500">Habilidades</div>
                            <div className="text-lg font-bold text-white mt-0.5">
                              {profile.unlockedAbilities.length}/{ABILITIES.length}
                            </div>
                          </div>
                          <div className="bg-[#111115] border border-zinc-800 p-3">
                            <div className="text-zinc-500">Vestiário</div>
                            <div className="text-lg font-bold text-white mt-0.5">
                              {profile.unlockedCosmetics.length}/{COSMETICS.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-5 border-b border-zinc-800 pb-3">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('LOGIN');
                              setAuthError(null);
                            }}
                            className={`flex-1 py-2 text-sm font-display uppercase tracking-wider font-bold border cursor-pointer ${
                              authMode === 'LOGIN'
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                                : 'bg-[#121216] text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            Entrar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('REGISTER');
                              setAuthError(null);
                            }}
                            className={`flex-1 py-2 text-sm font-display uppercase tracking-wider font-bold border cursor-pointer ${
                              authMode === 'REGISTER'
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                                : 'bg-[#121216] text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            Criar Conta
                          </button>
                        </div>

                        {authError && (
                          <div className="mb-4 border border-zinc-500 bg-[#18181f] px-3 py-2 text-xs text-zinc-100 font-mono-tabular">
                            {authError}
                          </div>
                        )}

                        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5">
                          <div>
                            <label className="block text-xs font-mono-tabular text-zinc-400 uppercase mb-1">
                              Nickname Único
                            </label>
                            <input
                              type="text"
                              required
                              minLength={3}
                              maxLength={18}
                              placeholder="ex: macaco_sombra"
                              value={authNickname}
                              onChange={(e) => setAuthNickname(e.target.value)}
                              className="w-full bg-[#121216] border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                            />
                          </div>

                          {authMode === 'REGISTER' && (
                            <div>
                              <label className="block text-xs font-mono-tabular text-zinc-400 uppercase mb-1">
                                Nome de Exibição
                              </label>
                              <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={24}
                                placeholder="Nome visível nas salas e recordes"
                                value={authDisplayName}
                                onChange={(e) => setAuthDisplayName(e.target.value)}
                                className="w-full bg-[#121216] border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-mono-tabular text-zinc-400 uppercase mb-1">
                              Senha
                            </label>
                            <input
                              type="password"
                              required
                              minLength={4}
                              maxLength={72}
                              placeholder="Mínimo 4 caracteres"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full bg-[#121216] border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={authBusy}
                            className="mt-2 w-full min-h-[46px] bg-[#f2f2f6] text-[#08080a] font-display text-lg uppercase tracking-wider font-bold hover:bg-white disabled:opacity-50 cursor-pointer"
                          >
                            {authBusy
                              ? 'Processando...'
                              : authMode === 'REGISTER'
                              ? 'Cadastrar e Entrar'
                              : 'Entrar na Conta'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 7: CONFIGURAÇÕES (GRÁFICOS, SOM & HUD MOBILE) */}
                {lobbyTab === 'SETTINGS' && (
                  <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4 mb-5">
                      <div>
                        <h3 className="font-display text-2xl uppercase font-bold text-white">
                          Configurações
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono-tabular">
                          Ajuste gráficos, som e a posição dos botões mobile na tela.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSettingsSubTab('GENERAL')}
                            className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                              settingsSubTab === 'GENERAL'
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                            }`}
                          >
                            Gráficos e Som
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettingsSubTab('MOBILE_HUD')}
                            className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                              settingsSubTab === 'MOBILE_HUD'
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                            }`}
                          >
                            HUD Mobile
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSettings(getDefaultSettings(detectTouchDevice()))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-[#121216] text-xs font-mono-tabular text-zinc-300 hover:border-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar Tudo</span>
                        </button>
                      </div>
                    </div>

                    {settingsSubTab === 'MOBILE_HUD' ? (
                      <MobileHudEditor
                        layout={settings.mobileHudLayout}
                        isTouchUi={isTouchUi}
                        onToggleTouchUi={() => setIsTouchUi((v) => !v)}
                        onChangeLayout={(mobileHudLayout) =>
                          setSettings((prev) => ({ ...prev, mobileHudLayout }))
                        }
                      />
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* GRÁFICOS */}
                      <div className="space-y-4">
                        <div className="text-xs font-mono-tabular uppercase tracking-wider text-zinc-400">
                          Gráficos e Desempenho
                        </div>

                        <div>
                          <div className="text-xs text-zinc-300 font-mono-tabular mb-1.5">
                            Qualidade Visual
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                {
                                  id: 'low',
                                  label: 'Baixo',
                                  sub: 'Celular',
                                  shadows: false,
                                  res: 0.75,
                                },
                                {
                                  id: 'medium',
                                  label: 'Médio',
                                  sub: 'Equilibrado',
                                  shadows: true,
                                  res: 1,
                                },
                                {
                                  id: 'high',
                                  label: 'Alto',
                                  sub: 'Máximo',
                                  shadows: true,
                                  res: 1.15,
                                },
                              ] as const
                            ).map((preset) => {
                              const active = settings.graphicsQuality === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() =>
                                    setSettings((prev) => ({
                                      ...prev,
                                      graphicsQuality: preset.id,
                                      shadows: preset.shadows,
                                      resolutionScale: preset.res,
                                    }))
                                  }
                                  className={`px-2.5 py-2 border text-left transition-colors cursor-pointer ${
                                    active
                                      ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                                      : 'bg-[#121216] text-zinc-200 border-zinc-800 hover:border-zinc-500'
                                  }`}
                                >
                                  <div className="text-xs font-display uppercase font-bold">
                                    {preset.label}
                                  </div>
                                  <div
                                    className={`text-[10px] font-mono-tabular ${
                                      active ? 'text-zinc-700' : 'text-zinc-500'
                                    }`}
                                  >
                                    {preset.sub}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs font-mono-tabular text-zinc-300 mb-1.5">
                            <span>Escala de Resolução</span>
                            <span className="font-bold text-white">
                              {Math.round(settings.resolutionScale * 100)}%
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[0.7, 0.85, 1, 1.25].map((scaleVal) => {
                              const active = Math.abs(settings.resolutionScale - scaleVal) < 0.04;
                              return (
                                <button
                                  key={scaleVal}
                                  type="button"
                                  onClick={() =>
                                    setSettings((prev) => ({ ...prev, resolutionScale: scaleVal }))
                                  }
                                  className={`py-1.5 text-xs font-mono-tabular border cursor-pointer ${
                                    active
                                      ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                      : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500'
                                  }`}
                                >
                                  {Math.round(scaleVal * 100)}%
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-[#111115] border border-zinc-800 px-3.5 py-2.5">
                          <div>
                            <div className="text-xs font-bold text-white">Sombras Dinâmicas</div>
                            <div className="text-[11px] font-mono-tabular text-zinc-500">
                              Desative no celular para maior FPS
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({
                                ...prev,
                                shadows: !prev.shadows,
                                graphicsQuality:
                                  !prev.shadows && prev.graphicsQuality === 'low'
                                    ? 'medium'
                                    : prev.graphicsQuality,
                              }))
                            }
                            className={`px-3 py-1.5 text-xs font-mono-tabular border cursor-pointer ${
                              settings.shadows
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#18181d] text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {settings.shadows ? 'Ativadas' : 'Desativadas'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-[#111115] border border-zinc-800 px-3.5 py-2.5">
                          <div>
                            <div className="text-xs font-bold text-white">Neblina do Mapa</div>
                            <div className="text-[11px] font-mono-tabular text-zinc-500">
                              Atmosfera e profundidade de campo
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({ ...prev, fogEffects: !prev.fogEffects }))
                            }
                            className={`px-3 py-1.5 text-xs font-mono-tabular border cursor-pointer ${
                              settings.fogEffects
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#18181d] text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {settings.fogEffects ? 'Ativada' : 'Desativada'}
                          </button>
                        </div>
                      </div>

                      {/* SOM */}
                      <div className="space-y-4">
                        <div className="text-xs font-mono-tabular uppercase tracking-wider text-zinc-400">
                          Áudio e Som
                        </div>

                        <div className="bg-[#111115] border border-zinc-800 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white">Volume Geral</span>
                            <span className="text-xs font-mono-tabular text-zinc-200 font-bold">
                              {settings.muted ? '0% (Silenciado)' : `${Math.round(settings.masterVolume * 100)}%`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={Math.round(settings.masterVolume * 100)}
                            onChange={(e) => {
                              const nextVol = Number(e.target.value) / 100;
                              setSettings((prev) => ({
                                ...prev,
                                masterVolume: nextVol,
                                muted: nextVol === 0 ? true : prev.muted,
                              }));
                            }}
                            aria-label="Volume Geral"
                            className="w-full accent-[#f2f2f6] cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] font-mono-tabular text-zinc-500 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-[#111115] border border-zinc-800 px-3.5 py-2.5">
                          <div>
                            <div className="text-xs font-bold text-white">Áudio do Jogo</div>
                            <div className="text-[11px] font-mono-tabular text-zinc-500">
                              Efeitos dos trens, carvão e passos
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({ ...prev, muted: !prev.muted }))
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tabular border cursor-pointer ${
                              !settings.muted
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#18181d] text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {settings.muted ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Silenciado</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Ativado</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-[#111115] border border-zinc-800 px-3.5 py-2.5">
                          <div>
                            <div className="text-xs font-bold text-white">Música de Fundo</div>
                            <div className="text-[11px] font-mono-tabular text-zinc-500">
                              Trilha sombria no lobby e durante as fases
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              engineRef.current?.sound.unlock();
                              setSettings((prev) => ({
                                ...prev,
                                musicEnabled: !prev.musicEnabled,
                              }));
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tabular border cursor-pointer ${
                              settings.musicEnabled
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#18181d] text-zinc-400 border-zinc-700'
                            }`}
                          >
                            <Music className="w-3.5 h-3.5" />
                            <span>{settings.musicEnabled ? 'Ativada' : 'Desativada'}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-[#111115] border border-zinc-800 px-3.5 py-2.5">
                          <div>
                            <div className="text-xs font-bold text-white">Controles na Tela</div>
                            <div className="text-[11px] font-mono-tabular text-zinc-500">
                              Analógico e botões virtuais para celular
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsTouchUi((v) => !v)}
                            className={`px-3 py-1.5 text-xs font-mono-tabular border cursor-pointer ${
                              isTouchUi
                                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                                : 'bg-[#18181d] text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {isTouchUi ? 'Ativados' : 'Desativados'}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => engineRef.current?.sound.playCoinPickup()}
                          className="w-full py-2.5 border border-zinc-700 bg-[#141419] text-xs font-display uppercase tracking-wider text-zinc-200 hover:border-zinc-400 hover:text-white cursor-pointer"
                        >
                          Testar Som
                        </button>
                      </div>
                    </div>
                    )}
                  </div>
                )}
          </div>

          <footer className="relative z-10 px-6 sm:px-12 pb-5 pt-2">
            <p className="text-xs text-zinc-500 tracking-wide font-mono-tabular">
              WASD / Analógico Mover · Espaço / A Saltar · E / Clique / X Carvão · R / Y Habilidade · Q-C Câmera
            </p>
          </footer>
        </section>
      )}

      {/* IN-GAME HUD */}
      {hud.gameState === 'PLAYING' && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
          <div
            className="fixed inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: hud.smokeLevel * 0.85,
              background:
                'radial-gradient(circle at center, transparent 36%, rgba(8,8,10,0.72) 72%, rgba(5,5,7,0.96) 100%)',
            }}
            aria-hidden="true"
          />

          {hud.timeStopRemaining > 0 && (
            <div
              className="fixed inset-0 pointer-events-none border-4 border-zinc-200/80 mix-blend-difference bg-white/10"
              aria-hidden="true"
            />
          )}

          {hud.flashOpacity > 0 && (
            <div
              className="fixed inset-0 z-30 pointer-events-none bg-white transition-opacity duration-75 ease-linear"
              style={{ opacity: hud.flashOpacity }}
              aria-hidden="true"
            />
          )}

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 bg-[#09090b]/90 border border-zinc-800 px-3 py-1.5">
                <div className="flex items-center gap-1">
                  {hud.monkeyStatuses.map((alive, idx) => (
                    <MonkeyIcon key={idx} alive={alive} />
                  ))}
                </div>
                <div className="h-4 w-px bg-zinc-800" aria-hidden="true" />
                <div className="text-xs text-zinc-300 font-mono-tabular whitespace-nowrap">
                  Vivos <strong className="text-white">{hud.monkeysAlive}/3</strong>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-[#09090b]/90 border border-zinc-800 px-3 py-1 w-fit">
                <span className="font-display text-xl font-bold leading-none text-white w-6 text-center">
                  {hud.liveRank}
                </span>
                <div className="h-4 w-px bg-zinc-800" aria-hidden="true" />
                <span className="text-xs text-zinc-200 font-mono-tabular whitespace-nowrap">
                  {hud.currentSpeed} km/h
                </span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
                  Fumaça {Math.round(hud.smokeLevel * 100)}%
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-3 bg-[#09090b]/90 border border-zinc-800 px-4 py-1.5">
                <CoalIcon />
                <span className="text-sm font-medium text-zinc-100 font-mono-tabular whitespace-nowrap">
                  Carvão {hud.coalDestroyed}/{hud.coalTotal}
                </span>
                <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">·</span>
                <span className="hidden sm:inline text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
                  {formatTime(hud.elapsedSeconds)}
                </span>
              </div>

              <div className="text-[11px] font-mono-tabular text-zinc-300 bg-[#09090b]/85 border border-zinc-800 px-3 py-0.5 whitespace-nowrap">
                {hud.isOnline ? 'Online · ' : ''}Fase {hud.stageIndex + 1}/{hud.stageTotal} ·{' '}
                {hud.trainLabel}
              </div>

              {hud.timeStopRemaining > 0 && (
                <div className="bg-[#f4f4f8] text-[#08080a] px-4 py-1 text-xs font-bold tracking-wider uppercase font-mono-tabular">
                  Tempo Parado · {hud.timeStopRemaining.toFixed(1)}s
                </div>
              )}

              {hud.spectating && (
                <div className="bg-[#141418] border border-zinc-600 text-zinc-200 px-4 py-1 text-xs font-mono-tabular">
                  Você caiu — Observando sobreviventes até o fim da rodada
                </div>
              )}

              {hud.isStoppingClimax && (
                <div className="bg-[#f4f4f8] text-[#08080a] px-4 py-1 text-xs font-bold tracking-wide uppercase">
                  Carvão esgotado — O trem está parando
                </div>
              )}

              {hud.slowed && (
                <div className="bg-amber-950/90 border border-amber-500/70 text-amber-100 px-3.5 py-1 text-xs font-mono-tabular uppercase tracking-wider">
                  Trem Sísmico · Lerdeza no chão (Salte!)
                </div>
              )}

              {!hud.slowed && hud.quakeActive && (
                <div className="bg-[#0b0b0e]/90 border border-zinc-400 text-zinc-100 px-3.5 py-1 text-xs font-mono-tabular uppercase tracking-wider">
                  Trem Sísmico · Imune no ar
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
              <div className="flex items-center gap-1.5 bg-[#09090b]/90 border border-zinc-700 px-2.5 sm:px-3 h-10 text-xs font-mono-tabular text-white">
                <Coins className="w-4 h-4 text-zinc-300" />
                <span className="font-bold">+{hud.coinsRun}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTouchUi((v) => !v)}
                className={`px-2.5 h-10 border text-[11px] font-mono-tabular cursor-pointer ${
                  isTouchUi
                    ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                    : 'bg-[#09090b]/95 text-zinc-300 border-zinc-700'
                }`}
              >
                Toque
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, muted: !prev.muted }))}
                aria-label={hud.muted ? 'Ativar som' : 'Silenciar som'}
                className="flex items-center justify-center w-10 h-10 bg-[#09090b]/95 border border-zinc-700 text-zinc-200 hover:border-zinc-300 hover:text-white cursor-pointer"
              >
                {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              {!hud.isOnline ? (
                <button
                  type="button"
                  onClick={() => engineRef.current?.pauseGame()}
                  aria-label="Pausar jogo"
                  className="flex items-center justify-center w-10 h-10 bg-[#09090b]/95 border border-zinc-700 text-zinc-200 hover:border-zinc-300 hover:text-white cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onlineClientRef.current?.leaveRoom();
                    engineRef.current?.returnToTitle();
                  }}
                  className="px-3 h-10 bg-[#09090b]/95 border border-zinc-700 text-xs font-mono-tabular text-zinc-200 hover:border-zinc-300 hover:text-white cursor-pointer"
                >
                  Sair
                </button>
              )}
            </div>
          </div>

          <div className="relative flex items-end justify-between gap-3 pb-2">
            {!isTouchUi ? (
              <button
                type="button"
                onClick={() => engineRef.current?.triggerAbility()}
                className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2 border text-left transition-colors cursor-pointer ${
                  hud.abilityCooldown <= 0
                    ? 'bg-[#0b0b0e]/95 border-zinc-300 text-white hover:bg-[#18181f]'
                    : 'bg-[#09090b]/85 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="text-xs font-mono-tabular font-bold border border-zinc-600 px-1.5 py-0.5 text-zinc-200">
                  R / Y
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">{equippedAbilityDef.name}</div>
                  <div className="text-[11px] font-mono-tabular">
                    {hud.abilityCooldown > 0
                      ? `Recarga ${hud.abilityCooldown.toFixed(1)}s`
                      : 'Pronta'}
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-4" />
            )}

            <div className="flex flex-col items-center gap-1.5 mx-auto">
              {hud.isSliding && (
                <span className="text-xs font-mono-tabular uppercase text-white bg-[#09090b]/90 border border-zinc-300 px-3 py-1">
                  Deslize Turbinado!
                </span>
              )}
              {hud.coalBlinkRemaining > 0 && (
                <span className="text-xs font-mono-tabular uppercase text-red-300 bg-[#190808]/95 border border-red-500/70 px-3 py-1">
                  Carvão Sinalizado ({hud.coalBlinkRemaining.toFixed(1)}s)
                </span>
              )}
              {hud.shieldActive && (
                <span className="text-xs font-mono-tabular uppercase text-white bg-[#09090b]/90 border border-zinc-400 px-3 py-1">
                  Escudo de Ferro Ativo
                </span>
              )}
              {hud.nearSupport && !isTouchUi && (
                <span className="text-xs text-zinc-100 bg-[#09090b]/90 border border-zinc-700 px-3 py-1 font-mono-tabular">
                  Espaço / A — Saltar no Apoio
                </span>
              )}
              {hud.nearCoal && !hud.isStoppingClimax && !isTouchUi && (
                <span className="text-xs text-zinc-100 bg-[#09090b]/90 border border-zinc-700 px-3 py-1 font-mono-tabular">
                  {hud.nearArmoredCoal
                    ? 'E / Clique / X — Quebrar Carvão Blindado (1.8x)'
                    : 'E / Clique / X — Quebrar Carvão'}
                </span>
              )}
            </div>

            {!isTouchUi ? <div className="w-24 hidden sm:block" /> : <div className="w-4" />}
          </div>

          {isTouchUi && (
            <div className="fixed inset-0 z-20 pointer-events-none touch-none">
              {/* Custom Positioned Virtual Analog Stick */}
              <div
                onPointerDown={handleStickDown}
                onPointerMove={handleStickMove}
                onPointerUp={handleStickUp}
                onPointerCancel={handleStickUp}
                style={{
                  left: `${settings.mobileHudLayout.joystick.xPct}%`,
                  top: `${settings.mobileHudLayout.joystick.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${settings.mobileHudLayout.joystick.scale})`,
                }}
                className="pointer-events-auto absolute w-28 h-28 rounded-full border-2 border-zinc-400/75 bg-[#09090b]/65 touch-none flex items-center justify-center"
                aria-label="Analógico virtual"
              >
                <div
                  style={{ transform: `translate(${stickKnob.x}px, ${stickKnob.y}px)` }}
                  className="w-11 h-11 rounded-full bg-[#ededf2] border-2 border-[#08080a] pointer-events-none"
                />
              </div>

              {/* Custom Positioned Ability Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  engineRef.current?.triggerAbility();
                }}
                style={{
                  left: `${settings.mobileHudLayout.ability.xPct}%`,
                  top: `${settings.mobileHudLayout.ability.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${settings.mobileHudLayout.ability.scale})`,
                }}
                className={`pointer-events-auto absolute min-h-[44px] px-3.5 py-2 border text-xs font-display uppercase font-bold tracking-wider whitespace-nowrap touch-none ${
                  hud.abilityCooldown <= 0
                    ? 'bg-[#17171f]/90 border-zinc-300 text-white'
                    : 'bg-[#09090b]/85 border-zinc-800 text-zinc-500'
                }`}
              >
                {hud.abilityCooldown > 0
                  ? `Poder ${hud.abilityCooldown.toFixed(1)}s`
                  : equippedAbilityDef.name}
              </button>

              {/* Custom Positioned Coal Smash Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  engineRef.current?.triggerAttack();
                }}
                style={{
                  left: `${settings.mobileHudLayout.coal.xPct}%`,
                  top: `${settings.mobileHudLayout.coal.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${settings.mobileHudLayout.coal.scale})`,
                }}
                className={`pointer-events-auto absolute w-20 h-14 border-2 font-display uppercase font-bold text-sm tracking-wider touch-none ${
                  hud.nearCoal
                    ? 'bg-[#f2f2f6] text-[#08080a] border-white'
                    : 'bg-[#121216]/85 text-zinc-100 border-zinc-500'
                }`}
              >
                {hud.nearArmoredCoal ? 'Blindado' : 'Carvão'}
              </button>

              {/* Custom Positioned Jump / Vault Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  engineRef.current?.triggerJump();
                }}
                style={{
                  left: `${settings.mobileHudLayout.jump.xPct}%`,
                  top: `${settings.mobileHudLayout.jump.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${settings.mobileHudLayout.jump.scale})`,
                }}
                className={`pointer-events-auto absolute w-20 h-14 border-2 font-display uppercase font-bold text-sm tracking-wider touch-none ${
                  hud.nearSupport
                    ? 'bg-[#f2f2f6] text-[#08080a] border-white'
                    : 'bg-[#121216]/85 text-zinc-100 border-zinc-400'
                }`}
              >
                Saltar
              </button>
            </div>
          )}
        </div>
      )}

      {/* PAUSE MODAL */}
      {hud.gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#101013] border border-zinc-700 p-8 text-center">
            <h2 className="font-display text-4xl font-bold tracking-wide uppercase text-white mb-1">
              Jogo Pausado
            </h2>
            <p className="text-xs font-mono-tabular text-zinc-400 mb-6">
              Fase {hud.stageIndex + 1}/{hud.stageTotal} · {hud.stageName}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-7 text-left border-y border-zinc-800 py-4 font-mono-tabular text-sm">
              <div className="text-zinc-400">Carvão destruído</div>
              <div className="text-right text-white font-bold">
                {hud.coalDestroyed}/{hud.coalTotal}
              </div>
              <div className="text-zinc-400">Macacos vivos</div>
              <div className="text-right text-white font-bold">{hud.monkeysAlive}/3</div>
              <div className="text-zinc-400">Moedas na fase</div>
              <div className="text-right text-white font-bold">+{hud.coinsRun}</div>
              <div className="text-zinc-400">Tempo</div>
              <div className="text-right text-white font-bold">{formatTime(hud.elapsedSeconds)}</div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => engineRef.current?.resumeGame()}
                className="w-full min-h-[46px] px-6 py-2.5 bg-[#f2f2f6] text-[#08080a] font-display text-lg font-bold uppercase tracking-wider hover:bg-white cursor-pointer"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.startGame(hud.stageIndex)}
                className="w-full min-h-[46px] px-6 py-2.5 border border-zinc-700 bg-[#16161a] text-zinc-200 font-display text-lg uppercase tracking-wider hover:border-zinc-400 hover:text-white cursor-pointer"
              >
                Reiniciar Fase
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.returnToTitle()}
                className="w-full min-h-[42px] px-6 py-2 text-sm text-zinc-400 hover:text-white cursor-pointer"
              >
                Menu Inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE CLEAR / VICTORY / GAME OVER MODAL + PRIZE CRATE */}
      {(hud.gameState === 'STAGE_CLEAR' ||
        hud.gameState === 'VICTORY' ||
        hud.gameState === 'GAME_OVER') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/86 p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#101013] border border-zinc-600 p-7 text-center">
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-zinc-400 mb-1.5">
              Fase {hud.stageIndex + 1}/{hud.stageTotal} · {hud.stageName}
            </p>
            <h2 className="font-display text-4xl font-bold tracking-wide uppercase text-white mb-2">
              {hud.gameState === 'GAME_OVER'
                ? 'Esmagados nos Trilhos'
                : hud.gameState === 'VICTORY'
                ? 'Fim da Linha Eterna'
                : hud.stageIsBoss
                ? 'Boss Derrotado'
                : 'Trem Parado'}
            </h2>
            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              {hud.gameState === 'GAME_OVER'
                ? 'Todos os macacos foram alcançados antes que o carvão acabasse.'
                : `${hud.trainLabel} ficou sem combustível e parou sobre os trilhos.`}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#09090b] border border-zinc-800 px-4 py-3 text-left flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono-tabular uppercase text-zinc-400">Rank</div>
                  <div className="text-xs font-mono-tabular text-zinc-300">
                    {hud.avgSpeed} km/h
                  </div>
                </div>
                <div className="font-display text-4xl font-bold text-white leading-none">
                  {hud.finalRank}
                </div>
              </div>

              <div className="bg-[#09090b] border border-zinc-800 px-4 py-3 text-left flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono-tabular uppercase text-zinc-400">Moedas</div>
                  <div className="text-xs font-mono-tabular text-zinc-300">
                    Total {profile.coins}
                  </div>
                </div>
                <div className="font-mono-tabular text-xl font-bold text-white">
                  +{hud.coinsRun + stageBonusCoins}
                </div>
              </div>
            </div>

            {(hud.gameState === 'STAGE_CLEAR' || hud.gameState === 'VICTORY') && (
              <PrizeCrateCard
                crateOpened={crateOpened}
                crateReward={crateReward}
                isEquipped={Boolean(
                  crateReward &&
                    (crateReward.item.slot === 'head'
                      ? profile.equippedCosmetics.head === crateReward.item.id
                      : profile.equippedCosmetics.back === crateReward.item.id)
                )}
                onRollCrate={handleOpenCrate}
                onShakeTick={() => engineRef.current?.sound.playCrateShake()}
                onEquipReward={() => {
                  if (crateReward) {
                    handleEquipCosmetic(crateReward.item.slot, crateReward.item.id);
                  }
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-2.5 mb-5 text-left border-y border-zinc-800 py-3 font-mono-tabular text-xs">
              <div className="text-zinc-400">Fontes de Carvão</div>
              <div className="text-right text-white font-bold">
                {hud.coalDestroyed}/{hud.coalTotal}
              </div>
              <div className="text-zinc-400">Tempo da Fase</div>
              <div className="text-right text-white font-bold">{formatRecordTime(hud.elapsedSeconds)}</div>
            </div>

            <div className="flex flex-col gap-2.5">
              {hud.isOnline ? (
                <button
                  type="button"
                  onClick={() => {
                    setLobbyTab('ONLINE');
                    engineRef.current?.returnToTitle();
                  }}
                  className="w-full min-h-[46px] px-6 py-2.5 bg-[#f2f2f6] text-[#08080a] font-display text-lg font-bold uppercase tracking-wider hover:bg-white cursor-pointer"
                >
                  Voltar à Sala Online
                </button>
              ) : hud.gameState === 'STAGE_CLEAR' ? (
                <button
                  type="button"
                  onClick={() => engineRef.current?.nextStage()}
                  className="w-full inline-flex items-center justify-center gap-2.5 min-h-[48px] px-6 py-3 bg-[#f2f2f6] text-[#08080a] font-display text-xl font-bold uppercase tracking-wider hover:bg-white cursor-pointer"
                >
                  <span>Próxima Fase</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    engineRef.current?.startGame(hud.gameState === 'GAME_OVER' ? hud.stageIndex : 0)
                  }
                  className="w-full inline-flex items-center justify-center gap-2.5 min-h-[48px] px-6 py-3 bg-[#f2f2f6] text-[#08080a] font-display text-xl font-bold uppercase tracking-wider hover:bg-white cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>
                    {hud.gameState === 'GAME_OVER' ? 'Tentar Fase Novamente' : 'Jogar Novamente'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (hud.isOnline) onlineClientRef.current?.leaveRoom();
                  engineRef.current?.returnToTitle();
                }}
                className="w-full min-h-[40px] px-6 py-2 text-sm text-zinc-400 hover:text-white cursor-pointer"
              >
                Lobby Principal
              </button>
            </div>
          </div>
        </div>
      )}
      <OfflineIndicator />
    </main>
  );
}

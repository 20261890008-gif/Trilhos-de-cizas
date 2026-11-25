export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'VICTORY'
  | 'GAME_OVER';

export type SpeedRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'S+';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type MobileHudControlId = 'joystick' | 'jump' | 'coal' | 'ability';

export interface MobileHudControlPos {
  xPct: number;
  yPct: number;
  scale: number;
}

export type MobileHudLayout = Record<MobileHudControlId, MobileHudControlPos>;

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  shadows: boolean;
  fogEffects: boolean;
  resolutionScale: number;
  masterVolume: number;
  muted: boolean;
  musicEnabled: boolean;
  mobileHudLayout: MobileHudLayout;
}

export type TrainVariant =
  | 'classic'
  | 'armored_boss'
  | 'ripper'
  | 'serpent'
  | 'carcara_boss'
  | 'leviathan_boss'
  | 'furnace_boss'
  | 'drill_boss'
  | 'hammer_boss'
  | 'anvil_boss'
  | 'bunker_boss'
  | 'reaper_boss'
  | 'cathedral_boss'
  | 'hydra_boss'
  | 'sovereign_boss'
  | 'eternal_boss'
  | 'glacier_boss'
  | 'pendulum_boss'
  | 'magma_boss'
  | 'spider_boss'
  | 'obelisk_boss'
  | 'turbine_boss'
  | 'scorpion_boss'
  | 'prism_boss'
  | 'colossus_boss'
  | 'bell_boss'
  | 'sawmill_boss'
  | 'void_boss'
  | 'centipede_boss'
  | 'bastion_boss'
  | 'omega_boss';

export type TrainBehavior = 'straight' | 'curving' | 'phantom_dash';

export type SpecialTrainKind = 'normal' | 'quake' | 'flash';

export type StageTheme =
  | 'leviathan_sea'
  | 'forest_ash'
  | 'industrial_furnace'
  | 'quarry_canyon'
  | 'station_ruins'
  | 'cathedral_shadow'
  | 'mining_cave'
  | 'sawmill_yard'
  | 'viaduct_bridge'
  | 'collapsed_tunnel'
  | 'bunker_fortress'
  | 'shipyard_grave'
  | 'chalk_void'
  | 'clockwork_foundry'
  | 'salt_flats'
  | 'iron_forest'
  | 'slag_volcano'
  | 'glacier_rail'
  | 'bone_viaduct';

export type AbilityId =
  | 'dash_basic'
  | 'double_jump'
  | 'iron_shield'
  | 'seismic_smash'
  | 'coal_beacon'
  | 'time_stop'
  | 'slide_boost';

export type HeadCosmeticId = 'none' | string;

export type BackCosmeticId = 'none' | string;

export interface EquippedCosmetics {
  head: HeadCosmeticId;
  back: BackCosmeticId;
}

export interface StageConfig {
  id: number;
  name: string;
  subtitle: string;
  theme: StageTheme;
  isBoss: boolean;
  coalCount: number;
  supportCount: number;
  trainVariant: TrainVariant;
  trainLabel: string;
  trainBehaviors: TrainBehavior[];
  curveStrength: number;
  fogColor: number;
  fogDensity: number;
  bgColor: number;
  keyLightIntensity: number;
  hemiIntensity: number;
  groundBaseShade: number;
  terrainAmplitude: number;
  baseSpawnInterval: number;
  minSpawnInterval: number;
  baseDelay: number;
  minDelay: number;
  baseTrainSpeed: number;
}

export interface HudSnapshot {
  gameState: GameState;
  isOnline: boolean;
  spectating: boolean;
  stageIndex: number;
  stageTotal: number;
  stageName: string;
  stageIsBoss: boolean;
  trainLabel: string;
  monkeysAlive: number;
  monkeyStatuses: boolean[];
  monkeyNames: string[];
  coalDestroyed: number;
  coalTotal: number;
  currentDelay: number;
  currentInterval: number;
  elapsedSeconds: number;
  vaultsUsed: number;
  currentSpeed: number;
  avgSpeed: number;
  peakSpeed: number;
  liveRank: SpeedRank;
  finalRank: SpeedRank;
  boostActive: boolean;
  isSliding: boolean;
  coalBlinkRemaining: number;
  nearSupport: boolean;
  nearCoal: boolean;
  nearArmoredCoal: boolean;
  isStoppingClimax: boolean;
  muted: boolean;
  dangerWarning: boolean;
  gamepadConnected: boolean;
  coinsRun: number;
  equippedAbility: AbilityId;
  abilityCooldown: number;
  abilityMaxCooldown: number;
  abilityActiveTimer: number;
  timeStopRemaining: number;
  shieldActive: boolean;
  smokeLevel: number;
  slowed: boolean;
  quakeActive: boolean;
  flashOpacity: number;
  runResultNonce: number;
}

export interface RoomPlayerInfo {
  playerId: string;
  slot: number;
  name: string;
  ready: boolean;
  alive: boolean;
  cosmetics: EquippedCosmetics;
  abilityId: AbilityId;
}

export interface OnlineRoomSummary {
  roomId: string;
  name: string;
  stageIndex: number;
  status: 'LOBBY' | 'PLAYING';
  playerCount: number;
  maxPlayers: number;
  hostName: string;
}

export interface OnlineRoomState {
  roomId: string;
  name: string;
  stageIndex: number;
  status: 'LOBBY' | 'PLAYING';
  hostId: string;
  players: RoomPlayerInfo[];
}

export interface LeaderboardEntry {
  id: string;
  userId?: string;
  playerName: string;
  playerNickname?: string;
  stageId: number;
  stageName: string;
  elapsedSeconds: number;
  avgSpeedKmh: number;
  peakSpeedKmh: number;
  rank: SpeedRank;
  mode: 'SOLO' | 'ONLINE';
  weekKey?: string;
  createdAt: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  weekKey: string;
  weekStartsAt: string;
  weekEndsAt: string;
  nextResetInMs: number;
}

export interface NetTrackSpawn {
  id: number;
  anchorX: number;
  anchorZ: number;
  angle: number;
  curvature: number;
  behavior: TrainBehavior;
  telegraphDelay: number;
  trainSpeed: number;
  isDying: boolean;
  specialKind?: SpecialTrainKind;
  isRedShift?: boolean;
  shiftDeltaYaw?: number;
  shiftPivotS?: number;
}

export interface NetPlayerKinematics {
  slot: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  armPhase: number;
  boostTimer: number;
  attackTimer: number;
  slideTimer?: number;
  shieldActive: boolean;
  alive: boolean;
}

export interface NetCoinSpawn {
  id: number;
  x: number;
  y: number;
  z: number;
  value: number;
}

export interface AuthUser {
  userId: string;
  nickname: string;
  displayName: string;
  coins: number;
  unlockedAbilities: AbilityId[];
  equippedAbility: AbilityId;
  unlockedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
}

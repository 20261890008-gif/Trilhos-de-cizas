import { COSMETICS, type CosmeticItemDef } from './cosmeticsCatalog';
import {
  AbilityId,
  EquippedCosmetics,
  SpeedRank,
} from './types';

export { COSMETICS, type CosmeticItemDef };

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  cost: number;
  cooldown: number;
  duration: number;
  starter?: boolean;
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'dash_basic',
    name: 'Impulso de Cinza',
    description: 'Avanço rápido horizontal com pequeno salto para escapar dos trilhos.',
    cost: 0,
    cooldown: 4.5,
    duration: 0.45,
    starter: true,
  },
  {
    id: 'double_jump',
    name: 'Salto Duplo Aéreo',
    description: 'Executa um segundo salto alto no meio do ar com ganho de velocidade.',
    cost: 450,
    cooldown: 4.0,
    duration: 0.9,
  },
  {
    id: 'iron_shield',
    name: 'Escudo de Ferro',
    description: 'Blindagem sombria por 4 segundos que absorve um impacto direto do trem.',
    cost: 850,
    cooldown: 14.0,
    duration: 4.0,
  },
  {
    id: 'seismic_smash',
    name: 'Golpe Sísmico',
    description: 'Impacto no chão que causa dano massivo ao carvão ao redor e atrai moedas.',
    cost: 1350,
    cooldown: 8.5,
    duration: 0.6,
  },
  {
    id: 'coal_beacon',
    name: 'Sinalizador de Carvão',
    description: 'Faz todos os carrinhos de carvão piscarem em vermelho vivo por 2 segundos.',
    cost: 2000,
    cooldown: 9.5,
    duration: 2.0,
  },
  {
    id: 'time_stop',
    name: 'Parar o Tempo (3s)',
    description: 'Congela todos os trens, trilhos e contadores por 3 segundos enquanto você corre livre.',
    cost: 2500,
    cooldown: 22.0,
    duration: 3.0,
  },
  {
    id: 'slide_boost',
    name: 'Deslize Turbinado',
    description: 'O grupo de macacos dá um grande impulso e desliza pelo chão diminuindo a velocidade gradualmente.',
    cost: 3000,
    cooldown: 7.0,
    duration: 1.7,
  },
];

export interface PlayerProfile {
  playerName: string;
  coins: number;
  unlockedAbilities: AbilityId[];
  equippedAbility: AbilityId;
  unlockedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
}

const STORAGE_KEY = 'trilhos_de_cinza_profile_v2';

export function getDefaultProfile(): PlayerProfile {
  return {
    playerName: `Macaco-${Math.floor(100 + Math.random() * 899)}`,
    coins: 0,
    unlockedAbilities: ['dash_basic'],
    equippedAbility: 'dash_basic',
    unlockedCosmetics: [],
    equippedCosmetics: { head: 'none', back: 'none' },
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = getDefaultProfile();
      saveProfile(def);
      return def;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const unlockedAbilities = Array.isArray(parsed.unlockedAbilities)
      ? Array.from(new Set<AbilityId>(['dash_basic', ...(parsed.unlockedAbilities as AbilityId[])]))
      : (['dash_basic'] as AbilityId[]);

    const equippedAbility = unlockedAbilities.includes(parsed.equippedAbility as AbilityId)
      ? (parsed.equippedAbility as AbilityId)
      : 'dash_basic';

    const unlockedCosmetics = Array.isArray(parsed.unlockedCosmetics)
      ? parsed.unlockedCosmetics.filter((id) => COSMETICS.some((c) => c.id === id))
      : [];

    const head =
      parsed.equippedCosmetics?.head &&
      (parsed.equippedCosmetics.head === 'none' ||
        unlockedCosmetics.includes(parsed.equippedCosmetics.head))
        ? parsed.equippedCosmetics.head
        : 'none';
    const back =
      parsed.equippedCosmetics?.back &&
      (parsed.equippedCosmetics.back === 'none' ||
        unlockedCosmetics.includes(parsed.equippedCosmetics.back))
        ? parsed.equippedCosmetics.back
        : 'none';

    return {
      playerName:
        typeof parsed.playerName === 'string' && parsed.playerName.trim().length >= 2
          ? parsed.playerName.trim().slice(0, 18)
          : `Macaco-${Math.floor(100 + Math.random() * 899)}`,
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? Math.floor(parsed.coins) : 0,
      unlockedAbilities,
      equippedAbility,
      unlockedCosmetics,
      equippedCosmetics: { head, back },
    };
  } catch {
    return getDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota issues
  }
}

export function getAbilityDef(id: AbilityId): AbilityDef {
  return ABILITIES.find((a) => a.id === id) || ABILITIES[0];
}

export function computeStageClearCoinBonus(stageIndex: number, isBoss: boolean, rank: SpeedRank): number {
  const rankBonus: Record<SpeedRank, number> = {
    D: 15,
    C: 30,
    B: 45,
    A: 65,
    S: 90,
    'S+': 125,
  };
  return 45 + stageIndex * 20 + (isBoss ? 40 : 0) + (rankBonus[rank] || 20);
}

export interface CrateRewardResult {
  item: CosmeticItemDef;
  isDuplicate: boolean;
  bonusCoins: number;
}

export function rollPrizeCrate(profile: PlayerProfile): {
  nextProfile: PlayerProfile;
  reward: CrateRewardResult;
} {
  const locked = COSMETICS.filter((c) => !profile.unlockedCosmetics.includes(c.id));
  const pool = locked.length > 0 && Math.random() < 0.85 ? locked : COSMETICS;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const alreadyOwned = profile.unlockedCosmetics.includes(item.id);
  const bonusCoins = alreadyOwned ? (item.rarity === 'Lendário' ? 95 : item.rarity === 'Raro' ? 65 : 45) : 0;

  const nextUnlocked = alreadyOwned
    ? profile.unlockedCosmetics
    : [...profile.unlockedCosmetics, item.id];

  const nextProfile: PlayerProfile = {
    ...profile,
    coins: profile.coins + bonusCoins,
    unlockedCosmetics: nextUnlocked,
  };
  saveProfile(nextProfile);
  return {
    nextProfile,
    reward: {
      item,
      isDuplicate: alreadyOwned,
      bonusCoins,
    },
  };
}

import { useEffect, useRef, useState } from 'react';
import { Check, Gift, Sparkles } from 'lucide-react';
import { CrateRewardResult } from '../game/progression';

interface PrizeCrateCardProps {
  crateOpened: boolean;
  crateReward: CrateRewardResult | null;
  isEquipped: boolean;
  onRollCrate: () => void;
  onShakeTick: () => void;
  onEquipReward: () => void;
}

type CrateAnimPhase = 'idle' | 'shaking' | 'burst' | 'revealed';

export function PrizeCrateCard({
  crateOpened,
  crateReward,
  isEquipped,
  onRollCrate,
  onShakeTick,
  onEquipReward,
}: PrizeCrateCardProps) {
  const [phase, setPhase] = useState<CrateAnimPhase>(crateOpened ? 'revealed' : 'idle');
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!crateOpened) {
      setPhase('idle');
    }
  }, [crateOpened]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const handleTriggerOpen = () => {
    if (phase !== 'idle' || crateOpened) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      onRollCrate();
      setPhase('revealed');
      return;
    }

    setPhase('shaking');
    onShakeTick();

    const t1 = window.setTimeout(onShakeTick, 190);
    const t2 = window.setTimeout(onShakeTick, 380);
    const t3 = window.setTimeout(onShakeTick, 560);
    const tBurst = window.setTimeout(() => {
      setPhase('burst');
      onRollCrate();
    }, 740);
    const tReveal = window.setTimeout(() => {
      setPhase('revealed');
    }, 1140);

    timersRef.current = [t1, t2, t3, tBurst, tReveal];
  };

  if (phase === 'revealed' && crateReward) {
    return (
      <div className="mb-5 border border-zinc-400 bg-[#0b0b10] p-4 animate-crate-reveal">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-300 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>
            {crateReward.item.rarity} ·{' '}
            {crateReward.item.slot === 'head' ? 'Cabeça' : 'Costas'}
          </span>
        </div>
        <div className="font-display text-2xl font-bold text-white uppercase tracking-wide">
          {crateReward.item.name}
        </div>
        <p className="text-xs text-zinc-400 mt-1">{crateReward.item.description}</p>
        <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono-tabular text-zinc-300">
            {crateReward.isDuplicate
              ? `Item repetido · +${crateReward.bonusCoins} moedas`
              : 'Desbloqueado no Vestiário!'}
          </span>
          {!crateReward.isDuplicate && (
            <button
              type="button"
              onClick={onEquipReward}
              disabled={isEquipped}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-display uppercase font-bold tracking-wider border transition-colors ${
                isEquipped
                  ? 'bg-[#191920] border-zinc-600 text-zinc-300 cursor-default'
                  : 'bg-[#f2f2f6] border-[#f2f2f6] text-[#08080a] hover:bg-white cursor-pointer'
              }`}
            >
              {isEquipped && <Check className="w-3.5 h-3.5" />}
              <span>{isEquipped ? 'Equipado' : 'Equipar Agora'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 border border-zinc-700 bg-[#0b0b0e] p-4 overflow-hidden relative">
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-24 h-24 flex items-center justify-center mb-3">
          {phase === 'burst' && (
            <div
              className="absolute inset-0 rounded-full bg-white/30 pointer-events-none animate-crate-flash"
              aria-hidden="true"
            />
          )}

          {/* Animated Iron Supply Crate SVG */}
          <svg
            viewBox="0 0 96 96"
            className={`w-22 h-22 ${phase === 'shaking' ? 'animate-crate-shake' : ''}`}
            aria-hidden="true"
          >
            {/* Crate base body */}
            <rect
              x="16"
              y="38"
              width="64"
              height="44"
              fill="#14141a"
              stroke={phase === 'shaking' || phase === 'burst' ? '#ffffff' : '#a1a1aa'}
              strokeWidth="2.5"
            />
            {/* Cross braces */}
            <line x1="16" y1="38" x2="80" y2="82" stroke="#3f3f46" strokeWidth="2.5" />
            <line x1="80" y1="38" x2="16" y2="82" stroke="#3f3f46" strokeWidth="2.5" />
            <rect x="42" y="40" width="12" height="10" fill="#e4e4ec" />

            {/* Light seam glow when shaking / bursting */}
            {(phase === 'shaking' || phase === 'burst') && (
              <rect x="14" y="34" width="68" height="6" fill="#ffffff" opacity="0.85" />
            )}

            {/* Crate lid */}
            <g className={phase === 'burst' ? 'animate-crate-lid-burst' : ''}>
              <rect
                x="12"
                y="24"
                width="72"
                height="15"
                fill="#1d1d24"
                stroke="#f4f4f6"
                strokeWidth="2.5"
              />
              <rect x="38" y="20" width="20" height="6" fill="#e4e4ec" />
            </g>
          </svg>
        </div>

        {phase === 'idle' ? (
          <button
            type="button"
            onClick={handleTriggerOpen}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-[#f2f2f6] border border-[#f2f2f6] text-[#08080a] hover:bg-white transition-colors cursor-pointer"
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span className="font-display uppercase tracking-wider font-bold text-sm">
              Abrir Caixa de Prêmio do Vestiário
            </span>
          </button>
        ) : (
          <div className="py-2 text-xs font-mono-tabular uppercase tracking-widest text-white">
            {phase === 'shaking' ? 'Destravando caixa de ferro...' : 'Revelando item...'}
          </div>
        )}
      </div>
    </div>
  );
}

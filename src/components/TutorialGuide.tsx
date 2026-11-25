import { useState } from 'react';
import { Volume2 } from 'lucide-react';

export type TutorialTopicId = 'coal' | 'boost' | 'trains';

interface TutorialGuideProps {
  compact?: boolean;
  onPlayTrainSound?: (kind: 'normal' | 'quake' | 'flash') => void;
  onOpenFullTutorials?: () => void;
}

function CoalDiagram() {
  return (
    <svg
      viewBox="0 0 180 96"
      className="w-full h-24 bg-[#070709] border border-zinc-800/90"
      aria-hidden="true"
    >
      {/* Minecart track line */}
      <line x1="16" y1="80" x2="164" y2="80" stroke="#3f3f46" strokeWidth="3" />
      {/* Minecart loaded with coal */}
      <polygon points="56,42 70,24 90,29 104,22 118,42" fill="#27272a" stroke="#e4e4ec" strokeWidth="1.6" />
      <polygon points="48,42 126,42 118,68 56,68" fill="#141418" stroke="#f4f4f8" strokeWidth="2" />
      <circle cx="67" cy="74" r="5.5" fill="#09090b" stroke="#ededf2" strokeWidth="1.8" />
      <circle cx="107" cy="74" r="5.5" fill="#09090b" stroke="#ededf2" strokeWidth="1.8" />
      {/* Impact smash arc */}
      <path d="M24 54 Q36 30 56 32" fill="none" stroke="#f4f4f8" strokeWidth="2.2" strokeDasharray="4 3" />
      <path d="M36 22 L45 14 M30 34 L20 30 M46 14 L52 24" stroke="#f4f4f8" strokeWidth="1.8" strokeLinecap="round" />
      {/* Goal counter */}
      <text x="148" y="24" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
        0 → 100%
      </text>
      <text x="148" y="37" textAnchor="middle" fill="#f4f4f8" fontSize="9" fontFamily="monospace" fontWeight="700">
        TREM PARA
      </text>
    </svg>
  );
}

function BoostDiagram() {
  return (
    <svg
      viewBox="0 0 180 96"
      className="w-full h-24 bg-[#070709] border border-zinc-800/90"
      aria-hidden="true"
    >
      <line x1="12" y1="80" x2="168" y2="80" stroke="#3f3f46" strokeWidth="3" />
      {/* Wooden support ramp */}
      <polygon points="28,80 42,60 56,80" fill="#27272a" stroke="#d4d4dc" strokeWidth="1.6" />
      <line x1="34" y1="62" x2="54" y2="54" stroke="#f4f4f8" strokeWidth="3" strokeLinecap="round" />
      {/* Oncoming rail hazard on ground */}
      <rect x="78" y="72" width="44" height="8" fill="#3f3f46" stroke="#f4f4f8" strokeWidth="1.2" />
      <line x1="84" y1="68" x2="116" y2="68" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* High vault arc */}
      <path d="M44 52 Q96 6 146 58" fill="none" stroke="#f4f4f8" strokeWidth="2.2" strokeDasharray="5 3" />
      <circle cx="96" cy="28" r="7" fill="#141418" stroke="#f4f4f8" strokeWidth="2" />
      <text x="96" y="16" textAnchor="middle" fill="#f4f4f8" fontSize="8.5" fontFamily="monospace" fontWeight="700">
        SALTO + IMPULSO
      </text>
    </svg>
  );
}

function TrainsDiagram() {
  return (
    <svg
      viewBox="0 0 180 96"
      className="w-full h-24 bg-[#070709] border border-zinc-800/90"
      aria-hidden="true"
    >
      {/* Track 1: Normal */}
      <line x1="14" y1="20" x2="166" y2="20" stroke="#e4e4ec" strokeWidth="4" opacity="0.65" />
      <text x="16" y="13" fill="#e4e4ec" fontSize="8" fontFamily="monospace">COMUM</text>

      {/* Track 2: Red Boss Shift */}
      <path d="M14 42 L86 42 L154 29" fill="none" stroke="#ef4444" strokeWidth="4" />
      <text x="16" y="36" fill="#fca5a5" fontSize="8" fontFamily="monospace">VERMELHO (DESVIA)</text>

      {/* Track 3: Quake */}
      <line x1="14" y1="64" x2="166" y2="64" stroke="#f59e0b" strokeWidth="4" />
      <text x="16" y="58" fill="#fcd34d" fontSize="8" fontFamily="monospace">SÍSMICO (SALTE!)</text>

      {/* Track 4: Flash */}
      <line x1="14" y1="86" x2="166" y2="86" stroke="#ffffff" strokeWidth="4" strokeDasharray="10 4" />
      <text x="16" y="80" fill="#ffffff" fontSize="8" fontFamily="monospace">CLARÃO (DESVIE ANTES)</text>
    </svg>
  );
}

const TRAIN_TYPES: {
  id: string;
  soundKind?: 'normal' | 'quake' | 'flash';
  name: string;
  railColorClass: string;
  when: string;
  cue: string;
  dodge: string;
}[] = [
  {
    id: 'normal',
    soundKind: 'normal',
    name: 'Trem Comum',
    railColorClass: 'bg-zinc-200',
    when: 'Todas as fases',
    cue: 'Trilho cinza-branco iluminado e buzina grave clássica.',
    dodge: 'Saia da faixa iluminada para os lados antes da locomotiva cruzar.',
  },
  {
    id: 'red',
    name: 'Trilho Vermelho',
    railColorClass: 'bg-red-500',
    when: 'Fases de Boss',
    cue: 'Trilho vermelho que pode mudar de direção no meio do trajeto.',
    dodge: 'Não fique perto das laterais da linha vermelha; mantenha distância extra.',
  },
  {
    id: 'quake',
    soundKind: 'quake',
    name: 'Trem Sísmico',
    railColorClass: 'bg-amber-500',
    when: 'Fase 3 em diante',
    cue: 'Trilho âmbar, tremor pesado no chão e buzina grave sísmica.',
    dodge: 'Se tocar o chão você fica lento. Pule pelo impulso para não sofrer lerdeza!',
  },
  {
    id: 'flash',
    soundKind: 'flash',
    name: 'Trem Clarão',
    railColorClass: 'bg-white',
    when: 'Fase 3 em diante',
    cue: 'Trilho branco piscando rápido, sirene elétrica aguda e flash de 0,5s.',
    dodge: 'Ao ouvir a sirene aguda, saia da linha na hora antes do clarão cegar a tela.',
  },
];

export function TutorialGuide({
  compact = false,
  onPlayTrainSound,
  onOpenFullTutorials,
}: TutorialGuideProps) {
  const [topic, setTopic] = useState<TutorialTopicId>('coal');

  if (compact) {
    return (
      <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-400">
            Mini Tutorial
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'coal', label: '1. Carvão' },
                { id: 'boost', label: '2. Impulso' },
                { id: 'trains', label: '3. Trens' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTopic(item.id)}
                className={`px-2.5 py-1.5 text-[11px] font-mono-tabular border transition-colors cursor-pointer ${
                  topic === item.id
                    ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                    : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {topic === 'coal' && (
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-3 items-center">
            <CoalDiagram />
            <div className="space-y-1.5">
              <div className="text-sm font-bold text-white">Quebre todos os carrinhos de carvão</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Aproxime-se do carrinho cheio de carvão e pressione{' '}
                <strong className="text-white">E / Clique / X</strong> para bater. Quando destruir
                todo o carvão, o trem para e você vence a fase.
              </p>
            </div>
          </div>
        )}

        {topic === 'boost' && (
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-3 items-center">
            <BoostDiagram />
            <div className="space-y-1.5">
              <div className="text-sm font-bold text-white">Use as rampas para pular no impulso</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Aperte <strong className="text-white">Espaço / A</strong> sobre um apoio no mapa
                para saltar alto por cima dos trilhos com velocidade extra e ficar imune à lerdeza no ar.
              </p>
            </div>
          </div>
        )}

        {topic === 'trains' && (
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-3 items-center">
            <TrainsDiagram />
            <div className="space-y-1.5 text-xs text-zinc-300">
              <div className="text-sm font-bold text-white">Identifique cada tipo de trem</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono-tabular text-[11px]">
                <span className="text-zinc-200">· Cinza: Comum</span>
                <span className="text-red-300">· Vermelho: Muda rumo</span>
                <span className="text-amber-300">· Âmbar: Sísmico (Salte!)</span>
                <span className="text-white">· Branco: Clarão (0,5s)</span>
              </div>
              {onPlayTrainSound && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onPlayTrainSound('normal')}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-zinc-700 bg-[#141419] text-[11px] font-mono-tabular text-zinc-200 hover:border-zinc-400 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Comum
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlayTrainSound('quake')}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-amber-700/70 bg-[#181410] text-[11px] font-mono-tabular text-amber-200 hover:border-amber-400 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Sísmico
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlayTrainSound('flash')}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-zinc-500 bg-[#16161b] text-[11px] font-mono-tabular text-white hover:border-white cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Clarão
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {onOpenFullTutorials && (
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-end">
            <button
              type="button"
              onClick={onOpenFullTutorials}
              className="text-[11px] font-mono-tabular text-zinc-300 hover:text-white underline cursor-pointer"
            >
              Ver guia completo em Fases →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full Tutorial View inside Fases -> Tutoriais
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#111115] border border-zinc-800 p-4 space-y-2.5">
          <div className="text-xs font-mono-tabular uppercase text-zinc-400">
            01 · Objetivo Principal
          </div>
          <h4 className="font-display text-xl uppercase font-bold text-white">
            Como Quebrar os Carvões
          </h4>
          <CoalDiagram />
          <p className="text-xs text-zinc-300 leading-relaxed">
            Os carrinhos de mina carregados de carvão mantêm a locomotiva rodando. Encoste neles e
            pressione <strong className="text-white">E / Clique / X (ou botão Carvão no celular)</strong>{' '}
            para quebrar o carregamento. Cada carrinho destruído acelera os trens; ao quebrar todos,
            o trem para e a fase termina.
          </p>
        </div>

        <div className="bg-[#111115] border border-zinc-800 p-4 space-y-2.5">
          <div className="text-xs font-mono-tabular uppercase text-zinc-400">
            02 · Mobilidade e Esquiva Aérea
          </div>
          <h4 className="font-display text-xl uppercase font-bold text-white">
            Como Pular no Impulso
          </h4>
          <BoostDiagram />
          <p className="text-xs text-zinc-300 leading-relaxed">
            Procure os apoios de madeira com aro luminoso espalhados na arena. Salte com{' '}
            <strong className="text-white">Espaço / A (ou Saltar no celular)</strong> perto de um
            apoio para ganhar um <strong className="text-white">impulso alto e veloz</strong>,
            passando por cima dos trilhos e evitando a lerdeza no chão do Trem Sísmico.
          </p>
        </div>
      </div>

      <div className="bg-[#111115] border border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono-tabular uppercase text-zinc-400">
              03 · Identificação Visual e Sonora
            </div>
            <h4 className="font-display text-xl uppercase font-bold text-white">
              Todos os Tipos de Trem e Como Evitar
            </h4>
          </div>
          <span className="text-[11px] font-mono-tabular text-zinc-400">
            Ouça a buzina antes de olhar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TRAIN_TYPES.map((tr) => (
            <div
              key={tr.id}
              className="border border-zinc-800 bg-[#0b0b0e] p-3 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-3 h-3 ${tr.railColorClass}`} aria-hidden="true" />
                    <span className="text-sm font-bold text-white">{tr.name}</span>
                  </div>
                  <span className="text-[10px] font-mono-tabular text-zinc-400">{tr.when}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed mb-1">
                  <strong className="text-zinc-100">Sinal:</strong> {tr.cue}
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Como evitar:</strong> {tr.dodge}
                </p>
              </div>

              {tr.soundKind && onPlayTrainSound && (
                <button
                  type="button"
                  onClick={() => onPlayTrainSound(tr.soundKind!)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-[#141419] text-xs font-mono-tabular text-zinc-200 hover:border-zinc-400 hover:text-white cursor-pointer w-fit"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Ouvir buzina</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

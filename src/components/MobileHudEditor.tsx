import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Maximize2,
  Move,
  RotateCcw,
} from 'lucide-react';
import { MobileHudControlId, MobileHudControlPos, MobileHudLayout } from '../game/types';

export const DEFAULT_MOBILE_HUD_LAYOUT: MobileHudLayout = {
  joystick: { xPct: 14, yPct: 80, scale: 1 },
  coal: { xPct: 71, yPct: 83, scale: 1 },
  jump: { xPct: 88, yPct: 83, scale: 1 },
  ability: { xPct: 82, yPct: 64, scale: 1 },
};

const CONTROL_META: { id: MobileHudControlId; label: string; hint: string }[] = [
  { id: 'joystick', label: 'Analógico', hint: 'Movimento do macaco' },
  { id: 'jump', label: 'Saltar', hint: 'Pular / impulso nos apoios' },
  { id: 'coal', label: 'Carvão', hint: 'Quebrar carrinhos de carvão' },
  { id: 'ability', label: 'Poder', hint: 'Ativar habilidade equipada' },
];

const PRESETS: { id: string; label: string; layout: MobileHudLayout }[] = [
  {
    id: 'default',
    label: 'Padrão (Destro)',
    layout: DEFAULT_MOBILE_HUD_LAYOUT,
  },
  {
    id: 'lefty',
    label: 'Canhoto',
    layout: {
      joystick: { xPct: 86, yPct: 80, scale: 1 },
      coal: { xPct: 29, yPct: 83, scale: 1 },
      jump: { xPct: 12, yPct: 83, scale: 1 },
      ability: { xPct: 18, yPct: 64, scale: 1 },
    },
  },
  {
    id: 'claw',
    label: 'Garra (4 Dedos)',
    layout: {
      joystick: { xPct: 14, yPct: 80, scale: 1 },
      coal: { xPct: 86, yPct: 48, scale: 0.95 },
      jump: { xPct: 86, yPct: 80, scale: 1.1 },
      ability: { xPct: 72, yPct: 78, scale: 0.95 },
    },
  },
];

function clampPos(pos: Partial<MobileHudControlPos> | undefined, fallback: MobileHudControlPos): MobileHudControlPos {
  const x = typeof pos?.xPct === 'number' && Number.isFinite(pos.xPct) ? pos.xPct : fallback.xPct;
  const y = typeof pos?.yPct === 'number' && Number.isFinite(pos.yPct) ? pos.yPct : fallback.yPct;
  const s = typeof pos?.scale === 'number' && Number.isFinite(pos.scale) ? pos.scale : fallback.scale;
  return {
    xPct: Math.round(Math.max(6, Math.min(94, x)) * 10) / 10,
    yPct: Math.round(Math.max(18, Math.min(92, y)) * 10) / 10,
    scale: Math.round(Math.max(0.7, Math.min(1.45, s)) * 100) / 100,
  };
}

export function normalizeMobileHudLayout(raw?: Partial<MobileHudLayout> | null): MobileHudLayout {
  return {
    joystick: clampPos(raw?.joystick, DEFAULT_MOBILE_HUD_LAYOUT.joystick),
    jump: clampPos(raw?.jump, DEFAULT_MOBILE_HUD_LAYOUT.jump),
    coal: clampPos(raw?.coal, DEFAULT_MOBILE_HUD_LAYOUT.coal),
    ability: clampPos(raw?.ability, DEFAULT_MOBILE_HUD_LAYOUT.ability),
  };
}

interface MobileHudEditorProps {
  layout: MobileHudLayout;
  isTouchUi: boolean;
  onToggleTouchUi: () => void;
  onChangeLayout: (next: MobileHudLayout) => void;
}

export function MobileHudEditor({
  layout,
  isTouchUi,
  onToggleTouchUi,
  onChangeLayout,
}: MobileHudEditorProps) {
  const [selectedControl, setSelectedControl] = useState<MobileHudControlId>('jump');
  const [fullscreenMode, setFullscreenMode] = useState(false);

  const previewBoardRef = useRef<HTMLDivElement | null>(null);
  const fullscreenBoardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    controlId: MobileHudControlId;
    pointerId: number;
    board: HTMLDivElement;
  } | null>(null);

  useEffect(() => {
    if (!fullscreenMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreenMode]);

  const updateControl = (id: MobileHudControlId, patch: Partial<MobileHudControlPos>) => {
    const cur = layout[id];
    const nextPos = clampPos({ ...cur, ...patch }, DEFAULT_MOBILE_HUD_LAYOUT[id]);
    onChangeLayout({
      ...layout,
      [id]: nextPos,
    });
  };

  const handleControlPointerDown = (
    controlId: MobileHudControlId,
    e: React.PointerEvent<HTMLButtonElement | HTMLDivElement>,
    boardEl: HTMLDivElement | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedControl(controlId);
    if (!boardEl) return;
    dragStateRef.current = {
      controlId,
      pointerId: e.pointerId,
      board: boardEl,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleControlPointerMove = (e: React.PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = drag.board.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    updateControl(drag.controlId, { xPct, yPct });
  };

  const handleControlPointerUp = (e: React.PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    dragStateRef.current = null;
  };

  const activePos = layout[selectedControl];
  const activeMeta = CONTROL_META.find((c) => c.id === selectedControl) || CONTROL_META[0];

  const renderInteractiveBoard = (
    boardRef: React.RefObject<HTMLDivElement | null>,
    compactPreview: boolean
  ) => (
    <div
      ref={boardRef}
      className={`relative w-full overflow-hidden select-none touch-none border border-zinc-700 bg-[#070709] ${
        compactPreview ? 'aspect-[16/10] sm:aspect-[16/9]' : 'h-full w-full border-0'
      }`}
    >
      {/* Subtle alignment grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '10% 10%',
        }}
        aria-hidden="true"
      />

      {/* Simulated top HUD area (non-draggable reference) */}
      <div className="absolute inset-x-3 top-2.5 flex items-start justify-between pointer-events-none opacity-45">
        <div className="border border-zinc-700 bg-[#0d0d11] px-2.5 py-1 text-[10px] font-mono-tabular text-zinc-300">
          Vivos 3/3 · 48 km/h
        </div>
        <div className="border border-zinc-700 bg-[#0d0d11] px-2.5 py-1 text-[10px] font-mono-tabular text-zinc-300">
          Carvão 2/6
        </div>
        <div className="border border-zinc-700 bg-[#0d0d11] px-2.5 py-1 text-[10px] font-mono-tabular text-zinc-300">
          +30 · Pausa
        </div>
      </div>

      {/* Center prompt helper */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
        <div className="text-[11px] font-mono-tabular text-zinc-500 text-center px-4">
          Arraste cada controle abaixo para a posição ideal dos seus dedos
        </div>
      </div>

      {/* Draggable Joystick */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => handleControlPointerDown('joystick', e, boardRef.current)}
        onPointerMove={handleControlPointerMove}
        onPointerUp={handleControlPointerUp}
        onPointerCancel={handleControlPointerUp}
        onClick={() => setSelectedControl('joystick')}
        style={{
          left: `${layout.joystick.xPct}%`,
          top: `${layout.joystick.yPct}%`,
          transform: `translate(-50%, -50%) scale(${
            compactPreview ? layout.joystick.scale * 0.72 : layout.joystick.scale
          })`,
        }}
        className={`absolute w-28 h-28 rounded-full border-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
          selectedControl === 'joystick'
            ? 'border-white bg-[#14141c]/90 ring-2 ring-white/50'
            : 'border-zinc-400/80 bg-[#09090b]/80'
        }`}
        aria-label="Mover Analógico"
      >
        <div className="w-11 h-11 rounded-full bg-[#ededf2] border-2 border-[#08080a] pointer-events-none" />
        <span className="absolute -bottom-5 text-[10px] font-mono-tabular uppercase tracking-wider text-zinc-200 whitespace-nowrap pointer-events-none">
          Analógico
        </span>
      </div>

      {/* Draggable Poder Button */}
      <button
        type="button"
        onPointerDown={(e) => handleControlPointerDown('ability', e, boardRef.current)}
        onPointerMove={handleControlPointerMove}
        onPointerUp={handleControlPointerUp}
        onPointerCancel={handleControlPointerUp}
        style={{
          left: `${layout.ability.xPct}%`,
          top: `${layout.ability.yPct}%`,
          transform: `translate(-50%, -50%) scale(${
            compactPreview ? layout.ability.scale * 0.78 : layout.ability.scale
          })`,
        }}
        className={`absolute min-h-[44px] px-3.5 py-2 border-2 text-xs font-display uppercase font-bold tracking-wider cursor-grab active:cursor-grabbing touch-none whitespace-nowrap ${
          selectedControl === 'ability'
            ? 'border-white bg-[#f2f2f6] text-[#08080a] ring-2 ring-white/50'
            : 'border-zinc-300 bg-[#17171f]/90 text-white'
        }`}
      >
        Poder
      </button>

      {/* Draggable Carvão Button */}
      <button
        type="button"
        onPointerDown={(e) => handleControlPointerDown('coal', e, boardRef.current)}
        onPointerMove={handleControlPointerMove}
        onPointerUp={handleControlPointerUp}
        onPointerCancel={handleControlPointerUp}
        style={{
          left: `${layout.coal.xPct}%`,
          top: `${layout.coal.yPct}%`,
          transform: `translate(-50%, -50%) scale(${
            compactPreview ? layout.coal.scale * 0.78 : layout.coal.scale
          })`,
        }}
        className={`absolute w-20 h-14 border-2 font-display uppercase font-bold text-sm tracking-wider cursor-grab active:cursor-grabbing touch-none whitespace-nowrap ${
          selectedControl === 'coal'
            ? 'border-white bg-[#f2f2f6] text-[#08080a] ring-2 ring-white/50'
            : 'border-zinc-500 bg-[#121216]/90 text-zinc-100'
        }`}
      >
        Carvão
      </button>

      {/* Draggable Saltar Button */}
      <button
        type="button"
        onPointerDown={(e) => handleControlPointerDown('jump', e, boardRef.current)}
        onPointerMove={handleControlPointerMove}
        onPointerUp={handleControlPointerUp}
        onPointerCancel={handleControlPointerUp}
        style={{
          left: `${layout.jump.xPct}%`,
          top: `${layout.jump.yPct}%`,
          transform: `translate(-50%, -50%) scale(${
            compactPreview ? layout.jump.scale * 0.78 : layout.jump.scale
          })`,
        }}
        className={`absolute w-20 h-14 border-2 font-display uppercase font-bold text-sm tracking-wider cursor-grab active:cursor-grabbing touch-none whitespace-nowrap ${
          selectedControl === 'jump'
            ? 'border-white bg-[#f2f2f6] text-[#08080a] ring-2 ring-white/50'
            : 'border-zinc-400 bg-[#121216]/90 text-zinc-100'
        }`}
      >
        Saltar
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Top row: enable touch controls + presets + fullscreen test */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111115] border border-zinc-800 px-3.5 py-2.5">
        <div>
          <div className="text-xs font-bold text-white">Controles na Tela (Mobile)</div>
          <div className="text-[11px] font-mono-tabular text-zinc-400">
            Ative para usar os botões posicionados durante a partida
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleTouchUi}
            className={`px-3 py-1.5 text-xs font-mono-tabular border cursor-pointer whitespace-nowrap ${
              isTouchUi
                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                : 'bg-[#18181d] text-zinc-300 border-zinc-700 hover:border-zinc-400'
            }`}
          >
            {isTouchUi ? 'Ativados' : 'Desativados'}
          </button>
          <button
            type="button"
            onClick={() => setFullscreenMode(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tabular border border-zinc-600 bg-[#18181d] text-zinc-100 hover:border-white cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Editar em Tela Cheia</span>
          </button>
        </div>
      </div>

      {/* Presets & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChangeLayout(normalizeMobileHudLayout(preset.layout))}
              className="px-2.5 py-1.5 text-xs font-mono-tabular border border-zinc-800 bg-[#121216] text-zinc-200 hover:border-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onChangeLayout(DEFAULT_MOBILE_HUD_LAYOUT)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono-tabular border border-zinc-700 bg-[#121216] text-zinc-300 hover:border-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar HUD</span>
        </button>
      </div>

      {/* Main Editor Split: Interactive Drag Canvas + Control Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4 items-start">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5" />
              Arraste os botões no quadro para posicionar
            </span>
            <span>Selecionado: {activeMeta.label}</span>
          </div>
          {renderInteractiveBoard(previewBoardRef, true)}
        </div>

        {/* Selected Control Fine Controls */}
        <div className="bg-[#111115] border border-zinc-800 p-4 space-y-4">
          <div>
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-400 mb-2">
              Controle Selecionado
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CONTROL_META.map((ctrl) => {
                const active = selectedControl === ctrl.id;
                return (
                  <button
                    key={ctrl.id}
                    type="button"
                    onClick={() => setSelectedControl(ctrl.id)}
                    className={`px-2.5 py-2 text-xs font-display uppercase tracking-wider border text-center cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                        : 'bg-[#16161c] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    {ctrl.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-mono-tabular text-zinc-400 mt-2">
              {activeMeta.hint} · X {Math.round(activePos.xPct)}% · Y {Math.round(activePos.yPct)}%
            </p>
          </div>

          {/* Button Size */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono-tabular text-zinc-200 mb-1.5">
              <span>Tamanho do Botão</span>
              <span className="font-bold text-white">{Math.round(activePos.scale * 100)}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={145}
              step={5}
              value={Math.round(activePos.scale * 100)}
              onChange={(e) =>
                updateControl(selectedControl, { scale: Number(e.target.value) / 100 })
              }
              aria-label={`Tamanho de ${activeMeta.label}`}
              className="w-full accent-[#f2f2f6] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-zinc-500 mt-1">
              <span>70%</span>
              <span>100%</span>
              <span>145%</span>
            </div>
          </div>

          {/* Precision D-Pad Nudge */}
          <div>
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-400 mb-2">
              Ajuste Fino de Posição
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-w-[168px]">
              <div />
              <button
                type="button"
                aria-label="Mover para cima"
                onClick={() => updateControl(selectedControl, { yPct: activePos.yPct - 2 })}
                className="min-h-[44px] flex items-center justify-center border border-zinc-700 bg-[#17171d] text-zinc-200 hover:border-white cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div />
              <button
                type="button"
                aria-label="Mover para esquerda"
                onClick={() => updateControl(selectedControl, { xPct: activePos.xPct - 2 })}
                className="min-h-[44px] flex items-center justify-center border border-zinc-700 bg-[#17171d] text-zinc-200 hover:border-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Centralizar horizontalmente"
                onClick={() =>
                  updateControl(selectedControl, DEFAULT_MOBILE_HUD_LAYOUT[selectedControl])
                }
                className="min-h-[44px] flex items-center justify-center border border-zinc-800 bg-[#111115] text-[10px] font-mono-tabular text-zinc-400 hover:text-white cursor-pointer"
              >
                Pad
              </button>
              <button
                type="button"
                aria-label="Mover para direita"
                onClick={() => updateControl(selectedControl, { xPct: activePos.xPct + 2 })}
                className="min-h-[44px] flex items-center justify-center border border-zinc-700 bg-[#17171d] text-zinc-200 hover:border-white cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div />
              <button
                type="button"
                aria-label="Mover para baixo"
                onClick={() => updateControl(selectedControl, { yPct: activePos.yPct + 2 })}
                className="min-h-[44px] flex items-center justify-center border border-zinc-700 bg-[#17171d] text-zinc-200 hover:border-white cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Native Screen Calibration Portal */}
      {fullscreenMode &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[120] bg-[#07070a]/95 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800 bg-[#0b0b0e]">
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-zinc-200">
                <span className="font-bold text-white">{activeMeta.label}</span>
                <span>· {Math.round(activePos.scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={70}
                  max={145}
                  step={5}
                  value={Math.round(activePos.scale * 100)}
                  onChange={(e) =>
                    updateControl(selectedControl, { scale: Number(e.target.value) / 100 })
                  }
                  aria-label="Tamanho em tela cheia"
                  className="w-28 accent-[#f2f2f6] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onChangeLayout(DEFAULT_MOBILE_HUD_LAYOUT)}
                  className="px-2.5 py-1.5 text-xs font-mono-tabular border border-zinc-700 bg-[#141418] text-zinc-200 cursor-pointer"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenMode(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display uppercase font-bold tracking-wider bg-[#f2f2f6] text-[#08080a] cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Concluir</span>
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0">
              {renderInteractiveBoard(fullscreenBoardRef, false)}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

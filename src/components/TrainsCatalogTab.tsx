import { useState } from 'react';
import { Eye, ShieldAlert, Sparkles, TrainFront, Volume2 } from 'lucide-react';
import trainNormalImg from '../assets/images/train_normal_ingame_1795609861525.jpg';
import trainRedShiftImg from '../assets/images/train_red_shift_ingame_1795609861688.jpg';
import trainQuakeImg from '../assets/images/train_quake_ingame_1795609862368.jpg';
import trainFlashImg from '../assets/images/train_flash_ingame_1795609860953.jpg';
import trainBossImg from '../assets/images/train_boss_leviathan_ingame_1795609861444.jpg';

export type CatalogSoundKind = 'normal' | 'red' | 'quake' | 'flash';

interface TrainsCatalogTabProps {
  onPlayTrainSound: (kind: CatalogSoundKind) => void;
}

interface TrainHazardEntry {
  id: CatalogSoundKind;
  name: string;
  availability: string;
  railHex: string;
  railLabel: string;
  image: string;
  imageAlt: string;
  soundLabel: string;
  visualCue: string;
  audioCue: string;
  effect: string;
  dodgeTip: string;
}

interface TrainChassisEntry {
  id: string;
  name: string;
  role: string;
  phases: string;
  behavior: string;
  visualNote: string;
}

const TRAIN_HAZARDS: TrainHazardEntry[] = [
  {
    id: 'normal',
    name: 'Trem Comum',
    availability: 'Todas as fases',
    railHex: '#e4e4ec',
    railLabel: 'Trilho Cinza-Branco',
    image: trainNormalImg,
    imageAlt:
      'Cena no jogo mostrando uma locomotiva a vapor escura com farol branco sobre trilho cinza-branco na neblina',
    soundLabel: 'Ouvir buzina clássica',
    visualCue:
      'Faixa contínua cinza-branca brilhando no chão antes da chegada e cone de farol branco.',
    audioCue: 'Buzina dupla grave e constante de locomotiva a vapor.',
    effect: 'Velocidade direta ao longo do trilho projetado; fatal ao encostar.',
    dodgeTip:
      'Saia para qualquer lado da faixa iluminada assim que ela surgir no chão, sem esperar o farol.',
  },
  {
    id: 'red',
    name: 'Trilho Vermelho',
    availability: 'Fases de Boss',
    railHex: '#ef4444',
    railLabel: 'Trilho Carmesim Desviante',
    image: trainRedShiftImg,
    imageAlt:
      'Cena no jogo mostrando locomotiva blindada mudando de direção sobre trilhos vermelhos luminosos',
    soundLabel: 'Ouvir sinal do Boss',
    visualCue:
      'Trilho vermelho vivo que entorta ou muda de rumo repentinamente no meio do trajeto.',
    audioCue: 'Alerta grave na entrada seguido pela buzina pesada do Boss.',
    effect: 'A trajetória desvia no meio do caminho para surpreender quem fica parado perto da linha.',
    dodgeTip:
      'Não caminhe rente às laterais do trilho vermelho; abra distância extra para ambos os lados.',
  },
  {
    id: 'quake',
    name: 'Trem Sísmico',
    availability: 'Fase 3 em diante',
    railHex: '#f59e0b',
    railLabel: 'Trilho Âmbar Sísmico',
    image: trainQuakeImg,
    imageAlt:
      'Cena no jogo mostrando locomotiva pesada sobre trilhos âmbar sacudindo pedras e poeira do chão',
    soundLabel: 'Ouvir buzina sísmica',
    visualCue:
      'Trilho laranja-âmbar brilhante no chão acompanhado de tremores fortes na câmera.',
    audioCue: 'Buzina metálica mais grave e vibração pesada nos trilhos.',
    effect:
      'Deixa o macaco lento enquanto estiver no chão. No ar pelo impulso não causa lerdeza, apenas tremor mais forte na tela.',
    dodgeTip:
      'Ao notar o trilho âmbar ou o tremor, use um apoio de madeira para saltar no impulso e atravessar pelo ar.',
  },
  {
    id: 'flash',
    name: 'Trem Clarão',
    availability: 'Fase 3 em diante',
    railHex: '#ffffff',
    railLabel: 'Trilho Branco Estroboscópico',
    image: trainFlashImg,
    imageAlt:
      'Cena no jogo mostrando locomotiva veloz em trilhos brancos piscantes com clarão intenso de farol',
    soundLabel: 'Ouvir sirene do clarão',
    visualCue:
      'Trilho branco piscando rápido com farol estroboscópico intenso cortando a neblina.',
    audioCue: 'Sirene elétrica aguda seguida por disparo sonoro do clarão.',
    effect:
      'Provoca um flash branco na tela por 0,5 segundo que vai sumindo aos poucos enquanto o trem cruza.',
    dodgeTip:
      'Reaja pela sirene aguda antes do estouro de luz e já saia da direção do trilho antes de ficar cego.',
  },
];

const TRAIN_CHASSIS: TrainChassisEntry[] = [
  {
    id: 'classic',
    name: 'Locomotiva Fantasma',
    role: 'Padrão · Fases iniciais',
    phases: 'Fase 1 e trechos básicos',
    behavior: 'Trajeto reto e previsível',
    visualNote: 'Caldeira cilíndrica clássica, chaminé alta e farol frontal único.',
  },
  {
    id: 'ripper',
    name: 'Expresso Serrado',
    role: 'Padrão · Curvas abertas',
    phases: 'A partir da Fase 3',
    behavior: 'Alterna trilhos retos e curvas fechadas',
    visualNote: 'Lâmina serrada giratória na frente e serra dorsal sobre os vagões.',
  },
  {
    id: 'serpent',
    name: 'Expresso Serpente',
    role: 'Veloz · Investida fantasma',
    phases: 'A partir da Fase 4',
    behavior: 'Curvas longas com arrancada súbita',
    visualNote: 'Focinho com presas duplas e escamas dorsais ao longo da caldeira.',
  },
  {
    id: 'armored_boss',
    name: 'Boss: Colosso Blindado',
    role: 'Chefe · Fase 2',
    phases: 'Abismo das Chaminés',
    behavior: 'Trilhos vermelhos desviantes e curvas médias',
    visualNote: 'Aríete frontal com 3 espetos, torres laterais e vagões enjaulados.',
  },
  {
    id: 'carcara_boss',
    name: 'Boss: Carcará de Aço',
    role: 'Chefe · Fase 5',
    phases: 'Pátio das Sombras',
    behavior: 'Curvas fechadas com arrancadas fantasma',
    visualNote: 'Bico metálico pontiagudo, asas abertas e garras traseiras.',
  },
  {
    id: 'leviathan_boss',
    name: 'Boss: Leviatã de Ferro',
    role: 'Chefe · Fase 6',
    phases: 'Cripta do Leviatã',
    behavior: 'Curvas abertas, arrancadas e trilho vermelho',
    visualNote: 'Mandíbula abissal com 4 presas, barbatanas e farol duplo azulado.',
  },
  {
    id: 'furnace_boss',
    name: 'Boss: Fornalha Viva',
    role: 'Chefe · Fase 9',
    phases: 'Galpão das Caldeiras',
    behavior: 'Pressão contínua com brasa e curvas largas',
    visualNote: 'Boca de fornalha âmbar gradeada, caldeirão e duas chaminés largas.',
  },
  {
    id: 'drill_boss',
    name: 'Boss: Escavador Abissal',
    role: 'Chefe · Fase 12',
    phases: 'Fosso do Maquinista',
    behavior: 'Investidas perfurantes na escuridão',
    visualNote: 'Broca cônica tripla na proa e rolo triturador giratório dianteiro.',
  },
  {
    id: 'hammer_boss',
    name: 'Boss: Quebra-Rocha',
    role: 'Chefe · Fase 15',
    phases: 'Túnel Desabado',
    behavior: 'Arrancadas pesadas e desvios curtos',
    visualNote: 'Dois pistões frontais de impacto, placa chata e ombreiras blindadas.',
  },
  {
    id: 'anvil_boss',
    name: 'Boss: Bigorna Negra',
    role: 'Chefe · Fase 18',
    phases: 'Forja Silenciosa',
    behavior: 'Curvas fechadas com ritmo constante',
    visualNote: 'Proa em bigorna invertida com chifre frontal e arco forjado.',
  },
  {
    id: 'bunker_boss',
    name: 'Boss: Bastilha Móvel',
    role: 'Chefe · Fase 21',
    phases: 'Bunker de Grafite',
    behavior: 'Trilhos vermelhos rápidos sob penumbra',
    visualNote: 'Casamata hexagonal blindada, cúpula no teto e 4 faróis frontais.',
  },
  {
    id: 'reaper_boss',
    name: 'Boss: Ceifador de Trilhos',
    role: 'Chefe · Fase 24',
    phases: 'Abatedouro de Cinza',
    behavior: 'Investidas súbitas em terreno acidentado',
    visualNote: 'Costelas expostas em arco e duas rodas-foice gigantes nas laterais.',
  },
  {
    id: 'cathedral_boss',
    name: 'Boss: Altar Sombrio',
    role: 'Chefe · Fase 27',
    phases: 'Catedral do Carvão',
    behavior: 'Curvas longas com investidas duplas',
    visualNote: 'Duas torres góticas afiladas nas laterais e sino suspenso no teto.',
  },
  {
    id: 'hydra_boss',
    name: 'Boss: Hidra de Vapor',
    role: 'Chefe · Fase 30',
    phases: 'Garganta do Vapor',
    behavior: 'Desvios sinuosos e três ângulos de pressão',
    visualNote: 'Três cabeças blindadas paralelas com chifres, faróis e 3 chaminés.',
  },
  {
    id: 'sovereign_boss',
    name: 'Boss: Soberano Cinzento',
    role: 'Chefe · Fase 33',
    phases: 'Trono do Maquinista',
    behavior: 'Alta frequência de desvios e arrancadas',
    visualNote: 'Coroa de ferro pontiaguda sobre a cabine, escudo frontal e 4 chaminés.',
  },
  {
    id: 'eternal_boss',
    name: 'Boss: Leviatã Eterno',
    role: 'Chefe · Fase 36',
    phases: 'Fim da Linha Eterna',
    behavior: 'Todas as variações férreas em ritmo alto',
    visualNote: 'Dreadnought colossal com 5 presas, asas de aço, obeliscos e 4 chaminés.',
  },
  {
    id: 'glacier_boss',
    name: 'Boss: Expresso Glacial',
    role: 'Chefe · Fase 39',
    phases: 'Cordilheira Congelada',
    behavior: 'Arrancadas congelantes em pistas de gelo',
    visualNote: 'Proa rompe-gelo prismática e cristais azuis cravados nos vagões.',
  },
  {
    id: 'pendulum_boss',
    name: 'Boss: Pêndulo Sombrio',
    role: 'Chefe · Fase 42',
    phases: 'Fundição das Engrenagens',
    behavior: 'Desvios rítmicos de relógio e retorno súbito',
    visualNote: 'Lâmina pendular dourada sob arco de bronze e engrenagens giratórias.',
  },
  {
    id: 'magma_boss',
    name: 'Boss: Vulcão de Ferro',
    role: 'Chefe · Fase 45',
    phases: 'Caldeira de Escória',
    behavior: 'Investidas ferventes com clarões de brasa',
    visualNote: 'Chaminé vulcânica incandescente cercada por placas de escória.',
  },
  {
    id: 'spider_boss',
    name: 'Boss: Viúva de Trilho',
    role: 'Chefe · Fase 48',
    phases: 'Bosque de Sucata',
    behavior: 'Curvas imprevisíveis com varredura lateral',
    visualNote: 'Oito patas mecânicas articuladas ao longo do chassi e múltiplos olhos.',
  },
  {
    id: 'obelisk_boss',
    name: 'Boss: Obelisco Cego',
    role: 'Chefe · Fase 51',
    phases: 'Salinas Cinzentas',
    behavior: 'Avanço monolítico silencioso e veloz',
    visualNote: 'Monólito piramidal negro flutuando sobre imãs e trilho brilhante.',
  },
  {
    id: 'turbine_boss',
    name: 'Boss: Turbina Rubra',
    role: 'Chefe · Fase 54',
    phases: 'Usina Relojoeira',
    behavior: 'Arrancada a jato em linha reta e curvas médias',
    visualNote: 'Turbina frontal vermelha giratória e propulsores laterais duplos.',
  },
  {
    id: 'scorpion_boss',
    name: 'Boss: Ferrão de Ferro',
    role: 'Chefe · Fase 57',
    phases: 'Viaduto de Ossos',
    behavior: 'Pinças dianteiras largas e cauda arqueada',
    visualNote: 'Duas garras frontais serrilhadas e ferrão blindado erguido no teto.',
  },
  {
    id: 'prism_boss',
    name: 'Boss: Prisma Abissal',
    role: 'Chefe · Fase 60',
    phases: 'Catedral do Gelo',
    behavior: 'Reflexos clarões frequentes em ângulo aberto',
    visualNote: 'Octaedro cristalino flutuante e anel giratório ao redor da caldeira.',
  },
  {
    id: 'colossus_boss',
    name: 'Boss: Titã do Sal',
    role: 'Chefe · Fase 63',
    phases: 'Deserto Branco',
    behavior: 'Pressão pesada com tremores sísmicos contínuos',
    visualNote: 'Muralha frontal blindada tripla com pilares e chaminés duplas.',
  },
  {
    id: 'bell_boss',
    name: 'Boss: Badalada Negra',
    role: 'Chefe · Fase 66',
    phases: 'Campanário de Cinza',
    behavior: 'Alternância rápida entre curvas fechadas e desvios',
    visualNote: 'Grande sino dourado suspenso sob campanário aberto sobre rodas.',
  },
  {
    id: 'sawmill_boss',
    name: 'Boss: Serra Imperial',
    role: 'Chefe · Fase 69',
    phases: 'Serraria das Sombras',
    behavior: 'Cortes largos em alta velocidade',
    visualNote: 'Três discos de serra paralelos girando à frente e serra dorsal.',
  },
  {
    id: 'void_boss',
    name: 'Boss: Espectro do Vácuo',
    role: 'Chefe · Fase 72',
    phases: 'Fenda Sem Luz',
    behavior: 'Arrancadas fantasma em trilhos vermelhos curtos',
    visualNote: 'Núcleo estelar escuro orbitado por anéis oblíquos cintilantes.',
  },
  {
    id: 'centipede_boss',
    name: 'Boss: Lacraia de Aço',
    role: 'Chefe · Fase 75',
    phases: 'Túnel da Lacraia',
    behavior: 'Composição articulada longa em curvas sinuosas',
    visualNote: 'Antenas serrilhadas duplas e dezesseis patas metálicas laterais.',
  },
  {
    id: 'bastion_boss',
    name: 'Boss: Cidadela Móvel',
    role: 'Chefe · Fase 78',
    phases: 'Muralha de Escória',
    behavior: 'Combinação extrema de desvios, sismos e clarões',
    visualNote: 'Fortaleza rolante com ameias, quatro canhões e escudos espessos.',
  },
  {
    id: 'omega_boss',
    name: 'Boss Final: Ômega Absoluto',
    role: 'Chefe Final · Fase 80',
    phases: 'Fim da Linha Ômega',
    behavior: 'Todas as variações férreas na velocidade máxima',
    visualNote: 'Colosso supremo com auréola giratória, 6 presas e 6 chaminés.',
  },
];

export function TrainsCatalogTab({ onPlayTrainSound }: TrainsCatalogTabProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<'ALL' | 'SPECIAL'>('ALL');

  const markImageFailed = (key: string) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  const visibleHazards =
    filterMode === 'SPECIAL'
      ? TRAIN_HAZARDS.filter((t) => t.id !== 'normal')
      : TRAIN_HAZARDS;

  return (
    <div className="bg-[#0b0b0e]/92 border border-zinc-800 p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="text-[11px] font-mono-tabular uppercase tracking-[0.16em] text-zinc-400">
            Guia de Campo · Identificação em Jogo
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white mt-0.5">
            Tipos de Trem e Como Identificar
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 text-xs font-mono-tabular border transition-colors cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
            }`}
          >
            Todos ({TRAIN_HAZARDS.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('SPECIAL')}
            className={`px-3 py-1.5 text-xs font-mono-tabular border transition-colors cursor-pointer ${
              filterMode === 'SPECIAL'
                ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6] font-bold'
                : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
            }`}
          >
            Especiais e Boss (3)
          </button>
        </div>
      </div>

      {/* Main 4 Track/Hazard Train Cards with In-Game Illustrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleHazards.map((train) => {
          const isFailed = Boolean(failedImages[train.id]);
          return (
            <article
              key={train.id}
              className="border border-zinc-800 bg-[#101014] flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Illustrative In-Game Image */}
                <div className="relative aspect-video w-full bg-[#070709] border-b border-zinc-800 overflow-hidden">
                  {!isFailed ? (
                    <img
                      src={train.image}
                      alt={train.imageAlt}
                      referrerPolicy="no-referrer"
                      onError={() => markImageFailed(train.id)}
                      className="w-full h-full object-cover grayscale-[5%]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 p-4">
                      <TrainFront className="w-9 h-9" style={{ color: train.railHex }} />
                      <span className="text-xs font-mono-tabular uppercase tracking-wider text-zinc-400">
                        {train.railLabel}
                      </span>
                    </div>
                  )}

                  {/* Subtle bottom readability scrim */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b0b0e] via-[#0b0b0e]/65 to-transparent pointer-events-none" />

                  {/* Bottom overlay caption with rail color bar */}
                  <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-3 h-3 shrink-0 border border-black/60"
                        style={{ backgroundColor: train.railHex }}
                        aria-hidden="true"
                      />
                      <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wide text-white truncate">
                        {train.name}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-zinc-300 shrink-0">
                      {train.availability}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2.5 text-xs leading-relaxed">
                  <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-400">
                    {train.railLabel}
                  </div>

                  <div className="flex items-start gap-2 text-zinc-200">
                    <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">Visual no jogo:</strong> {train.visualCue}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-zinc-300">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-zinc-100">Som característico:</strong> {train.audioCue}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-zinc-300">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-zinc-100">Efeito:</strong> {train.effect}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-zinc-300 pt-1 border-t border-zinc-800/80">
                    <ShieldAlert className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">Como evitar:</strong> {train.dodgeTip}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 pt-1">
                <button
                  type="button"
                  onClick={() => onPlayTrainSound(train.id)}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-3.5 py-2 border border-zinc-700 bg-[#15151a] text-xs font-mono-tabular text-zinc-100 hover:border-zinc-400 hover:text-white cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{train.soundLabel}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Section 2: Boss & Locomotive Variants Across the 36 Stages */}
      <div className="border border-zinc-800 bg-[#101014] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-b border-zinc-800">
          <div className="relative aspect-video md:aspect-auto md:min-h-[156px] bg-[#070709] overflow-hidden border-b md:border-b-0 md:border-r border-zinc-800">
            {!failedImages.bossBanner ? (
              <img
                src={trainBossImg}
                alt="Cena no jogo mostrando o Leviatã de Ferro com espinhos e farol duplo sobre viaduto na neblina"
                referrerPolicy="no-referrer"
                onError={() => markImageFailed('bossBanner')}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 p-4">
                <TrainFront className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0b0b0e] to-transparent pointer-events-none" />
          </div>

          <div className="p-4 flex flex-col justify-center">
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-400">
              Modelos e Chefes · 80 Fases · 28 Bosses
            </div>
            <h3 className="font-display text-xl uppercase font-bold text-white mt-0.5">
              Locomotivas das Fases e Bosses
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed mt-1.5">
              Além da cor do trilho (Comum, Sísmico, Clarão e Vermelho), cada fase traz um modelo
              próprio de locomotiva. A partir da Fase 35, carrinhos de carvão blindados exigem 1,8x
              mais golpes e soltam moedas extras.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px bg-zinc-800">
          {TRAIN_CHASSIS.map((ch) => (
            <div key={ch.id} className="bg-[#0d0d11] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{ch.name}</span>
              </div>
              <div className="text-[11px] font-mono-tabular text-zinc-400">
                {ch.role} · {ch.phases}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-zinc-100">Movimento:</strong> {ch.behavior}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">{ch.visualNote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

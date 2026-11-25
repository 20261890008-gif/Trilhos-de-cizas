import {
  SpecialTrainKind,
  SpeedRank,
  StageConfig,
  StageTheme,
  TrainBehavior,
  TrainVariant,
} from './types';

const BASE_STAGES: StageConfig[] = [
  {
    id: 1,
    name: 'Floresta das Cinzas',
    subtitle: 'Trilhos surgem na neblina entre os pinheiros mortos.',
    theme: 'forest_ash',
    isBoss: false,
    coalCount: 5,
    supportCount: 8,
    trainVariant: 'classic',
    trainLabel: 'Locomotiva Fantasma',
    trainBehaviors: ['straight'],
    curveStrength: 0,
    fogColor: 0x0b0b0e,
    fogDensity: 0.013,
    bgColor: 0x0b0b0e,
    keyLightIntensity: 1.95,
    hemiIntensity: 0.98,
    groundBaseShade: 24,
    terrainAmplitude: 0,
    baseSpawnInterval: 4.1,
    minSpawnInterval: 1.65,
    baseDelay: 2.3,
    minDelay: 1.1,
    baseTrainSpeed: 42,
  },
  {
    id: 2,
    name: 'Abismo das Chaminés',
    subtitle: 'Boss · Fornalhas antigas e trilhos vermelhos que mudam de rumo no escuro.',
    theme: 'industrial_furnace',
    isBoss: true,
    coalCount: 6,
    supportCount: 9,
    trainVariant: 'armored_boss',
    trainLabel: 'Boss: Colosso Blindado',
    trainBehaviors: ['straight', 'curving'],
    curveStrength: 0.012,
    fogColor: 0x060608,
    fogDensity: 0.02,
    bgColor: 0x060608,
    keyLightIntensity: 0.85,
    hemiIntensity: 0.4,
    groundBaseShade: 18,
    terrainAmplitude: 2.9,
    baseSpawnInterval: 3.6,
    minSpawnInterval: 1.35,
    baseDelay: 2.1,
    minDelay: 0.96,
    baseTrainSpeed: 47,
  },
  {
    id: 3,
    name: 'Pedreira de Fuligem',
    subtitle: 'Pátio elevado com curvas fechadas do Expresso Serrado.',
    theme: 'quarry_canyon',
    isBoss: false,
    coalCount: 6,
    supportCount: 8,
    trainVariant: 'ripper',
    trainLabel: 'Expresso Serrado',
    trainBehaviors: ['straight', 'curving'],
    curveStrength: 0.018,
    fogColor: 0x151519,
    fogDensity: 0.0145,
    bgColor: 0x151519,
    keyLightIntensity: 2.15,
    hemiIntensity: 1.05,
    groundBaseShade: 36,
    terrainAmplitude: 1.4,
    baseSpawnInterval: 3.45,
    minSpawnInterval: 1.32,
    baseDelay: 1.98,
    minDelay: 0.92,
    baseTrainSpeed: 50,
  },
  {
    id: 4,
    name: 'Viaduto da Neblina',
    subtitle: 'Ponte de pedra suspensa onde o Expresso Serpente faz curvas e acelera.',
    theme: 'viaduct_bridge',
    isBoss: false,
    coalCount: 7,
    supportCount: 9,
    trainVariant: 'serpent',
    trainLabel: 'Expresso Serpente',
    trainBehaviors: ['curving', 'phantom_dash', 'straight'],
    curveStrength: 0.022,
    fogColor: 0x101319,
    fogDensity: 0.0155,
    bgColor: 0x101319,
    keyLightIntensity: 1.72,
    hemiIntensity: 0.84,
    groundBaseShade: 30,
    terrainAmplitude: 2.2,
    baseSpawnInterval: 3.25,
    minSpawnInterval: 1.25,
    baseDelay: 1.92,
    minDelay: 0.88,
    baseTrainSpeed: 52,
  },
  {
    id: 5,
    name: 'Pátio das Sombras',
    subtitle: 'Boss · Arcos sombrios, pouca luz e trilhos vermelhos imprevisíveis.',
    theme: 'cathedral_shadow',
    isBoss: true,
    coalCount: 8,
    supportCount: 10,
    trainVariant: 'carcara_boss',
    trainLabel: 'Boss: Carcará de Aço',
    trainBehaviors: ['curving', 'phantom_dash'],
    curveStrength: 0.024,
    fogColor: 0x050507,
    fogDensity: 0.022,
    bgColor: 0x050507,
    keyLightIntensity: 0.62,
    hemiIntensity: 0.28,
    groundBaseShade: 15,
    terrainAmplitude: 3.6,
    baseSpawnInterval: 3.1,
    minSpawnInterval: 1.18,
    baseDelay: 1.85,
    minDelay: 0.84,
    baseTrainSpeed: 55,
  },
  {
    id: 6,
    name: 'Cripta do Leviatã',
    subtitle: 'Boss · Águas abissais, ossadas do Leviatã, cardumes e trilhos vermelhos traiçoeiros.',
    theme: 'leviathan_sea',
    isBoss: true,
    coalCount: 9,
    supportCount: 10,
    trainVariant: 'leviathan_boss',
    trainLabel: 'Boss: Leviatã de Ferro',
    trainBehaviors: ['curving', 'phantom_dash', 'straight'],
    curveStrength: 0.025,
    fogColor: 0x050910,
    fogDensity: 0.021,
    bgColor: 0x050910,
    keyLightIntensity: 0.68,
    hemiIntensity: 0.34,
    groundBaseShade: 16,
    terrainAmplitude: 3.8,
    baseSpawnInterval: 2.95,
    minSpawnInterval: 1.1,
    baseDelay: 1.78,
    minDelay: 0.8,
    baseTrainSpeed: 58,
  },
];

const EXTRA_STAGE_TITLES: [string, string][] = [
  ['Trilho Partido', 'Passagem estreita entre pilares de escória e nevoeiro denso.'],
  ['Serraria Muda', 'Madeiras apodrecidas cercam a linha férrea cinzenta.'],
  ['Galpão das Caldeiras', 'Boss · Fornalhas antigas aquecem a névoa sob trilhos sinuosos.'],
  ['Vala de Pó', 'Depressões suaves escondem curvas fechadas no chão de carvão.'],
  ['Estação Quebrada', 'Plataformas vazias ressoam com apitos distantes.'],
  ['Fosso do Maquinista', 'Boss · Escuridão fechada com desníveis cortados por trens blindados.'],
  ['Encosta de Ferro', 'Subidas íngremes exigem saltos certeiros nos apoios.'],
  ['Bosque de Fumaça', 'Troncos escuros cercam um vale coberto de fuligem.'],
  ['Túnel Desabado', 'Boss · Colinas quebradas com investidas em alta velocidade.'],
  ['Charco de Ardósia', 'Solo cinza-claro onde a fumaça fecha o horizonte rápido.'],
  ['Desvio Norte', 'Trilhos cruzados em ângulos imprevisíveis pela planície.'],
  ['Forja Silenciosa', 'Boss · Desníveis profundos sob o olhar do Colosso de Ferro.'],
  ['Campo de Dormentes', 'Restos de madeira espalhados sob neblina espessa.'],
  ['Cânion da Bruma', 'Elevações constantes testam a leitura das curvas férreas.'],
  ['Bunker de Grafite', 'Boss · Penumbra intensa com trens relâmpago em curva.'],
  ['Ponte dos Ecos', 'Desnível sinuoso onde cada passo ecoa nos trilhos.'],
  ['Depósito de Escória', 'Montes irregulares cercam sete fontes de carvão.'],
  ['Abatedouro de Cinza', 'Boss · Pouca luz, terreno acidentado e ritmo implacável.'],
  ['Pântano Seco', 'Nevoeiro rasteiro oculta a chegada dos trilhos curvos.'],
  ['Serra dos Trilhos', 'Ondulações severas exigem velocidade contínua nos apoios.'],
  ['Catedral do Carvão', 'Boss · Arcos de sombra e investidas duplas sem trégua.'],
  ['Clavícula de Pedra', 'Terreno quebrado sob luz pálida e cinza estático.'],
  ['Estaleiro Morto', 'Vagões abandonados marcam o ritmo acelerado das passagens.'],
  ['Garganta do Vapor', 'Boss · Curvas fechadas surgem nos vales mais fundos.'],
  ['Horizonte Negro', 'Arena aberta sob fumaça espessa e trens velozes.'],
  ['Corredor de Giz', 'Contraste expressionista duro e curvas abruptas.'],
  ['Trono do Maquinista', 'Boss · Desafio sombrio com terreno inclinado e alta frequência.'],
  ['Mina Subterrânea', 'Penumbra fria onde o som guia antes dos faróis surgirem.'],
  ['Ramal do Ocaso', 'Penúltimo trecho do primeiro ciclo com carvões blindados.'],
  ['Fim do Primeiro Ramal', 'Boss · Leviatã Eterno emerge entre engrenagens e vigas sombrias.'],
  // === NOVAS 44 FASES (37..80) ===
  ['Geleira Partida', 'Placas de gelo serrilhado refletem faróis na neblina polar.'],
  ['Salina Cega', 'Deserto branco rachado de sal sob horizonte pálido e ventos secos.'],
  ['Estreito Glacial', 'Boss · Quebra-Gelo Polar rasga a crosta congelada em curvas fechadas.'],
  ['Torre de Engrenagens', 'Degraus concêntricos giram em torno de pêndulos de ferro.'],
  ['Bosque Metálico', 'Raízes de ferro retorcidas cortam o chão sob lâmpadas suspensas.'],
  ['Sino do Pêndulo', 'Boss · Pêndulo Maldito dita o ritmo com badaladas e trilhos vermelhos.'],
  ['Cratera de Basalto', 'Fendas de escória incandescente iluminam a borda vulcânica.'],
  ['Vale dos Ossos', 'Trincheiras profundas entre costelas gigantes de pedra e marfim.'],
  ['Forno Vulcânico', 'Boss · Magma Férreo sobe das fissuras de lava sobre trilhos sinuosos.'],
  ['Miragem de Sal', 'Dunas cristalinas cortadas por cristais brancos e trilhos velozes.'],
  ['Mecanismo Morto', 'Plataforma de bronze e aço marcada por dentes de engrenagem.'],
  ['Teia de Ferro', 'Boss · Aranha dos Trilhos avança com seis patas e faróis múltiplos.'],
  ['Túnel de Cristal', 'Galeria congelada onde estalactites de gelo ecoam cada buzina.'],
  ['Raízes Negras', 'Espinhos de metal cercam carvões blindados entre nevoeiro denso.'],
  ['Monólito Cinzento', 'Boss · Obelisco Negro desliza como uma pirâmide de ferro imóvel.'],
  ['Caldeira de Lava', 'Bordas íngremes obrigam saltos precisos sobre o chão rachado.'],
  ['Salão do Relógio', 'Anéis escalonados e rodas dentadas gigantes cercam toda a arena.'],
  ['Turbina Oculta', 'Boss · Turbina Fantasma rompe a bruma com duplo propulsor giratório.'],
  ['Ossuário Norte', 'Cânions gêmeos dividem o vale sob névoa fria e monolitos pálidos.'],
  ['Campo de Obsidiana', 'Lâminas vulcânicas negras contrastam com faíscas no horizonte.'],
  ['Deserto Escorpião', 'Boss · Escorpião de Aço ergue pinças e ferrão sobre o sal seco.'],
  ['Águas Congeladas', 'Bancos de gelo partido cercam trilhos rápidos na névoa azulada.'],
  ['Viga de Bronze', 'Passarela de relojoaria rangendo sob trens serrados contínuos.'],
  ['Santuário Prisma', 'Boss · Prisma Espectral reflete faróis brancos por toda a câmara.'],
  ['Maré de Cinza', 'Plataformas salinas alternam com poços estreitos e ventania.'],
  ['Mata de Espinhos', 'Troncos metálicos tortos escondem a chegada das curvas fechadas.'],
  ['Borda da Escória', 'Boss · Titã da Escória esmaga o solo com dupla blindagem pesada.'],
  ['Câmara de Gelo', 'Fendas azuis brilham sob saltos altos entre placas inclinadas.'],
  ['Trilho dos Ossos', 'Arcos de marfim lançam sombras longas nos vales paralelos.'],
  ['Campanário Negro', 'Boss · Campanário Fúnebre carrega um sino gigante na linha de frente.'],
  ['Cratera Silenciosa', 'Cinzas sobem devagar enquanto carvões blindados protegem a via.'],
  ['Relógio Submerso', 'Engrenagens cobertas de sal rangem sob a neblina espessa.'],
  ['Serraria Final', 'Boss · Moedor Supremo gira quatro serras enormes em alta rotação.'],
  ['Planalto de Sal', 'Luz estourada expressionista contrasta com o preto dos vagões.'],
  ['Abismo de Basalto', 'Paredões vulcânicos fecham o campo visual ao redor dos trilhos.'],
  ['Limiar do Vácuo', 'Boss · Espectro do Vácuo surge em armadura oca contornada de branco.'],
  ['Bosque Petrificado', 'Gelo e raízes de ferro se fundem num labirinto de sombras.'],
  ['Fosso Mecânico', 'Pêndulos oscilam sobre degraus metálicos sem trégua.'],
  ['Ninho Blindado', 'Boss · Centopeia Blindada serpenteia em múltiplos segmentos pesados.'],
  ['Cânion dos Gigantes', 'Ossadas colossais emolduram desvios repentinos dos trens.'],
  ['Muralha do Sal', 'Última planície cristalina antes da fortaleza final do ramal.'],
  ['Bastião Supremo', 'Boss · Cidadela Móvel dispara holofotes quádruplos sem pausas.'],
  ['Ante-Sala do Fim', 'Todas as formações de terreno e trens especiais em ritmo extremo.'],
  ['Horizonte Ômega', 'Boss Final · Ômega Absoluto governa a última linha férrea do abismo.'],
];

const EXTRA_STAGE_THEMES: StageTheme[] = [
  'viaduct_bridge', // 7 Trilho Partido
  'sawmill_yard', // 8 Serraria Muda
  'industrial_furnace', // 9 Galpão das Caldeiras
  'mining_cave', // 10 Vala de Pó
  'station_ruins', // 11 Estação Quebrada
  'collapsed_tunnel', // 12 Fosso do Maquinista
  'quarry_canyon', // 13 Encosta de Ferro
  'forest_ash', // 14 Bosque de Fumaça
  'collapsed_tunnel', // 15 Túnel Desabado
  'shipyard_grave', // 16 Charco de Ardósia
  'station_ruins', // 17 Desvio Norte
  'industrial_furnace', // 18 Forja Silenciosa
  'sawmill_yard', // 19 Campo de Dormentes
  'quarry_canyon', // 20 Cânion da Bruma
  'bunker_fortress', // 21 Bunker de Grafite
  'viaduct_bridge', // 22 Ponte dos Ecos
  'quarry_canyon', // 23 Depósito de Escória
  'bunker_fortress', // 24 Abatedouro de Cinza
  'shipyard_grave', // 25 Pântano Seco
  'chalk_void', // 26 Serra dos Trilhos
  'cathedral_shadow', // 27 Catedral do Carvão
  'chalk_void', // 28 Clavícula de Pedra
  'shipyard_grave', // 29 Estaleiro Morto
  'collapsed_tunnel', // 30 Garganta do Vapor
  'chalk_void', // 31 Horizonte Negro
  'chalk_void', // 32 Corredor de Giz
  'bunker_fortress', // 33 Trono do Maquinista
  'mining_cave', // 34 Mina Subterrânea
  'station_ruins', // 35 Ramal do Ocaso
  'leviathan_sea', // 36 Fim do Primeiro Ramal
  // 37..80 (44 novas fases alternando biomas novos + clássicos renovados)
  'glacier_rail', // 37
  'salt_flats', // 38
  'glacier_rail', // 39 (Boss Glacier)
  'clockwork_foundry', // 40
  'iron_forest', // 41
  'clockwork_foundry', // 42 (Boss Pendulum)
  'slag_volcano', // 43
  'bone_viaduct', // 44
  'slag_volcano', // 45 (Boss Magma)
  'salt_flats', // 46
  'clockwork_foundry', // 47
  'iron_forest', // 48 (Boss Spider)
  'glacier_rail', // 49
  'iron_forest', // 50
  'bone_viaduct', // 51 (Boss Obelisk)
  'slag_volcano', // 52
  'clockwork_foundry', // 53
  'clockwork_foundry', // 54 (Boss Turbine)
  'bone_viaduct', // 55
  'slag_volcano', // 56
  'salt_flats', // 57 (Boss Scorpion)
  'glacier_rail', // 58
  'clockwork_foundry', // 59
  'chalk_void', // 60 (Boss Prism)
  'salt_flats', // 61
  'iron_forest', // 62
  'slag_volcano', // 63 (Boss Colossus)
  'glacier_rail', // 64
  'bone_viaduct', // 65
  'cathedral_shadow', // 66 (Boss Bell)
  'slag_volcano', // 67
  'clockwork_foundry', // 68
  'sawmill_yard', // 69 (Boss Sawmill)
  'salt_flats', // 70
  'slag_volcano', // 71
  'chalk_void', // 72 (Boss Void)
  'iron_forest', // 73
  'clockwork_foundry', // 74
  'mining_cave', // 75 (Boss Centipede)
  'bone_viaduct', // 76
  'salt_flats', // 77
  'bunker_fortress', // 78 (Boss Bastion)
  'glacier_rail', // 79
  'slag_volcano', // 80 (Boss Final Omega)
];

const THEME_FOG_PALETTES: Record<StageTheme, { normal: number; boss: number; shadeOffset: number }> = {
  forest_ash: { normal: 0x0d0f0e, boss: 0x060807, shadeOffset: 2 },
  industrial_furnace: { normal: 0x130d0b, boss: 0x0c0706, shadeOffset: -2 },
  quarry_canyon: { normal: 0x161517, boss: 0x0c0b0d, shadeOffset: 6 },
  station_ruins: { normal: 0x121216, boss: 0x08080b, shadeOffset: 4 },
  cathedral_shadow: { normal: 0x0b0b10, boss: 0x050508, shadeOffset: -4 },
  leviathan_sea: { normal: 0x09131c, boss: 0x050910, shadeOffset: -2 },
  mining_cave: { normal: 0x0c0b0a, boss: 0x060505, shadeOffset: -3 },
  sawmill_yard: { normal: 0x14120f, boss: 0x0a0907, shadeOffset: 5 },
  viaduct_bridge: { normal: 0x11151d, boss: 0x080b12, shadeOffset: 5 },
  collapsed_tunnel: { normal: 0x0a0a0c, boss: 0x050507, shadeOffset: -3 },
  bunker_fortress: { normal: 0x0d0e11, boss: 0x060709, shadeOffset: 1 },
  shipyard_grave: { normal: 0x0c1213, boss: 0x060a0b, shadeOffset: 0 },
  chalk_void: { normal: 0x19191d, boss: 0x09090c, shadeOffset: 12 },
  clockwork_foundry: { normal: 0x121116, boss: 0x09080c, shadeOffset: 2 },
  salt_flats: { normal: 0x222328, boss: 0x101116, shadeOffset: 18 },
  iron_forest: { normal: 0x0b0d0e, boss: 0x050608, shadeOffset: -2 },
  slag_volcano: { normal: 0x140a08, boss: 0x0b0504, shadeOffset: -5 },
  glacier_rail: { normal: 0x0e1822, boss: 0x070d14, shadeOffset: 10 },
  bone_viaduct: { normal: 0x141312, boss: 0x090808, shadeOffset: 6 },
};

const NORMAL_TRAINS: { variant: TrainVariant; label: string }[] = [
  { variant: 'classic', label: 'Locomotiva Fantasma' },
  { variant: 'ripper', label: 'Expresso Serrado' },
  { variant: 'serpent', label: 'Expresso Serpente' },
];

const BOSS_BY_STAGE_ID: Record<number, { variant: TrainVariant; label: string }> = {
  9: { variant: 'furnace_boss', label: 'Boss: Fornalha Viva' },
  12: { variant: 'drill_boss', label: 'Boss: Escavador Abissal' },
  15: { variant: 'hammer_boss', label: 'Boss: Quebra-Rocha' },
  18: { variant: 'anvil_boss', label: 'Boss: Bigorna Negra' },
  21: { variant: 'bunker_boss', label: 'Boss: Bastilha Móvel' },
  24: { variant: 'reaper_boss', label: 'Boss: Ceifador de Trilhos' },
  27: { variant: 'cathedral_boss', label: 'Boss: Altar Sombrio' },
  30: { variant: 'hydra_boss', label: 'Boss: Hidra de Vapor' },
  33: { variant: 'sovereign_boss', label: 'Boss: Soberano Cinzento' },
  36: { variant: 'eternal_boss', label: 'Boss: Leviatã Eterno' },
  39: { variant: 'glacier_boss', label: 'Boss: Quebra-Gelo Polar' },
  42: { variant: 'pendulum_boss', label: 'Boss: Pêndulo Maldito' },
  45: { variant: 'magma_boss', label: 'Boss: Magma Férreo' },
  48: { variant: 'spider_boss', label: 'Boss: Aranha dos Trilhos' },
  51: { variant: 'obelisk_boss', label: 'Boss: Obelisco Negro' },
  54: { variant: 'turbine_boss', label: 'Boss: Turbina Fantasma' },
  57: { variant: 'scorpion_boss', label: 'Boss: Escorpião de Aço' },
  60: { variant: 'prism_boss', label: 'Boss: Prisma Espectral' },
  63: { variant: 'colossus_boss', label: 'Boss: Titã da Escória' },
  66: { variant: 'bell_boss', label: 'Boss: Campanário Fúnebre' },
  69: { variant: 'sawmill_boss', label: 'Boss: Moedor Supremo' },
  72: { variant: 'void_boss', label: 'Boss: Espectro do Vácuo' },
  75: { variant: 'centipede_boss', label: 'Boss: Centopeia Blindada' },
  78: { variant: 'bastion_boss', label: 'Boss: Cidadela Móvel' },
  80: { variant: 'omega_boss', label: 'Boss Final: Ômega Absoluto' },
};

const GENERATED_STAGES: StageConfig[] = EXTRA_STAGE_TITLES.map(([name, subtitle], idx) => {
  const id = 7 + idx;
  const theme = EXTRA_STAGE_THEMES[idx] || 'cathedral_shadow';
  const isBoss = (idx + 1) % 3 === 0 || id === 36 || id === 80;
  const earlyTier = Math.min(1, idx / 29);
  const lateTier = idx > 29 ? Math.min(1, (idx - 29) / 44) : 0;
  const trainMeta = isBoss
    ? BOSS_BY_STAGE_ID[id] || { variant: 'armored_boss' as TrainVariant, label: 'Boss: Colosso Blindado' }
    : NORMAL_TRAINS[idx % NORMAL_TRAINS.length];

  const behaviors: TrainBehavior[] = isBoss
    ? ['curving', 'phantom_dash', 'straight']
    : idx % 2 === 0
    ? ['straight', 'curving']
    : ['curving', 'phantom_dash'];

  const pal = THEME_FOG_PALETTES[theme];
  const fogHex = isBoss ? pal.boss : pal.normal;
  const isCaveOrTunnel = theme === 'mining_cave' || theme === 'collapsed_tunnel';
  const isBrightBiome = theme === 'chalk_void' || theme === 'salt_flats' || theme === 'glacier_rail';

  return {
    id,
    name,
    subtitle,
    theme,
    isBoss,
    coalCount: Math.min(14, (isBoss ? 7 : 6) + Math.floor(earlyTier * 4) + Math.floor(lateTier * 2)),
    supportCount: isBoss ? 10 + Math.floor(lateTier * 2) : 8 + (idx % 2),
    trainVariant: trainMeta.variant,
    trainLabel: trainMeta.label,
    trainBehaviors: behaviors,
    curveStrength: Number((0.015 + earlyTier * 0.014 + lateTier * 0.008).toFixed(3)),
    fogColor: fogHex,
    fogDensity: Number(
      ((isBoss ? 0.0195 : isCaveOrTunnel ? 0.016 : 0.013) + earlyTier * 0.0042 + lateTier * 0.0018).toFixed(4)
    ),
    bgColor: fogHex,
    keyLightIntensity: isBoss
      ? Number((0.78 - earlyTier * 0.16).toFixed(2))
      : isBrightBiome
      ? 2.25
      : isCaveOrTunnel
      ? 1.48
      : Number((1.95 - earlyTier * 0.3).toFixed(2)),
    hemiIntensity: isBoss
      ? Number((0.4 - earlyTier * 0.08).toFixed(2))
      : isBrightBiome
      ? 1.12
      : isCaveOrTunnel
      ? 0.72
      : Number((0.94 - earlyTier * 0.16).toFixed(2)),
    groundBaseShade: Math.max(12, Math.min(64, (isBoss ? 17 : 24) + (idx % 11) + pal.shadeOffset)),
    terrainAmplitude: isBoss
      ? Number((2.7 + earlyTier * 1.4 + lateTier * 0.85).toFixed(2))
      : Number(
          (
            (theme === 'viaduct_bridge' || theme === 'bunker_fortress'
              ? 0.75
              : 1.55 + earlyTier * 1.45) +
            lateTier * 0.65
          ).toFixed(2)
        ),
    baseSpawnInterval: Number((3.3 - earlyTier * 0.75 - lateTier * 0.28).toFixed(2)),
    minSpawnInterval: Number(Math.max(0.76, 1.3 - earlyTier * 0.36 - lateTier * 0.14).toFixed(2)),
    baseDelay: Number((1.95 - earlyTier * 0.32 - lateTier * 0.14).toFixed(2)),
    minDelay: Number(Math.max(0.66, 0.9 - earlyTier * 0.16 - lateTier * 0.06).toFixed(2)),
    baseTrainSpeed: Math.round(50 + earlyTier * 20 + lateTier * 10 + (isBoss ? 4 : 0)),
  };
});

export const STAGES: StageConfig[] = [...BASE_STAGES, ...GENERATED_STAGES];

export function isArmoredCoalCart(stage: StageConfig, coalIndex: number): boolean {
  if (stage.id < 35) return false;
  if (coalIndex === 0) return true; // Always >= 1 armored coal cart from stage 35 onwards
  if (stage.id >= 65) return coalIndex % 2 === 0;
  if (stage.id >= 48) return coalIndex % 3 === 0;
  return false;
}

export function getCoalCartMaxHp(stage: StageConfig, coalIndex: number): number {
  const baseHp = stage.isBoss ? 120 : 100;
  return isArmoredCoalCart(stage, coalIndex) ? Math.round(baseHp * 1.8) : baseHp;
}

export function groundHeightAt(x: number, z: number, stage: StageConfig): number {
  const amp = stage.terrainAmplitude;
  if (amp <= 0.01) return 0;

  const dist = Math.hypot(x, z);
  const centerBlend = Math.min(1, Math.max(0, (dist - 4) / 14));
  const phase = stage.id * 0.73;

  if (stage.theme === 'viaduct_bridge' || stage.theme === 'bunker_fortress') {
    const crown = Math.cos(dist * 0.065) * 0.55;
    const rib = Math.sin(x * 0.09 + phase) * 0.25;
    return (crown + rib) * amp * 0.42 * centerBlend;
  }

  if (stage.theme === 'quarry_canyon' || stage.theme === 'mining_cave') {
    const basin = Math.sin(dist * 0.11 + phase) * 0.45 + Math.max(0, (dist - 24) / 28) * 0.65;
    const rawStep = Math.round(basin * 3) / 3;
    return (basin * 0.65 + rawStep * 0.35) * amp * 0.58 * centerBlend;
  }

  if (stage.theme === 'clockwork_foundry') {
    // Stepped concentric gear-tooth rings
    const ringTier = Math.round(Math.sin(dist * 0.18 + phase) * 2) / 2;
    const theta = Math.atan2(z, x);
    const gearTeeth = Math.round(Math.sin(theta * 12 + phase)) * 0.28;
    return (ringTier * 0.75 + gearTeeth) * amp * 0.52 * centerBlend;
  }

  if (stage.theme === 'salt_flats') {
    // Sharp wind-carved crystalline dune crests with flat salt pans
    const dune = Math.abs(Math.sin(x * 0.068 + z * 0.042 + phase)) * 1.2 - 0.55;
    return dune * amp * 0.46 * centerBlend;
  }

  if (stage.theme === 'iron_forest') {
    // Radial root spokes snaking outward from the central arena
    const theta = Math.atan2(z, x);
    const roots = Math.pow(Math.abs(Math.sin(theta * 3.5 + dist * 0.045 + phase)), 1.6) * 1.15 - 0.35;
    return roots * amp * 0.54 * centerBlend;
  }

  if (stage.theme === 'slag_volcano') {
    // Volcanic caldera rising toward a steep outer rim with basalt ridges
    const rim = Math.max(0, (dist - 16) / 30) * 0.95;
    const magmaFold = Math.sin(x * 0.09 + phase) * Math.sin(z * 0.09 - phase) * 0.45;
    return (rim + magmaFold - 0.25) * amp * 0.62 * centerBlend;
  }

  if (stage.theme === 'glacier_rail') {
    // Jagged tilted sawtooth glacial ice shelves
    const saw = ((x * 0.045 + z * 0.032 + phase) % 2 + 2) % 2;
    const shelf = (saw < 1 ? saw : 2 - saw) * 1.35 - 0.65;
    return shelf * amp * 0.58 * centerBlend;
  }

  if (stage.theme === 'bone_viaduct') {
    // Twin parallel canyon trenches between high rib plateaus
    const trench = Math.cos(x * 0.115 + phase) * 0.85 - Math.abs(Math.sin(z * 0.055)) * 0.35;
    return trench * amp * 0.55 * centerBlend;
  }

  const freq = 0.075 + (stage.id % 5) * 0.012;
  const wave1 = Math.sin(x * freq + phase) * Math.cos(z * freq - phase * 0.6);
  const wave2 = Math.sin(x * (freq * 1.85) + z * (freq * 1.45) + phase) * 0.45;
  const ridge = Math.cos(dist * 0.13 + phase) * 0.55;

  return (wave1 + wave2 + ridge) * amp * 0.52 * centerBlend;
}

export function computeSpeedRank(speedUnitsPerSec: number): SpeedRank {
  if (speedUnitsPerSec >= 24.5) return 'S+';
  if (speedUnitsPerSec >= 20.5) return 'S';
  if (speedUnitsPerSec >= 17.0) return 'A';
  if (speedUnitsPerSec >= 13.8) return 'B';
  if (speedUnitsPerSec >= 10.5) return 'C';
  return 'D';
}

export function computeFinalRunRank(
  avgSpeed: number,
  peakSpeed: number,
  vaultsUsed: number,
  monkeysAlive: number
): SpeedRank {
  const effectiveScore =
    avgSpeed * 0.95 + peakSpeed * 0.25 + Math.min(vaultsUsed, 15) * 0.18 + monkeysAlive * 0.4;
  if (effectiveScore >= 24.0) return 'S+';
  if (effectiveScore >= 20.5) return 'S';
  if (effectiveScore >= 17.5) return 'A';
  if (effectiveScore >= 14.5) return 'B';
  if (effectiveScore >= 11.5) return 'C';
  return 'D';
}

export function computeSpecialTrainChance(stage: StageConfig, coalRatio: number): number {
  if (stage.id < 3) return 0;
  const levelNorm = Math.min(1, (stage.id - 3) / 77);
  const clampedCoal = Math.max(0, Math.min(1, coalRatio));
  const bossBonus = stage.isBoss ? 0.06 : 0;
  return Math.min(0.46, 0.1 + levelNorm * 0.16 + clampedCoal * 0.15 + bossBonus);
}

export function rollSpecialTrainKind(stage: StageConfig, coalRatio: number): SpecialTrainKind {
  const chance = computeSpecialTrainChance(stage, coalRatio);
  if (chance <= 0 || Math.random() >= chance) return 'normal';
  return Math.random() < 0.5 ? 'quake' : 'flash';
}


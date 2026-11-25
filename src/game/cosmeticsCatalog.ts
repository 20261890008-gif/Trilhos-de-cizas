export type CosmeticRarity = 'Comum' | 'Raro' | 'Lendário';

export type CosmeticSlot = 'head' | 'back';

export type CosmeticArchetype =
  // Head archetypes
  | 'legacy_top_hat'
  | 'legacy_bandana'
  | 'legacy_beanie'
  | 'legacy_conductor_cap'
  | 'legacy_iron_crown'
  | 'legacy_expr_mask'
  | 'halo_head'
  | 'crown'
  | 'wizard_hat'
  | 'witch_hat'
  | 'cowboy_hat'
  | 'straw_hat'
  | 'pirate_hat'
  | 'chef_hat'
  | 'santa_hat'
  | 'party_hat'
  | 'grad_cap'
  | 'viking_helm'
  | 'knight_helm'
  | 'samurai_helm'
  | 'astronaut_helm'
  | 'glasses'
  | 'visor'
  | 'goggles'
  | 'animal_ears'
  | 'bunny_ears'
  | 'frog_hood'
  | 'shark_hood'
  | 'horns'
  | 'antlers'
  | 'unicorn_horn'
  | 'headphones'
  | 'flower_crown'
  | 'mohawk'
  | 'afro'
  | 'propeller_cap'
  | 'beret'
  | 'hard_hat'
  | 'mushroom_cap'
  | 'mask_face'
  | 'antenna'
  | 'jester_hat'
  // Back archetypes
  | 'legacy_white_scarf'
  | 'legacy_tattered_cape'
  | 'legacy_coal_pack'
  | 'legacy_ash_halo'
  | 'angel_wings'
  | 'fairy_wings'
  | 'bat_wings'
  | 'dragon_wings'
  | 'cyber_wings'
  | 'butterfly_wings'
  | 'cape'
  | 'scarf'
  | 'jetpack'
  | 'rocket_pack'
  | 'katana_pair'
  | 'guitar'
  | 'shield_back'
  | 'quiver'
  | 'backpack'
  | 'plush_pack'
  | 'halo_back'
  | 'balloons'
  | 'surfboard'
  | 'banner'
  | 'gears_back'
  | 'wand_star'
  | 'anchor_back'
  | 'speaker_pack'
  | 'rings_back'
  | 'tail_devil';

export interface CosmeticVisualSpec {
  archetype: CosmeticArchetype;
  primaryColor: number;
  secondaryColor: number;
  emissiveColor?: number;
  scale?: number;
}

export interface CosmeticItemDef {
  id: string;
  slot: CosmeticSlot;
  name: string;
  rarity: CosmeticRarity;
  description: string;
  visual: CosmeticVisualSpec;
}

const RAW_NEW_HEAD: Array<
  [string, string, CosmeticRarity, string, CosmeticArchetype, number, number, number?]
> = [
  ['angel_halo_head', 'Auréola Celestial', 'Lendário', 'Anel dourado flutuante acima da cabeça.', 'halo_head', 0xfef08a, 0xffffff, 0xfacc15],
  ['royal_crown_gold', 'Coroa Real Dourada', 'Lendário', 'Coroa clássica adornada com rubis brilhantes.', 'crown', 0xfacc15, 0xef4444, 0x713f12],
  ['frost_crown', 'Coroa de Cristal Ártico', 'Lendário', 'Pontas translúcidas de gelo eterno.', 'crown', 0xbae6fd, 0x38bdf8, 0x0284c7],
  ['emerald_crown', 'Coroa Esmeralda', 'Raro', 'Diadema real cravejado de esmeraldas.', 'crown', 0x10b981, 0xfde047, 0x047857],
  ['obsidian_crown', 'Coroa Obsidiana', 'Lendário', 'Aro negro com cristais violeta.', 'crown', 0x1e1b4b, 0xc084fc, 0x7e22ce],
  ['wizard_hat_blue', 'Chapéu de Mago Estelar', 'Raro', 'Chapéu pontudo azul-marinho com faixa dourada.', 'wizard_hat', 0x1d4ed8, 0xfacc15, 0x1e3a8a],
  ['wizard_hat_crimson', 'Chapéu Arcano Rubi', 'Raro', 'Chapéu de feiticeiro escarlate bordado.', 'wizard_hat', 0x991b1b, 0xfde047],
  ['witch_hat_purple', 'Chapéu de Bruxa Violeta', 'Raro', 'Aba larga roxa com fivela prateada.', 'witch_hat', 0x581c87, 0xe2e8f0],
  ['witch_hat_midnight', 'Chapéu da Meia-Noite', 'Comum', 'Modelo pontudo clássico preto e laranja.', 'witch_hat', 0x18181b, 0xf97316],
  ['cowboy_hat_leather', 'Chapéu de Cowboy', 'Comum', 'Aba curvada de couro marrom do oeste.', 'cowboy_hat', 0x78350f, 0xd97706],
  ['cowboy_hat_white', 'Chapéu Xerife Branco', 'Raro', 'Chapéu claro com estrela dourada frontal.', 'cowboy_hat', 0xf8fafc, 0xfacc15],
  ['straw_hat_pirate', 'Chapéu de Palha', 'Comum', 'Palha trançada leve com fita vermelha.', 'straw_hat', 0xfde047, 0xdc2626],
  ['straw_hat_blue', 'Chapéu de Verão Azul', 'Comum', 'Palha clara com faixa turquesa.', 'straw_hat', 0xfef08a, 0x06b6d4],
  ['pirate_hat_captain', 'Bicórnio de Pirata', 'Raro', 'Chapéu do capitão com emblema branco.', 'pirate_hat', 0x18181b, 0xf8fafc],
  ['chef_hat_white', 'Chapéu de Chef', 'Comum', 'Toque alto e fofo de mestre cuca.', 'chef_hat', 0xffffff, 0xe2e8f0],
  ['santa_hat_red', 'Gorro de Papai Noel', 'Comum', 'Gorro vermelho com pompom de neve.', 'santa_hat', 0xdc2626, 0xffffff],
  ['party_hat_confetti', 'Chapéu de Festa', 'Comum', 'Cone festivo colorido com pompom.', 'party_hat', 0xec4899, 0xfacc15],
  ['grad_cap_black', 'Capelo de Formatura', 'Comum', 'Chapéu quadrado acadêmico com pingente dourado.', 'grad_cap', 0x18181b, 0xfacc15],
  ['viking_helm_iron', 'Elmo Viking', 'Raro', 'Capacete nórdico com dois chifres curvados.', 'viking_helm', 0x64748b, 0xf8fafc],
  ['viking_helm_gold', 'Elmo Valquíria Dourado', 'Lendário', 'Elmo ceremonial brilhante com chifres claros.', 'viking_helm', 0xeab308, 0xffffff, 0x713f12],
  ['knight_helm_silver', 'Elmo de Cavaleiro', 'Raro', 'Armadura prateada com pluma vermelha no topo.', 'knight_helm', 0x94a3b8, 0xdc2626],
  ['knight_helm_paladin', 'Elmo Paladino Azul', 'Lendário', 'Elmo reluzente branco com crista azul.', 'knight_helm', 0xf1f5f9, 0x2563eb],
  ['samurai_kabuto_red', 'Kabuto Samurai', 'Lendário', 'Elmo tradicional escarlate com meia-lua dourada.', 'samurai_helm', 0x991b1b, 0xfacc15],
  ['samurai_kabuto_dark', 'Kabuto Sombrio', 'Raro', 'Armadura negra com chifres prateados.', 'samurai_helm', 0x18181b, 0xe2e8f0],
  ['astronaut_helm_white', 'Capacete de Astronauta', 'Lendário', 'Visor espelhado pronto para órbita.', 'astronaut_helm', 0xf8fafc, 0x38bdf8, 0x0284c7],
  ['astronaut_helm_gold', 'Capacete Lunar Dourado', 'Lendário', 'Visor reflexivo âmbar de exploração espacial.', 'astronaut_helm', 0xe2e8f0, 0xf59e0b, 0xb45309],
  ['sunglasses_cool', 'Óculos Escuros Clássicos', 'Comum', 'Armação estilosa preta com lentes espelhadas.', 'glasses', 0x09090b, 0x38bdf8],
  ['sunglasses_neon', 'Óculos Neon Rosa', 'Raro', 'Lentes vibrantes com brilho futurista.', 'glasses', 0xf472b6, 0xfde047, 0xdb2777],
  ['cyber_visor_cyan', 'Visor Cibernético Ciano', 'Raro', 'Lente única luminosa de alta tecnologia.', 'visor', 0x0f172a, 0x22d3ee, 0x06b6d4],
  ['cyber_visor_crimson', 'Visor Laser Carmesim', 'Raro', 'Escâner tático com feixe vermelho.', 'visor', 0x18181b, 0xef4444, 0xdc2626],
  ['aviator_goggles', 'Óculos de Aviador', 'Comum', 'Faixa de couro com lentes de vidro.', 'goggles', 0x78350f, 0x7dd3fc],
  ['steampunk_goggles', 'Óculos de Latão', 'Raro', 'Lentes duplas de bronze com aro mecânico.', 'goggles', 0xb45309, 0xfef08a, 0x78350f],
  ['cat_ears_black', 'Orelhinhas de Gato Pretas', 'Comum', 'Orelhas felinas escuras com interior rosado.', 'animal_ears', 0x18181b, 0xf472b6],
  ['cat_ears_white', 'Orelhinhas de Gato Brancas', 'Comum', 'Orelhas fofas claras com toque rosa.', 'animal_ears', 0xf8fafc, 0xfb7185],
  ['fox_ears_orange', 'Orelhas de Raposa', 'Raro', 'Orelhas alaranjadas pontudas com ponta branca.', 'animal_ears', 0xea580c, 0xffffff],
  ['bear_ears_brown', 'Orelhas de Ursinho', 'Comum', 'Orelhas arredondadas de pelúcia marrom.', 'animal_ears', 0x92400e, 0xfde68a],
  ['bunny_ears_white', 'Orelhas de Coelho', 'Raro', 'Orelhas compridas brancas e rosadas.', 'bunny_ears', 0xf8fafc, 0xf472b6],
  ['bunny_ears_cyber', 'Orelhas Coelhinho Neon', 'Lendário', 'Orelhas longas com contorno luminoso azul.', 'bunny_ears', 0x1e293b, 0x38bdf8, 0x0ea5e9],
  ['frog_hood_green', 'Touca de Sapinho', 'Raro', 'Chapéu verde divertido com olhinhos saltados.', 'frog_hood', 0x22c55e, 0xffffff],
  ['shark_hood_blue', 'Capuz de Tubarão', 'Raro', 'Barbatana dorsal azul e dentes afiados.', 'shark_hood', 0x3b82f6, 0xf8fafc],
  ['demon_horns_red', 'Chifres Carmesim', 'Raro', 'Par de chifres curvados vermelho vivo.', 'horns', 0xdc2626, 0x450a0a, 0x7f1d1d],
  ['oni_horns_gold', 'Chifres Oni Dourados', 'Lendário', 'Chifres duplos de ouro reluzente.', 'horns', 0xfacc15, 0x78350f, 0x854d0e],
  ['deer_antlers', 'Galhada de Cervo', 'Raro', 'Chifres ramificados naturais da floresta.', 'antlers', 0x78350f, 0xd6d3d1],
  ['unicorn_horn_pastel', 'Chifre de Unicórnio', 'Lendário', 'Espiral dourada mágica com crina arco-íris.', 'unicorn_horn', 0xfde047, 0xf472b6, 0xf59e0b],
  ['headphones_studio', 'Fone Gamer Branco', 'Comum', 'Headset acolchoado com haste prateada.', 'headphones', 0xf8fafc, 0x1e293b],
  ['headphones_neon', 'Fone DJ Neon Roxo', 'Raro', 'Fones luminosos com detalhe magenta.', 'headphones', 0x18181b, 0xd946ef, 0xa21caf],
  ['flower_crown_spring', 'Coroa de Flores', 'Raro', 'Guirlanda colorida de margaridas e rosas.', 'flower_crown', 0x16a34a, 0xf472b6],
  ['laurel_wreath', 'Coroa de Louros', 'Raro', 'Folhas douradas dos antigos campeões.', 'flower_crown', 0xfacc15, 0xfef08a, 0x854d0e],
  ['mohawk_punk', 'Moicano Punk Vermelho', 'Comum', 'Crista espetada rebelde vermelha.', 'mohawk', 0xef4444, 0x18181b],
  ['mohawk_cyan', 'Moicano Elétrico', 'Raro', 'Crista punk azul neon vibrante.', 'mohawk', 0x06b6d4, 0xf8fafc, 0x0891b2],
  ['afro_funk', 'Black Power Clássico', 'Comum', 'Cabelo volumoso estilizado retrô.', 'afro', 0x18181b, 0x27272a],
  ['propeller_cap', 'Boné de Hélice', 'Comum', 'Boné colorido com hélice giratória no topo.', 'propeller_cap', 0x2563eb, 0xfacc15],
  ['beret_paris', 'Boina de Artista', 'Comum', 'Boina vermelha elegante inclinada de lado.', 'beret', 0xbe123c, 0x18181b],
  ['hard_hat_yellow', 'Capacete de Engenheiro', 'Comum', 'Capacete amarelo com viseira protetora.', 'hard_hat', 0xfacc15, 0xf8fafc],
  ['mushroom_cap_red', 'Chapéu de Cogumelo', 'Raro', 'Cúpula vermelha com bolinhas brancas.', 'mushroom_cap', 0xef4444, 0xffffff],
  ['kitsune_mask', 'Máscara Kitsune', 'Lendário', 'Máscara de raposa branca com marcas rubras.', 'mask_face', 0xf8fafc, 0xef4444],
  ['alien_antenna', 'Antenas Alienígenas', 'Comum', 'Haste dupla verde com esferas luminosas.', 'antenna', 0x22c55e, 0xa3e635, 0x4d7c0f],
  ['jester_hat', 'Chapéu de Bobo da Corte', 'Raro', 'Duas pontas coloridas com guizos dourados.', 'jester_hat', 0x7c3aed, 0xfacc15],
];

const RAW_NEW_BACK: Array<
  [string, string, CosmeticRarity, string, CosmeticArchetype, number, number, number?]
> = [
  ['angel_wings', 'Asinhas de Anjo', 'Lendário', 'Par de asas brancas emplumadas com brilho celestial.', 'angel_wings', 0xffffff, 0xfef08a, 0xe2e8f0],
  ['angel_wings_gold', 'Asas de Serafim Douradas', 'Lendário', 'Asas radiantes banhadas a ouro celestial.', 'angel_wings', 0xfef08a, 0xfacc15, 0xca8a04],
  ['angel_wings_rose', 'Asas de Anjo Rosé', 'Raro', 'Asas delicadas em tons branco e rosa suave.', 'angel_wings', 0xffe4e6, 0xfb7185, 0xf43f5e],
  ['angel_wings_sky', 'Asas Celestes Azuis', 'Raro', 'Plumas brancas com reflexo azul-celeste.', 'angel_wings', 0xe0f2fe, 0x38bdf8, 0x0284c7],
  ['fairy_wings_mint', 'Asas de Fada Esmeralda', 'Raro', 'Asas translúcidas cintilantes cor de menta.', 'fairy_wings', 0x6ee7b7, 0xd1fae5, 0x10b981],
  ['fairy_wings_violet', 'Asas de Fada Cristal', 'Raro', 'Asas delicadas em lilás mágico luminoso.', 'fairy_wings', 0xd8b4fe, 0xf472b6, 0xa855f7],
  ['butterfly_wings_monarch', 'Asas de Borboleta Monarca', 'Raro', 'Asas vibrantes laranja com bordas negras.', 'butterfly_wings', 0xf97316, 0x18181b],
  ['butterfly_wings_morpho', 'Asas Borboleta Azul', 'Lendário', 'Asas iridescentes azul-cobalto brilhantes.', 'butterfly_wings', 0x2563eb, 0x93c5fd, 0x1d4ed8],
  ['bat_wings_midnight', 'Asas de Morcego', 'Raro', 'Asas noturnas membranosas roxo-escuras.', 'bat_wings', 0x27272a, 0x7e22ce],
  ['bat_wings_vampire', 'Asas Carmesim Noturnas', 'Raro', 'Asas pontudas pretas com membrana rubra.', 'bat_wings', 0x18181b, 0x991b1b],
  ['dragon_wings_crimson', 'Asas de Dragão Rubro', 'Lendário', 'Asas imponentes com garras e escamas escarlates.', 'dragon_wings', 0x991b1b, 0xf59e0b, 0x7f1d1d],
  ['dragon_wings_obsidian', 'Asas de Dragão Abissal', 'Lendário', 'Asas sombrias com energia violeta.', 'dragon_wings', 0x0f172a, 0xa855f7, 0x6b21a8],
  ['cyber_wings_cyan', 'Asas Holográficas Ciano', 'Lendário', 'Propulsores geométricos de energia azul.', 'cyber_wings', 0x0f172a, 0x22d3ee, 0x06b6d4],
  ['cyber_wings_gold', 'Asas Mecânicas Solares', 'Lendário', 'Lâminas articuladas douradas de alta velocidade.', 'cyber_wings', 0xfacc15, 0xf8fafc, 0xb45309],
  ['phoenix_wings', 'Asas de Fênix Flamejante', 'Lendário', 'Plumas incandescentes laranja e ouro.', 'angel_wings', 0xf97316, 0xfacc15, 0xea580c],
  ['cape_royal_red', 'Capa Real Escarlate', 'Raro', 'Manto comprido vermelho com gola dourada.', 'cape', 0xb91c1c, 0xfacc15],
  ['cape_azure_knight', 'Capa do Cavaleiro Azul', 'Comum', 'Manto azul-marinho resistente ao vento.', 'cape', 0x1d4ed8, 0xe2e8f0],
  ['cape_emerald_forest', 'Capa do Guardião Verde', 'Comum', 'Manto florestal com broche prateado.', 'cape', 0x15803d, 0xfde047],
  ['cape_starlight', 'Manto Estelar Cósmico', 'Lendário', 'Capa roxa profunda com brilho estelar.', 'cape', 0x312e81, 0xc084fc, 0x6d28d9],
  ['cape_sunny_yellow', 'Capa do Relâmpago', 'Comum', 'Capa amarela brilhante de herói veloz.', 'cape', 0xeab308, 0xffffff],
  ['scarf_crimson', 'Cachecol Vermelho', 'Comum', 'Cachecol esvoaçante vermelho vibrante.', 'scarf', 0xdc2626, 0xf8fafc],
  ['scarf_rainbow', 'Cachecol Arco-Íris', 'Raro', 'Faixa multicolorida alegre ao vento.', 'scarf', 0xf43f5e, 0x38bdf8],
  ['scarf_mint', 'Cachecol Turquesa', 'Comum', 'Tecido macio azul-piscina para corridas.', 'scarf', 0x14b8a6, 0xe2e8f0],
  ['jetpack_chrome', 'Jetpack Cromado', 'Lendário', 'Mochila a jato prateada com propulsores duplos.', 'jetpack', 0xcbd5e1, 0x38bdf8, 0x0284c7],
  ['jetpack_retro', 'Jetpack Retrô Vermelho', 'Raro', 'Propulsor clássico de foguetes vermelhos.', 'jetpack', 0xdc2626, 0xfacc15, 0xea580c],
  ['rocket_pack_space', 'Foguete Espacial', 'Raro', 'Foguete branco e laranja amarrado nas costas.', 'rocket_pack', 0xf8fafc, 0xf97316, 0xea580c],
  ['rocket_pack_neon', 'Turbo Foguete Roxo', 'Raro', 'Cilindro energético com chama magenta.', 'rocket_pack', 0x1e1b4b, 0xe879f9, 0xc026d3],
  ['katana_duo_crimson', 'Katanas Cruzadas', 'Raro', 'Duas espadas samurais em bainhas pretas.', 'katana_pair', 0x18181b, 0xef4444],
  ['katana_duo_gold', 'Katanas Celestiais', 'Lendário', 'Espadas gêmeas com punhos dourados.', 'katana_pair', 0xe2e8f0, 0xfacc15],
  ['electric_guitar_red', 'Guitarra Elétrica Rubi', 'Raro', 'Instrumento de rock vermelho pronto pro solo.', 'guitar', 0xdc2626, 0xf8fafc],
  ['electric_guitar_blue', 'Guitarra Relâmpago Azul', 'Raro', 'Guitarra estilosa azul elétrico e branca.', 'guitar', 0x2563eb, 0x38bdf8],
  ['acoustic_guitar', 'Violão Acústico', 'Comum', 'Violão clássico de madeira clara nas costas.', 'guitar', 0xb45309, 0xfde68a],
  ['shield_back_royal', 'Escudo Real nas Costas', 'Raro', 'Escudo medieval azul com borda de ouro.', 'shield_back', 0x1d4ed8, 0xfacc15],
  ['shield_back_viking', 'Escudo Nórdico Redondo', 'Comum', 'Escudo de madeira reforçado com ferro.', 'shield_back', 0x78350f, 0x94a3b8],
  ['quiver_archer', 'Aljava do Arqueiro', 'Comum', 'Estojo de couro repleto de flechas emplumadas.', 'quiver', 0x78350f, 0xfef08a],
  ['quiver_crystal', 'Aljava Élfica Prateada', 'Raro', 'Flechas brilhantes de cristal azul.', 'quiver', 0x475569, 0x38bdf8, 0x0ea5e9],
  ['backpack_adventure', 'Mochila de Aventureiro', 'Comum', 'Mochila verde-oliva com cantil e bolsos.', 'backpack', 0x15803d, 0xd97706],
  ['backpack_school', 'Mochila Escolar Azul', 'Comum', 'Mochila clássica azul com zíper branco.', 'backpack', 0x2563eb, 0xf8fafc],
  ['backpack_pink', 'Mochila Pastel Rosa', 'Comum', 'Mochila leve rosa-chiclete estilizada.', 'backpack', 0xf472b6, 0xffffff],
  ['plush_bear_pack', 'Ursinho de Pelúcia', 'Raro', 'Ursinho fofo agarrado nas suas costas.', 'plush_pack', 0xb45309, 0xfde68a],
  ['plush_panda_pack', 'Pandinha nas Costas', 'Raro', 'Filhote de panda branco e preto nas costas.', 'plush_pack', 0xf8fafc, 0x18181b],
  ['halo_golden_back', 'Anel Solar Sagrado', 'Lendário', 'Grande roda dourada radiante atrás dos ombros.', 'halo_back', 0xfacc15, 0xffffff, 0xeab308],
  ['halo_neon_back', 'Anel Cibernético Violeta', 'Lendário', 'Círculo de energia neon flutuante.', 'halo_back', 0xc084fc, 0x38bdf8, 0x9333ea],
  ['balloons_party', 'Balões Coloridos', 'Raro', 'Três balões flutuantes presos às costas.', 'balloons', 0xef4444, 0x38bdf8],
  ['surfboard_summer', 'Prancha de Surf Tropical', 'Raro', 'Prancha branca com listras azul-turquesa.', 'surfboard', 0xf8fafc, 0x06b6d4],
  ['skate_street', 'Skate Urbano', 'Comum', 'Shape de madeira colorido com rodinhas.', 'surfboard', 0xf59e0b, 0xef4444],
  ['samurai_banner', 'Estandarte Samurai', 'Raro', 'Bandeira vertical escarlate com símbolo branco.', 'banner', 0xb91c1c, 0xf8fafc],
  ['clockwork_gears', 'Engrenagens Douradas', 'Raro', 'Mecanismo giratório steampunk de latão.', 'gears_back', 0xd97706, 0xfde047],
  ['star_wand_back', 'Cajado Estelar Mágico', 'Raro', 'Cetro com estrela brilhante preso às costas.', 'wand_star', 0xf472b6, 0xfef08a, 0xec4899],
  ['anchor_sea', 'Âncora Pirata', 'Raro', 'Âncora pesada de navio presa no ombro.', 'anchor_back', 0x64748b, 0xe2e8f0],
  ['dj_speaker_pack', 'Caixa de Som Portátil', 'Raro', 'Subwoofer duplo pulsante para animar a corrida.', 'speaker_pack', 0x18181b, 0x22d3ee, 0x0891b2],
  ['cosmic_rings', 'Órbitas Cósmicas', 'Lendário', 'Anéis cruzados brilhantes flutuando atrás.', 'rings_back', 0x38bdf8, 0xfacc15, 0x0284c7],
  ['devil_tail_red', 'Cauda Endiabrada', 'Comum', 'Cauda curva vermelha com ponta triangular.', 'tail_devil', 0xdc2626, 0x7f1d1d],
  ['crystal_shards_back', 'Cristais Flutuantes', 'Lendário', 'Gemas azuis levitando em arco atrás.', 'rings_back', 0x67e8f9, 0xa855f7, 0x06b6d4],
  ['snowboard_frost', 'Prancha Glacial', 'Comum', 'Prancha de neve azul e prata nas costas.', 'surfboard', 0x3b82f6, 0xe2e8f0],
  ['bamboo_bundle', 'Bambus da Floresta', 'Comum', 'Feixe verde preso com corda rústica.', 'quiver', 0x22c55e, 0xd97706],
];

const LEGACY_COSMETICS: CosmeticItemDef[] = [
  {
    id: 'top_hat',
    slot: 'head',
    name: 'Cartola Sombria',
    rarity: 'Comum',
    description: 'Chapéu alto do velho condutor das cinzas.',
    visual: { archetype: 'legacy_top_hat', primaryColor: 0x111115, secondaryColor: 0xe8e8f0 },
  },
  {
    id: 'bandana',
    slot: 'head',
    name: 'Faixa de Carvão',
    rarity: 'Comum',
    description: 'Faixa branca amarrada firme para saltos velozes.',
    visual: { archetype: 'legacy_bandana', primaryColor: 0xe8e8f0, secondaryColor: 0xe8e8f0 },
  },
  {
    id: 'beanie',
    slot: 'head',
    name: 'Gorro do Operário',
    rarity: 'Comum',
    description: 'Gorro cinza usado nos pátios da ferrovia.',
    visual: { archetype: 'legacy_beanie', primaryColor: 0xe8e8f0, secondaryColor: 0xe8e8f0 },
  },
  {
    id: 'conductor_cap',
    slot: 'head',
    name: 'Quepe de Maquinista',
    rarity: 'Raro',
    description: 'Insígnia metálica roubada da cabine do trem.',
    visual: { archetype: 'legacy_conductor_cap', primaryColor: 0x111115, secondaryColor: 0xe8e8f0 },
  },
  {
    id: 'expr_mask',
    slot: 'head',
    name: 'Máscara Expressionista',
    rarity: 'Raro',
    description: 'Semblante rígido de giz branco na escuridão.',
    visual: { archetype: 'legacy_expr_mask', primaryColor: 0xe8e8f0, secondaryColor: 0x111115 },
  },
  {
    id: 'iron_crown',
    slot: 'head',
    name: 'Coroa de Ferro',
    rarity: 'Lendário',
    description: 'Pontas forjadas de trilhos retorcidos.',
    visual: { archetype: 'legacy_iron_crown', primaryColor: 0x111115, secondaryColor: 0xe8e8f0 },
  },
  {
    id: 'white_scarf',
    slot: 'back',
    name: 'Cachecol de Névoa',
    rarity: 'Comum',
    description: 'Pano claro que esvoaça atrás do salto.',
    visual: { archetype: 'legacy_white_scarf', primaryColor: 0xe8e8f0, secondaryColor: 0xe8e8f0 },
  },
  {
    id: 'tattered_cape',
    slot: 'back',
    name: 'Capa Rasgada',
    rarity: 'Raro',
    description: 'Manto escuro gasto pela fumaça das caldeiras.',
    visual: { archetype: 'legacy_tattered_cape', primaryColor: 0x282830, secondaryColor: 0x282830 },
  },
  {
    id: 'coal_pack',
    slot: 'back',
    name: 'Mochila de Brasa',
    rarity: 'Raro',
    description: 'Cilindro de fuligem com núcleo incandescente.',
    visual: { archetype: 'legacy_coal_pack', primaryColor: 0x111115, secondaryColor: 0xf4f4f8 },
  },
  {
    id: 'ash_halo',
    slot: 'back',
    name: 'Auréola de Fuligem',
    rarity: 'Lendário',
    description: 'Anel metálico suspenso nas costas do macaco.',
    visual: { archetype: 'legacy_ash_halo', primaryColor: 0xe8e8f0, secondaryColor: 0xe8e8f0 },
  },
];

export const COSMETICS: CosmeticItemDef[] = [
  ...LEGACY_COSMETICS,
  ...RAW_NEW_HEAD.map(
    ([id, name, rarity, description, archetype, primaryColor, secondaryColor, emissiveColor]): CosmeticItemDef => ({
      id,
      slot: 'head',
      name,
      rarity,
      description,
      visual: { archetype, primaryColor, secondaryColor, emissiveColor },
    })
  ),
  ...RAW_NEW_BACK.map(
    ([id, name, rarity, description, archetype, primaryColor, secondaryColor, emissiveColor]): CosmeticItemDef => ({
      id,
      slot: 'back',
      name,
      rarity,
      description,
      visual: { archetype, primaryColor, secondaryColor, emissiveColor },
    })
  ),
];

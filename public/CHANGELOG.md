# Crônicas do Reino — Changelog e funcionalidades

Atualizado em 10/11/2026. Baseado no histórico de desenvolvimento e na versão do projeto enviada nesta conversa. Alguns recursos ainda precisam de validação visual e multiplayer completa.

## Novidades — Bestiário e carregamento
- Bestiário do portal agora lista os 11 tipos de monstros cadastrados nos spawns, com visual, níveis, armas e drops de referência.
- Tela **Carregando jogo** com progresso de carregamento dos recursos do Phaser e etapa de preparação LPC.
- O carregamento dos milhares de sprites pode continuar pesado: a barra informa o andamento, mas não substitui otimização de assets.

## Mundo e multiplayer
- Mundo 2D em Phaser, mapas Tiled, movimentação e combate multiplayer com servidor Node.js.
- Sistema de coordenadas e andares do mapa.
- Monstros com perseguição, dano, morte, loot e respawn para testes.
- Spawns de teste organizados em linhas horizontais, com 5 tiles entre tipos.

## Personagens e equipamentos
- Criador de personagens baseado em recursos Universal LPC, com seleção de corpo, rosto, cabelo, barba, bigode, orelhas, cauda e asas.
- Seletores de cores hexadecimais e composição visual de camadas.
- Equipamento de armas corpo a corpo com sprites LPC e animações de caminhada/ataque.
- Armas melee mantidas: Dagger, Longsword, Sabre, Rapier, War Axe, Flail, Mace, Halberd e Scythe.
- Axe comum e Long Spear removidas do catálogo e das variações de monstros.

## Monstros e loot
- Skeleton original e variações Red, Yellow, Black, Green, Ice e Purple.
- Lizard nas versões White, Dark, Gold e Green.
- Cada monstro nasce com uma arma melee aleatória e deixa cair a arma correspondente ao morrer.
- Loot com itens e ouro; inventário, pilhas de itens e coleta no mundo.

## Interface e site
- Inventário e painel de personagem, chat, minimapa e interface de NPC/loja.
- Portal com notícias, ranking, Items List alimentada pelos JSONs dos itens e Bestiário.
- Comando de teste `/i nome do item` para gerar itens; atualmente aberto aos jogadores, devendo ser restringido antes de publicar.

## Em desenvolvimento
- Otimização do carregamento: atualmente são carregadas milhares de imagens de monstros/armas na entrada.
- Ajustes finos de animações oversize e sobreposição de armas.
- Testes de desempenho com muitos monstros, mapas e jogadores simultâneos.
- Revisão de permissões administrativas e balanceamento.

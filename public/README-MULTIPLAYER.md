# Multiplayer experimental — RPG Phaser

## O que foi implementado
- Conexão WebSocket autenticada com a sessão existente, sem novas dependências.
- Jogadores da mesma instância do servidor aparecem uns para os outros, com nome, nível e animações de caminhada.
- Entrada, saída e posição dos jogadores sincronizadas em intervalos de aproximadamente 100 ms.
- Vida, morte e respawn dos Skeletons compartilhados pelo servidor; ataques são enviados ao servidor.
- Inventário, login e salvamento por personagem permanecem no SQLite.

## Como iniciar
No diretório `public`, execute `npm install`, `npm run build`, depois `ADMIN_PASSWORD=uma-senha-forte npm start` (no PowerShell: `$env:ADMIN_PASSWORD='uma-senha-forte'; npm start`). Acesse `http://localhost:3000` em dois navegadores/contas diferentes e entre com personagens diferentes.

## Limitações IMPORTANTES — não é um MMORPG pronto para produção
- A IA, o deslocamento e os ataques dos monstros **ainda são calculados em cada cliente**; somente vida/morte/respawn são sincronizados. Portanto, posições e ataques de monstros podem divergir entre jogadores.
- O servidor limita o dano recebido, mas ainda não verifica integralmente arma, atributos, inventário, alcance, velocidade e colisões. **Não publique como jogo competitivo ou com economia real** sem reescrever o combate de modo autoritativo.
- Recompensas/loot continuam sendo gerados no cliente que finalizou o monstro; isso também exige migração para o servidor.
- O servidor ainda não impõe limite de velocidade de deslocamento; movimentos recebidos são reproduzidos.
- O transporte WebSocket implementado é básico e não oferece todas as proteções e funcionalidades de bibliotecas especializadas.
- Não há chat, grupos, mapas instanciados, escalabilidade horizontal ou persistência do estado dos monstros após reiniciar o servidor.
- A compilação completa e o teste gráfico dependem de instalar as dependências e abrir o jogo em um navegador; este pacote não foi validado como MMORPG pronto.

## Próxima etapa recomendada
Mover IA, posicionamento, aggro, ataques, experiência, loot e validação de movimento para o servidor; trocar o transporte WebSocket básico por uma biblioteca consolidada; adicionar reconexão, interpolação e testes de carga.

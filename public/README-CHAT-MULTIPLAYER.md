# RPG Multiplayer — Chat e barras de vida

## Instalação
Execute `npm install`, `npm run build` e `npm run start` na pasta `public`.
Na primeira execução configure ADMIN_PASSWORD (mínimo 10 caracteres).
Abra dois navegadores com contas/personagens distintos para testar.

## Implementado
- Barra de vida sobre os jogadores remotos, sincronizada por WebSocket.
- Aviso de desconexão ao fechar o servidor, com bloqueio da movimentação local.
- Chat Local: recebido somente se o emissor estiver dentro da câmera do destinatário e da distância máxima aproximada do servidor.
- Chat Global: débito de 50 Gold por mensagem aceito pelo servidor; saldo insuficiente bloqueia envio.
- Chat Log: dano causado/recebido, morte de monstro e loot gerado no cliente que o matou, com horário local.
- Limite de 180 caracteres e intervalo mínimo de 900ms por mensagem.

## Limitações importantes
Esta versão é experimental. O cliente ainda calcula movimento/ataques de monstros, loot e outras recompensas. O servidor não valida integralmente o progresso enviado pelo navegador. O Chat Log não é um registro auditável compartilhado. O custo do chat é persistido no servidor, mas o sistema econômico inteiro precisa migrar para transações autoritativas para evitar manipulações e conflitos de salvamento. Não disponibilize publicamente como MMORPG seguro antes dessa etapa.

## Testes
Sintaxe JS verificada. Build Vite não pôde ser executado no ambiente de entrega devido às dependências Windows incluídas no ZIP (Rollup nativo Linux ausente). Execute npm install e npm run build no seu Windows.

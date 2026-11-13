# RPG com contas e personagens

## Requisitos
Node.js 22.13 ou superior. O backend usa SQLite nativo (`node:sqlite`), sem MySQL e sem dependências extras.

## Iniciar
No PowerShell, dentro da pasta do projeto:

```powershell
$env:ADMIN_PASSWORD="SUA_SENHA_FORTE_AQUI"
npm install
npm run build
npm run start
```

Abra http://localhost:3000. A conta `adm` é criada apenas na primeira inicialização com a senha definida em `ADMIN_PASSWORD`. **Não foi configurada a senha fraca `adm`**. Escolha senha forte, não compartilhe.

Em desenvolvimento, execute `npm run dev` em outro terminal e abra o endereço do servidor `http://localhost:3000`; para produção, execute o build e hospede o Node com armazenamento persistente. O servidor serve o diretório `dist` gerado por `npm run build`. Após alterações no código, execute o build novamente. Para publicação, configure proxy reverso HTTPS e restrições de acesso. O servidor incluído é uma base funcional local, não uma configuração de produção endurecida.

O banco é criado em `server-data/game.sqlite`; faça backup desse arquivo e do WAL. Cada conta possui até cinco personagens. O progresso antigo em localStorage **não é migrado automaticamente** para evitar atribuí-lo à conta errada.

O servidor registra datas em UTC. A aparência inicial usa os sprites existentes. Os rankings são públicos.

## Observações
- O salvamento ocorre por API e não mais pelo localStorage. Não há sincronização em tempo real entre abas; evite abrir o mesmo personagem em duas abas.
- O login usa cookie HttpOnly e hash scrypt para senhas. Configure HTTPS, `COOKIE_SECURE=1`, rate limiting, proteção CSRF reforçada e monitoramento antes de disponibilizar publicamente.
- O servidor exige senha administrativa segura, informada por variável de ambiente.

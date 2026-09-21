---
name: sync-upstream
description: >-
  Sincroniza o branch local com as últimas atualizações do repositório original (upstream) antes de iniciar qualquer desenvolvimento, alteração de código ou criação de branch/feature.
---

# Sync Upstream (Ikabot Fork)

Esta skill define o procedimento obrigatório para sincronizar o repositório local e o fork pessoal com as novidades do repositório original (`upstream/master`).

## Quando Usar

- **Sempre** no início de uma nova sessão ou antes de começar a implementar novas funcionalidades, correções de bugs ou alterações nos arquivos.
- Quando o usuário solicitar sincronizar, atualizar ou fazer pull do repositório original/upstream.

---

## Procedimento de Execução Passo a Passo

### Passo 1: Verificar se a árvore de trabalho está limpa
Antes de qualquer pull ou rebase, certifique-se de que não há alterações pendentes sem commit:

```bash
git status --porcelain
```

- Se houver arquivos modificados não commitados:
  - Salve com commit caso sejam alterações intencionais:
    ```bash
    git add .
    git commit -m "wip: salva alterações locais antes de sincronizar"
    ```
  - Ou guarde temporariamente com stash:
    ```bash
    git stash
    ```

---

### Passo 2: Buscar as novidades do repositório original (`upstream`)
Busque as referências e commits mais recentes sem alterar a branch local imediatamente:

```bash
git fetch upstream master
```

---

### Passo 3: Verificar se há novos commits no original
Verifique a quantidade de commits que o `upstream/master` está à frente do seu branch local:

```bash
git rev-list HEAD..upstream/master --count
```

- Se o resultado for `0`: O repositório já está 100% atualizado com o original. Pode prosseguir com as tarefas normais.
- Se for maior que `0`: Há novos commits. Prossiga para o Passo 4.

---

### Passo 4: Aplicar as novidades via Rebase
Reaplique os commits locais sobre a versão mais recente do upstream:

```bash
git pull upstream master --rebase
```

#### Resolução de Conflitos (se houver):
1. Verifique quais arquivos entraram em conflito:
   ```bash
   git status
   ```
2. Resolva os conflitos respeitando as seguintes regras do projeto:
   - **Mantenha** as correções e novidades técnicas vindas do `upstream`.
   - **Preserve** todas as integrações da nossa interface web personalizada (arquivos em `ikabot/ui/`, `run_web.py`, fallbacks de token em `ikabot/helpers/apiComm.py`, hooks de login em `ikabot/web/session.py`, etc.).
3. Adicione os arquivos resolvidos e prossiga o rebase:
   ```bash
   git add <arquivo-resolvido>
   git -c core.editor=true rebase --continue
   ```

---

### Passo 5: Atualizar o seu Fork no GitHub (`origin`)
Após concluir o rebase local com sucesso, envie o branch atualizado para o seu repositório pessoal:

```bash
git push origin master
```

---

### Passo 6: Restaurar Stash (se foi utilizado no Passo 1)
Se você guardou alterações no stash no Passo 1, restaure-as agora:

```bash
git stash pop
```

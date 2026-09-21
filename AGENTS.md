# Regras do Projeto (Ikabot Fork)

## Diretriz Obrigatória: Sincronização Prévia com o Upstream

Antes de iniciar qualquer tarefa de desenvolvimento, refatoração, implementação de novas features ou correção de bugs neste repositório:

1. **Sempre verificar o upstream primeiro**:
   O agente deve verificar se o branch local está atualizado com o repositório original (`upstream/master`).
   Use o procedimento detalhado na skill `sync-upstream` ([SKILL.md](file:///.agents/skills/sync-upstream/SKILL.md)) ou execute o script auxiliar:
   ```powershell
   .\.agents\skills\sync-upstream\scripts\sync.ps1
   ```

2. **Destino de Pushes**:
   - **NUNCA** fazer push para o `upstream` (o remote original).
   - Todos os commits e pushes devem ser enviados exclusivamente para o `origin` (o fork pessoal no GitHub: `https://github.com/leopoliveira/ikabot`).

3. **Integridade da Interface Web**:
   - Em caso de conflitos durante atualizações vindas do `upstream`, preserve sempre todas as customizações da interface web (`run_web.py`, diretório `ikabot/ui/`, adaptações no `ikabot/web/session.py` e fallbacks de conectividade em `ikabot/helpers/apiComm.py`).

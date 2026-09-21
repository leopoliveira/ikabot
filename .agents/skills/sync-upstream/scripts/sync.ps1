# Sincronizador Automático com Upstream
$ErrorActionPreference = "Stop"

Write-Host "==> Verificando status do repositório local..." -ForegroundColor Cyan
$status = git status --porcelain
if ($status) {
    Write-Host "[!] Há alterações não commitadas. Salvando em commit WIP temporário..." -ForegroundColor Yellow
    git add .
    git commit -m "wip: salvar estado antes do sync com upstream"
}

Write-Host "==> Buscando atualizações do upstream..." -ForegroundColor Cyan
git fetch upstream master

$diffCount = (git rev-list HEAD..upstream/master --count).Trim()
if ($diffCount -eq "0") {
    Write-Host "[✓] O repositório já está 100% atualizado com o upstream!" -ForegroundColor Green
    exit 0
}

Write-Host "==> Foram encontrados $diffCount novo(s) commit(s) no upstream. Aplicando rebase..." -ForegroundColor Yellow
git -c core.editor=true pull upstream master --rebase

Write-Host "==> Atualizando o seu fork pessoal (origin)..." -ForegroundColor Cyan
git push origin master

Write-Host "[✓] Sincronização concluída com sucesso!" -ForegroundColor Green

# ColorManager Firewall Setup
# Abre el puerto 9100 en el firewall de Windows
# Ejecutar como Administrador

$port = 9100
$ruleName = "ColorManager Printer Port"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACION DE FIREWALL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya existe la regla
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "[INFO] La regla ya existe, actualizando..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
}

# Crear regla de entrada para TCP
try {
    New-NetFirewallRule -DisplayName $ruleName `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $port `
        -Action Allow `
        -Profile Any `
        -Description "Permite conexiones al puerto $port para ColorManager Printer" | Out-Null
    
    Write-Host "[OK] Regla de firewall creada:" -ForegroundColor Green
    Write-Host "     Nombre: $ruleName" -ForegroundColor Gray
    Write-Host "     Puerto: $port TCP (entrada)" -ForegroundColor Gray
    Write-Host "     Accion: Permitir" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] No se pudo crear la regla: $_" -ForegroundColor Red
    exit 1
}

# También permitir el ejecutable de ColorManager
$colorManagerPaths = @(
    "$env:LOCALAPPDATA\Programs\ColorManager\ColorManager.exe",
    "$env:ProgramFiles\ColorManager\ColorManager.exe"
)

foreach ($exePath in $colorManagerPaths) {
    if (Test-Path $exePath) {
        $appRuleName = "ColorManager Application"
        $existingAppRule = Get-NetFirewallRule -DisplayName $appRuleName -ErrorAction SilentlyContinue
        
        if (-not $existingAppRule) {
            try {
                New-NetFirewallRule -DisplayName $appRuleName `
                    -Direction Inbound `
                    -Program $exePath `
                    -Action Allow `
                    -Profile Any `
                    -Description "Permite conexiones entrantes a ColorManager" | Out-Null
                
                Write-Host "[OK] Regla para aplicacion creada: $exePath" -ForegroundColor Green
            } catch {
                Write-Host "[WARN] No se pudo crear regla para aplicacion: $_" -ForegroundColor Yellow
            }
        }
        break
    }
}

Write-Host ""
Write-Host "[OK] Firewall configurado correctamente!" -ForegroundColor Green
Write-Host ""

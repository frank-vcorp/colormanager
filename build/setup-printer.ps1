# ColorManager Printer Installer Script
# Crea puerto TCP/IP y impresora virtual para recibir recetas de Sayer
# IMPL-20260204-03

param(
    [string]$Action = "install"
)

$portName = "ColorManager_9100"
$printerName = "ColorManager Printer"
$hostAddress = "127.0.0.1"
$portNumber = 9100

function Install-ColorManagerPrinter {
    Write-Host "Configurando impresora ColorManager..." -ForegroundColor Cyan
    
    # Verificar si el puerto existe
    $portExists = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    if (-not $portExists) {
        try {
            Add-PrinterPort -Name $portName -PrinterHostAddress $hostAddress -PortNumber $portNumber
            Write-Host "  [OK] Puerto TCP/IP creado: $portName" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] No se pudo crear el puerto: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [OK] Puerto ya existe: $portName" -ForegroundColor Green
    }
    
    # Verificar si la impresora existe
    $printerExists = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if (-not $printerExists) {
        try {
            Add-Printer -Name $printerName -DriverName "Generic / Text Only" -PortName $portName
            Write-Host "  [OK] Impresora creada: $printerName" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] No se pudo crear la impresora: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [OK] Impresora ya existe: $printerName" -ForegroundColor Green
    }
    
    Write-Host "Configuracion completada." -ForegroundColor Cyan
}

function Uninstall-ColorManagerPrinter {
    Write-Host "Removiendo impresora ColorManager..." -ForegroundColor Cyan
    
    # Remover impresora
    $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($printer) {
        try {
            Remove-Printer -Name $printerName
            Write-Host "  [OK] Impresora removida: $printerName" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] No se pudo remover la impresora: $_" -ForegroundColor Yellow
        }
    }
    
    Start-Sleep -Seconds 1
    
    # Remover puerto
    $port = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    if ($port) {
        try {
            Remove-PrinterPort -Name $portName
            Write-Host "  [OK] Puerto removido: $portName" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] No se pudo remover el puerto: $_" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Limpieza completada." -ForegroundColor Cyan
}

# Ejecutar accion
switch ($Action.ToLower()) {
    "install" { Install-ColorManagerPrinter }
    "uninstall" { Uninstall-ColorManagerPrinter }
    default { Write-Host "Uso: .\setup-printer.ps1 -Action [install|uninstall]" }
}

# ColorManager Printer Installer Script
# Crea puerto TCP/IP y impresora virtual para recibir recetas de Sayer
# IMPL-20260204-03
# FIX REFERENCE: FIX-20260204-06 - Mejorar diagnóstico y buscar driver alternativo

param(
    [string]$Action = "install"
)

$portName = "ColorManager_9100"
$printerName = "ColorManager Printer"
$hostAddress = "127.0.0.1"
$portNumber = 9100
$logFile = "$env:TEMP\ColorManager_PrinterSetup.log"

# Iniciar logging
Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue

function Find-AvailablePrinterDriver {
    # Lista de drivers compatibles en orden de preferencia
    $preferredDrivers = @(
        "Generic / Text Only",
        "Microsoft Print To PDF", 
        "Microsoft XPS Document Writer",
        "Generic Text-Only"
    )
    
    foreach ($driverName in $preferredDrivers) {
        $driver = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue
        if ($driver) {
            Write-Host "  [OK] Driver encontrado: $driverName" -ForegroundColor Green
            return $driverName
        }
    }
    
    # Si no hay ninguno preferido, buscar cualquier driver disponible
    $anyDriver = Get-PrinterDriver -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($anyDriver) {
        Write-Host "  [WARN] Usando driver alternativo: $($anyDriver.Name)" -ForegroundColor Yellow
        return $anyDriver.Name
    }
    
    return $null
}

function Install-ColorManagerPrinter {
    Write-Host "Configurando impresora ColorManager..." -ForegroundColor Cyan
    Write-Host "  Fecha: $(Get-Date)" -ForegroundColor Gray
    
    # Agregar regla de firewall para permitir conexiones al puerto 9100
    Write-Host "  Configurando firewall..." -ForegroundColor Gray
    try {
        $existingRule = Get-NetFirewallRule -DisplayName "ColorManager Printer" -ErrorAction SilentlyContinue
        if (-not $existingRule) {
            New-NetFirewallRule -DisplayName "ColorManager Printer" -Direction Inbound -Protocol TCP -LocalPort $portNumber -Action Allow -ErrorAction Stop | Out-Null
            Write-Host "  [OK] Regla de firewall creada para puerto $portNumber" -ForegroundColor Green
        } else {
            Write-Host "  [OK] Regla de firewall ya existe" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [WARN] No se pudo configurar firewall: $_" -ForegroundColor Yellow
    }
    
    # Verificar servicio Print Spooler
    $spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
    if (-not $spooler) {
        Write-Host "  [ERROR] Servicio Print Spooler no encontrado" -ForegroundColor Red
        return
    }
    if ($spooler.Status -ne 'Running') {
        Write-Host "  [WARN] Print Spooler no corriendo, intentando iniciar..." -ForegroundColor Yellow
        try {
            Start-Service -Name Spooler -ErrorAction Stop
            Write-Host "  [OK] Print Spooler iniciado" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] No se pudo iniciar Print Spooler: $_" -ForegroundColor Red
            return
        }
    } else {
        Write-Host "  [OK] Print Spooler corriendo" -ForegroundColor Green
    }
    
    # Buscar driver disponible
    Write-Host "  Buscando driver de impresora..." -ForegroundColor Gray
    $driverName = Find-AvailablePrinterDriver
    if (-not $driverName) {
        Write-Host "  [ERROR] No se encontro ningun driver de impresora compatible" -ForegroundColor Red
        Write-Host "  Ejecute: Add-PrinterDriver -Name 'Generic / Text Only'" -ForegroundColor Yellow
        return
    }
    
    # Verificar si el puerto existe
    $portExists = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    if (-not $portExists) {
        try {
            # Crear puerto TCP/IP con protocolo RAW (importante para recibir datos sin procesar)
            # Usar WMI para configurar correctamente como RAW
            $portArgs = @{
                Name = $portName
                PrinterHostAddress = $hostAddress
                PortNumber = $portNumber
            }
            Add-PrinterPort @portArgs
            
            # Configurar como RAW usando WMI (no LPR)
            $wmiPort = Get-WmiObject -Class Win32_TCPIPPrinterPort -Filter "Name='$portName'" -ErrorAction SilentlyContinue
            if ($wmiPort) {
                $wmiPort.Protocol = 1  # 1 = RAW, 2 = LPR
                $wmiPort.Put() | Out-Null
                Write-Host "  [OK] Puerto TCP/IP creado (RAW): $portName" -ForegroundColor Green
            } else {
                Write-Host "  [OK] Puerto TCP/IP creado: $portName" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [ERROR] No se pudo crear el puerto: $_" -ForegroundColor Red
            return
        }
    } else {
        Write-Host "  [OK] Puerto ya existe: $portName" -ForegroundColor Green
    }
    
    # Verificar si la impresora existe
    $printerExists = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if (-not $printerExists) {
        try {
            Add-Printer -Name $printerName -DriverName $driverName -PortName $portName
            Write-Host "  [OK] Impresora creada: $printerName (driver: $driverName)" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] No se pudo crear la impresora: $_" -ForegroundColor Red
            return
        }
    } else {
        Write-Host "  [OK] Impresora ya existe: $printerName" -ForegroundColor Green
    }
    
    Write-Host "Configuracion completada exitosamente." -ForegroundColor Cyan
    Write-Host "Log guardado en: $logFile" -ForegroundColor Gray
}

function Uninstall-ColorManagerPrinter {
    Write-Host "Removiendo impresora ColorManager..." -ForegroundColor Cyan
    Write-Host "  Fecha: $(Get-Date)" -ForegroundColor Gray
    
    # Remover impresora
    $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($printer) {
        try {
            Remove-Printer -Name $printerName
            Write-Host "  [OK] Impresora removida: $printerName" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] No se pudo remover la impresora: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [INFO] Impresora no existia: $printerName" -ForegroundColor Gray
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
    } else {
        Write-Host "  [INFO] Puerto no existia: $portName" -ForegroundColor Gray
    }
    
    # Remover regla de firewall
    try {
        Remove-NetFirewallRule -DisplayName "ColorManager Printer" -ErrorAction SilentlyContinue
        Write-Host "  [OK] Regla de firewall removida" -ForegroundColor Green
    } catch {
        Write-Host "  [INFO] Regla de firewall no existia" -ForegroundColor Gray
    }
    
    Write-Host "Limpieza completada." -ForegroundColor Cyan
}

# Ejecutar accion
switch ($Action.ToLower()) {
    "install" { Install-ColorManagerPrinter }
    "uninstall" { Uninstall-ColorManagerPrinter }
    default { Write-Host "Uso: .\setup-printer.ps1 -Action [install|uninstall]" }
}

# Detener logging
Stop-Transcript -ErrorAction SilentlyContinue

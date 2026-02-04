# ColorManager Printer Installer Script
# FIX-20260204-09 (Deby): Solucion completa - eliminar/recrear con driver correcto
# Crea puerto TCP/IP y impresora virtual para recibir recetas de Sayer

param(
    [string]$Action = "install"
)

$portName = "ColorManager_9100"
$printerName = "ColorManager Printer"
$hostAddress = "127.0.0.1"
$portNumber = 9100
$logFile = "$env:TEMP\ColorManager_PrinterSetup.log"
$requiredDriver = "Generic / Text Only"

# Iniciar logging
Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue

function Install-GenericTextDriver {
    Write-Host "  Instalando driver 'Generic / Text Only'..." -ForegroundColor Gray
    try {
        # El driver Generic / Text Only viene con Windows, solo hay que habilitarlo
        $infPath = "$env:windir\inf\ntprint.inf"
        if (Test-Path $infPath) {
            # Usar pnputil para agregar el driver
            & pnputil /add-driver $infPath /install 2>$null
            
            # Intentar agregar el driver directamente
            Add-PrinterDriver -Name $requiredDriver -ErrorAction Stop
            Write-Host "  [OK] Driver instalado: $requiredDriver" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "  [WARN] No se pudo instalar automaticamente: $_" -ForegroundColor Yellow
    }
    
    # Metodo alternativo: usar rundll32
    try {
        Write-Host "  Intentando metodo alternativo..." -ForegroundColor Gray
        $driverExists = Get-PrinterDriver -Name $requiredDriver -ErrorAction SilentlyContinue
        if (-not $driverExists) {
            # Forzar instalacion via WMI
            $printerClass = [wmiclass]"Win32_PrinterDriver"
            $driver = $printerClass.CreateInstance()
            $driver.Name = $requiredDriver
            $driver.SupportedPlatform = "Windows x64"
            $driver.DriverPath = "$env:windir\System32\spool\drivers\x64\3"
            $driver.Put() | Out-Null
        }
        return $true
    } catch {
        Write-Host "  [ERROR] No se pudo instalar el driver: $_" -ForegroundColor Red
        return $false
    }
}

function Get-BestAvailableDriver {
    # Primero intentar el driver requerido
    $driver = Get-PrinterDriver -Name $requiredDriver -ErrorAction SilentlyContinue
    if ($driver) {
        Write-Host "  [OK] Driver preferido disponible: $requiredDriver" -ForegroundColor Green
        return $requiredDriver
    }
    
    # Si no existe, intentar instalarlo
    Write-Host "  [INFO] Driver '$requiredDriver' no encontrado, intentando instalar..." -ForegroundColor Yellow
    if (Install-GenericTextDriver) {
        $driver = Get-PrinterDriver -Name $requiredDriver -ErrorAction SilentlyContinue
        if ($driver) {
            return $requiredDriver
        }
    }
    
    # Fallback a otros drivers (en orden de compatibilidad con RAW)
    $fallbackDrivers = @(
        "Generic Text-Only",
        "MS Publisher Imagesetter",
        "Microsoft Print To PDF"
    )
    
    foreach ($driverName in $fallbackDrivers) {
        $driver = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue
        if ($driver) {
            Write-Host "  [WARN] Usando driver alternativo: $driverName" -ForegroundColor Yellow
            return $driverName
        }
    }
    
    # Ultimo recurso: cualquier driver
    $anyDriver = Get-PrinterDriver -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($anyDriver) {
        Write-Host "  [WARN] Usando driver generico: $($anyDriver.Name)" -ForegroundColor Yellow
        return $anyDriver.Name
    }
    
    return $null
}

function Install-ColorManagerPrinter {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  INSTALADOR DE IMPRESORA COLORMANAGER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Fecha: $(Get-Date)" -ForegroundColor Gray
    Write-Host ""
    
    # PASO 1: Verificar Print Spooler
    Write-Host "[1/6] Verificando Print Spooler..." -ForegroundColor White
    $spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
    if (-not $spooler) {
        Write-Host "  [ERROR] Servicio Print Spooler no encontrado" -ForegroundColor Red
        return $false
    }
    if ($spooler.Status -ne 'Running') {
        Write-Host "  [WARN] Iniciando Print Spooler..." -ForegroundColor Yellow
        try {
            Start-Service -Name Spooler -ErrorAction Stop
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "  [ERROR] No se pudo iniciar: $_" -ForegroundColor Red
            return $false
        }
    }
    Write-Host "  [OK] Print Spooler activo" -ForegroundColor Green
    
    # PASO 2: Configurar Firewall
    Write-Host "[2/6] Configurando firewall..." -ForegroundColor White
    try {
        $rule = Get-NetFirewallRule -DisplayName "ColorManager Printer" -ErrorAction SilentlyContinue
        if (-not $rule) {
            New-NetFirewallRule -DisplayName "ColorManager Printer" -Direction Inbound -Protocol TCP -LocalPort $portNumber -Action Allow -Profile Any | Out-Null
            Write-Host "  [OK] Regla creada para puerto $portNumber" -ForegroundColor Green
        } else {
            Write-Host "  [OK] Regla ya existe" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [WARN] Firewall: $_" -ForegroundColor Yellow
    }
    
    # PASO 3: Buscar/Instalar Driver
    Write-Host "[3/6] Configurando driver..." -ForegroundColor White
    $driverName = Get-BestAvailableDriver
    if (-not $driverName) {
        Write-Host "  [ERROR] No hay drivers disponibles" -ForegroundColor Red
        Write-Host "  Ejecute manualmente: Add-PrinterDriver -Name 'Generic / Text Only'" -ForegroundColor Yellow
        return $false
    }
    
    # PASO 4: Eliminar impresora existente si tiene driver incorrecto
    Write-Host "[4/6] Verificando impresora existente..." -ForegroundColor White
    $existingPrinter = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($existingPrinter) {
        if ($existingPrinter.DriverName -ne $driverName) {
            Write-Host "  [INFO] Impresora existe con driver incorrecto: $($existingPrinter.DriverName)" -ForegroundColor Yellow
            Write-Host "  [INFO] Eliminando para recrear con driver correcto..." -ForegroundColor Yellow
            try {
                Remove-Printer -Name $printerName -ErrorAction Stop
                Start-Sleep -Seconds 1
                Write-Host "  [OK] Impresora anterior eliminada" -ForegroundColor Green
                $existingPrinter = $null
            } catch {
                Write-Host "  [ERROR] No se pudo eliminar: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "  [OK] Impresora existe con driver correcto" -ForegroundColor Green
        }
    } else {
        Write-Host "  [INFO] No existe impresora previa" -ForegroundColor Gray
    }
    
    # PASO 5: Crear/Verificar Puerto TCP/IP
    Write-Host "[5/6] Configurando puerto TCP/IP..." -ForegroundColor White
    $portExists = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    if ($portExists) {
        # Verificar configuracion del puerto
        Write-Host "  [INFO] Puerto existe, verificando configuracion..." -ForegroundColor Gray
        try {
            # Eliminar y recrear para asegurar configuracion correcta
            Remove-PrinterPort -Name $portName -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
            $portExists = $null
        } catch {
            Write-Host "  [WARN] No se pudo eliminar puerto: $_" -ForegroundColor Yellow
        }
    }
    
    if (-not $portExists) {
        try {
            # Crear puerto con Add-PrinterPort
            Add-PrinterPort -Name $portName -PrinterHostAddress $hostAddress -PortNumber $portNumber -ErrorAction Stop
            Write-Host "  [OK] Puerto creado: $portName -> ${hostAddress}:${portNumber}" -ForegroundColor Green
            
            # Configurar como RAW (protocolo 1)
            Start-Sleep -Milliseconds 500
            $wmiPort = Get-WmiObject -Class Win32_TCPIPPrinterPort -Filter "Name='$portName'" -ErrorAction SilentlyContinue
            if ($wmiPort) {
                $wmiPort.Protocol = 1  # 1 = RAW, 2 = LPR
                $wmiPort.Put() | Out-Null
                Write-Host "  [OK] Protocolo configurado como RAW" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [ERROR] No se pudo crear puerto: $_" -ForegroundColor Red
            return $false
        }
    }
    
    # PASO 6: Crear Impresora
    Write-Host "[6/6] Creando impresora..." -ForegroundColor White
    if (-not $existingPrinter) {
        try {
            Add-Printer -Name $printerName -DriverName $driverName -PortName $portName -ErrorAction Stop
            Write-Host "  [OK] Impresora creada: $printerName" -ForegroundColor Green
            Write-Host "       Driver: $driverName" -ForegroundColor Gray
            Write-Host "       Puerto: $portName" -ForegroundColor Gray
        } catch {
            Write-Host "  [ERROR] No se pudo crear impresora: $_" -ForegroundColor Red
            return $false
        }
    }
    
    # Verificacion final
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    $finalCheck = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($finalCheck) {
        Write-Host "  INSTALACION EXITOSA" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  La impresora '$printerName' esta lista." -ForegroundColor White
        Write-Host "  Envie documentos a esta impresora para" -ForegroundColor White
        Write-Host "  que ColorManager los reciba." -ForegroundColor White
        Write-Host ""
        Write-Host "  Log: $logFile" -ForegroundColor Gray
        return $true
    } else {
        Write-Host "  INSTALACION FALLIDA" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Revise el log: $logFile" -ForegroundColor Yellow
        return $false
    }
}

function Uninstall-ColorManagerPrinter {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DESINSTALADOR DE IMPRESORA" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Fecha: $(Get-Date)" -ForegroundColor Gray
    Write-Host ""
    
    # Remover impresora
    Write-Host "[1/3] Removiendo impresora..." -ForegroundColor White
    $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($printer) {
        try {
            Remove-Printer -Name $printerName -ErrorAction Stop
            Write-Host "  [OK] Impresora removida" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [INFO] Impresora no existia" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 1
    
    # Remover puerto
    Write-Host "[2/3] Removiendo puerto..." -ForegroundColor White
    $port = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    if ($port) {
        try {
            Remove-PrinterPort -Name $portName -ErrorAction Stop
            Write-Host "  [OK] Puerto removido" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [INFO] Puerto no existia" -ForegroundColor Gray
    }
    
    # Remover firewall
    Write-Host "[3/3] Removiendo regla de firewall..." -ForegroundColor White
    try {
        Remove-NetFirewallRule -DisplayName "ColorManager Printer" -ErrorAction Stop
        Write-Host "  [OK] Regla removida" -ForegroundColor Green
    } catch {
        Write-Host "  [INFO] Regla no existia" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DESINSTALACION COMPLETADA" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

# Ejecutar accion
switch ($Action.ToLower()) {
    "install" { Install-ColorManagerPrinter }
    "uninstall" { Uninstall-ColorManagerPrinter }
    default { 
        Write-Host "Uso: .\setup-printer.ps1 -Action [install|uninstall]" 
        Write-Host "  install   - Instala la impresora ColorManager"
        Write-Host "  uninstall - Remueve la impresora ColorManager"
    }
}

# Detener logging
Stop-Transcript -ErrorAction SilentlyContinue

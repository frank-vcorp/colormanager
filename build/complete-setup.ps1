# ColorManager Complete Setup
# FIX-20260204-14: Instalador completo que configura todo automáticamente
# - Firewall
# - Impresora virtual
# - Servicio de recepción TCP
# Se ejecuta automáticamente durante la instalación

param(
    [string]$Action = "install"
)

$ErrorActionPreference = "Continue"

# Configuración
$port = 9100
$printerName = "ColorManager Printer"
$portName = "ColorManager_9100"
$serviceName = "ColorManagerPrinterService"
$spoolDir = "$env:USERPROFILE\Documents\ColorManager\spool"
$logDir = "$env:ProgramData\ColorManager"
$logFile = "$logDir\setup.log"
$niimbotDriverPath = "$PSScriptRoot\..\resources\drivers\USB-Driver-Installer-1.0.3.0.exe"
$niimbotDriverAlt = "$PSScriptRoot\drivers\USB-Driver-Installer-1.0.3.0.exe"

# Función de logging
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    
    # Crear directorio de log si no existe
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    $logMessage | Out-File -FilePath $logFile -Append -ErrorAction SilentlyContinue
    Write-Host $Message -ForegroundColor $Color
}

function Install-All {
    Write-Log "========================================" "Cyan"
    Write-Log "  COLORMANAGER - INSTALACION COMPLETA" "Cyan"
    Write-Log "========================================" "Cyan"
    Write-Log ""
    Write-Log "Este proceso configurara:" "Gray"
    Write-Log "  1. Carpeta de spool" "Gray"
    Write-Log "  2. Reglas de firewall" "Gray"
    Write-Log "  3. Puerto TCP/IP" "Gray"
    Write-Log "  4. Impresora virtual TCP" "Gray"
    Write-Log "  5. Servicio de recepcion" "Gray"
    Write-Log "  6. Driver USB Niimbot (etiquetas QR)" "Gray"
    Write-Log ""
    
    $success = $true
    
    # PASO 1: Crear carpeta de spool
    Write-Log "[1/6] Creando carpeta de spool..." "White"
    try {
        if (-not (Test-Path $spoolDir)) {
            New-Item -ItemType Directory -Path $spoolDir -Force | Out-Null
        }
        Write-Log "  [OK] Carpeta: $spoolDir" "Green"
    } catch {
        Write-Log "  [ERROR] $_" "Red"
        $success = $false
    }
    
    # PASO 2: Configurar Firewall
    Write-Log "[2/6] Configurando firewall..." "White"
    try {
        $ruleName = "ColorManager Printer Port"
        Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        New-NetFirewallRule -DisplayName $ruleName `
            -Direction Inbound -Protocol TCP -LocalPort $port `
            -Action Allow -Profile Any | Out-Null
        Write-Log "  [OK] Puerto $port abierto" "Green"
    } catch {
        Write-Log "  [WARN] Firewall: $_" "Yellow"
    }
    
    # PASO 3: Crear Puerto TCP/IP
    Write-Log "[3/6] Configurando puerto TCP/IP..." "White"
    try {
        # Verificar spooler
        $spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
        if ($spooler.Status -ne 'Running') {
            Start-Service -Name Spooler -ErrorAction Stop
            Start-Sleep -Seconds 2
        }
        
        # Eliminar puerto existente
        Remove-PrinterPort -Name $portName -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        
        # Crear puerto
        Add-PrinterPort -Name $portName -PrinterHostAddress "127.0.0.1" -PortNumber $port -ErrorAction Stop
        Write-Log "  [OK] Puerto TCP creado: $portName" "Green"
    } catch {
        Write-Log "  [ERROR] Puerto: $_" "Red"
        $success = $false
    }
    
    # PASO 4: Crear Impresora
    Write-Log "[4/6] Configurando impresora virtual..." "White"
    try {
        # Eliminar impresora existente
        Remove-Printer -Name $printerName -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        
        # Buscar driver disponible
        $driverName = "Generic / Text Only"
        $driver = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue
        if (-not $driver) {
            # Intentar instalar driver
            Add-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue
            $driver = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue
        }
        
        if (-not $driver) {
            # Fallback a cualquier driver disponible
            $driver = Get-PrinterDriver | Where-Object { $_.Name -like "*Generic*" -or $_.Name -like "*Text*" } | Select-Object -First 1
            if ($driver) {
                $driverName = $driver.Name
            }
        }
        
        if ($driver) {
            Add-Printer -Name $printerName -DriverName $driverName -PortName $portName -ErrorAction Stop
            Write-Log "  [OK] Impresora creada: $printerName" "Green"
            Write-Log "       Driver: $driverName" "Gray"
        } else {
            Write-Log "  [ERROR] No hay drivers disponibles" "Red"
            $success = $false
        }
    } catch {
        Write-Log "  [ERROR] Impresora: $_" "Red"
        $success = $false
    }
    
    # PASO 5: Crear Servicio/Tarea Programada
    Write-Log "[5/6] Configurando servicio de recepcion..." "White"
    try {
        # Crear script del servicio
        $serviceScript = "$logDir\printer-service.ps1"
        
        $serviceContent = @'
# ColorManager Printer Service
# Auto-generado - No modificar

$ErrorActionPreference = 'Continue'
$port = 9100
$spoolDir = "$env:USERPROFILE\Documents\ColorManager\spool"
$logFile = "$env:ProgramData\ColorManager\printer-service.log"

function Write-ServiceLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $logFile -Append -ErrorAction SilentlyContinue
}

# Crear carpeta si no existe
if (-not (Test-Path $spoolDir)) {
    New-Item -ItemType Directory -Path $spoolDir -Force | Out-Null
}

Write-ServiceLog "Servicio iniciando en puerto $port..."

try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    Write-ServiceLog "Escuchando en 127.0.0.1:$port"
    
    while ($true) {
        try {
            $client = $listener.AcceptTcpClient()
            $stream = $client.GetStream()
            $buffer = New-Object byte[] 16384
            $data = ""
            
            # Leer datos
            do {
                Start-Sleep -Milliseconds 50
                if ($stream.DataAvailable) {
                    $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                    $data += [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($buffer, 0, $bytesRead)
                }
            } while ($stream.DataAvailable -or ($data.Length -eq 0 -and $client.Connected))
            
            # Esperar datos adicionales
            Start-Sleep -Milliseconds 500
            while ($stream.DataAvailable) {
                $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                $data += [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($buffer, 0, $bytesRead)
            }
            
            $client.Close()
            
            if ($data.Length -gt 0) {
                $timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
                $filename = "receta_$timestamp.txt"
                $filepath = Join-Path $spoolDir $filename
                [System.IO.File]::WriteAllText($filepath, $data, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
                Write-ServiceLog "Guardado: $filename ($($data.Length) bytes)"
            }
        } catch {
            Write-ServiceLog "Error conexion: $_"
        }
    }
} catch {
    Write-ServiceLog "Error fatal: $_"
} finally {
    if ($listener) { $listener.Stop() }
    Write-ServiceLog "Servicio detenido"
}
'@
        
        $serviceContent | Out-File -FilePath $serviceScript -Encoding UTF8 -Force
        Write-Log "  [OK] Script de servicio creado" "Green"
        
        # Eliminar tarea existente
        Unregister-ScheduledTask -TaskName $serviceName -Confirm:$false -ErrorAction SilentlyContinue
        
        # Crear tarea programada
        $pwshPath = (Get-Command powershell.exe).Source
        
        $action = New-ScheduledTaskAction -Execute $pwshPath `
            -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$serviceScript`""
        
        $trigger = New-ScheduledTaskTrigger -AtLogon
        
        $settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -StartWhenAvailable `
            -RestartCount 3 `
            -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit (New-TimeSpan -Days 365)
        
        $principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest
        
        Register-ScheduledTask -TaskName $serviceName `
            -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
            -Description "Recibe impresiones TCP para ColorManager" | Out-Null
        
        # Iniciar la tarea ahora
        Start-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue
        
        Write-Log "  [OK] Servicio configurado e iniciado" "Green"
        
    } catch {
        Write-Log "  [ERROR] Servicio: $_" "Red"
        $success = $false
    }
    
    # PASO 6: Instalar Driver USB Niimbot B1
    Write-Log "[6/6] Instalando driver USB Niimbot B1..." "White"
    try {
        # Buscar driver en ubicaciones posibles
        $driverExe = $null
        if (Test-Path $niimbotDriverPath) {
            $driverExe = $niimbotDriverPath
        } elseif (Test-Path $niimbotDriverAlt) {
            $driverExe = $niimbotDriverAlt
        }
        
        if ($driverExe) {
            # Ejecutar instalador silencioso
            Write-Log "  Ejecutando: $driverExe" "Gray"
            $process = Start-Process -FilePath $driverExe -ArgumentList "/S" -Wait -PassThru -ErrorAction Stop
            
            if ($process.ExitCode -eq 0) {
                Write-Log "  [OK] Driver Niimbot instalado" "Green"
            } else {
                Write-Log "  [WARN] Driver Niimbot - codigo de salida: $($process.ExitCode)" "Yellow"
            }
        } else {
            Write-Log "  [SKIP] Driver no encontrado en:" "Yellow"
            Write-Log "         $niimbotDriverPath" "Gray"
            Write-Log "         $niimbotDriverAlt" "Gray"
            Write-Log "         Instale manualmente si necesita etiquetas QR" "Gray"
        }
    } catch {
        Write-Log "  [WARN] Driver Niimbot: $_" "Yellow"
        # No marcar como fallo - es opcional
    }
    
    # Resumen
    Write-Log "" "White"
    Write-Log "========================================" "Cyan"
    if ($success) {
        Write-Log "  INSTALACION COMPLETADA" "Green"
        Write-Log "========================================" "Cyan"
        Write-Log ""
        Write-Log "  La impresora '$printerName' esta lista." "White"
        Write-Log "  Las recetas se guardaran en:" "White"
        Write-Log "  $spoolDir" "Gray"
        Write-Log ""
        Write-Log "  ColorManager las detectara automaticamente." "White"
    } else {
        Write-Log "  INSTALACION CON ERRORES" "Yellow"
        Write-Log "========================================" "Cyan"
        Write-Log "  Revise el log: $logFile" "Yellow"
    }
    Write-Log ""
    
    return $success
}

function Uninstall-All {
    Write-Log "========================================" "Cyan"
    Write-Log "  COLORMANAGER - DESINSTALACION" "Cyan"
    Write-Log "========================================" "Cyan"
    Write-Log ""
    
    # Detener y eliminar tarea
    Write-Log "[1/4] Eliminando servicio..." "White"
    Stop-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $serviceName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Log "  [OK] Servicio eliminado" "Green"
    
    # Eliminar impresora
    Write-Log "[2/4] Eliminando impresora..." "White"
    Get-PrintJob -PrinterName $printerName -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue
    Remove-Printer -Name $printerName -ErrorAction SilentlyContinue
    Write-Log "  [OK] Impresora eliminada" "Green"
    
    # Eliminar puerto
    Write-Log "[3/4] Eliminando puerto..." "White"
    Start-Sleep -Seconds 1
    Remove-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    Write-Log "  [OK] Puerto eliminado" "Green"
    
    # Eliminar regla firewall
    Write-Log "[4/4] Eliminando regla de firewall..." "White"
    Remove-NetFirewallRule -DisplayName "ColorManager Printer Port" -ErrorAction SilentlyContinue
    Write-Log "  [OK] Regla eliminada" "Green"
    
    Write-Log ""
    Write-Log "========================================" "Cyan"
    Write-Log "  DESINSTALACION COMPLETADA" "Green"
    Write-Log "========================================" "Cyan"
}

function Test-Installation {
    Write-Log "========================================" "Cyan"
    Write-Log "  VERIFICACION DE INSTALACION" "Cyan"
    Write-Log "========================================" "Cyan"
    Write-Log ""
    
    $allOk = $true
    
    # Verificar carpeta spool
    Write-Log "[1/4] Carpeta spool..." "White"
    if (Test-Path $spoolDir) {
        Write-Log "  [OK] $spoolDir" "Green"
    } else {
        Write-Log "  [FAIL] No existe" "Red"
        $allOk = $false
    }
    
    # Verificar impresora
    Write-Log "[2/4] Impresora..." "White"
    $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($printer) {
        Write-Log "  [OK] $printerName" "Green"
    } else {
        Write-Log "  [FAIL] No existe" "Red"
        $allOk = $false
    }
    
    # Verificar tarea
    Write-Log "[3/4] Servicio..." "White"
    $task = Get-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Log "  [OK] $serviceName ($($task.State))" "Green"
    } else {
        Write-Log "  [FAIL] No existe" "Red"
        $allOk = $false
    }
    
    # Verificar puerto escuchando
    Write-Log "[4/4] Puerto TCP..." "White"
    $tcpConn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($tcpConn) {
        Write-Log "  [OK] Puerto $port escuchando" "Green"
    } else {
        Write-Log "  [WARN] Puerto $port no escucha (inicie ColorManager o el servicio)" "Yellow"
    }
    
    Write-Log ""
    if ($allOk) {
        Write-Log "  Todo configurado correctamente!" "Green"
    } else {
        Write-Log "  Hay problemas. Ejecute: .\complete-setup.ps1 -Action install" "Yellow"
    }
    Write-Log ""
}

# Ejecutar acción
switch ($Action.ToLower()) {
    "install" { Install-All }
    "uninstall" { Uninstall-All }
    "test" { Test-Installation }
    default { 
        Write-Host "Uso: .\complete-setup.ps1 -Action [install|uninstall|test]"
    }
}

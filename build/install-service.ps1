# ColorManager Printer Service Installer
# FIX-20260204-12: Instala el printer-bridge como servicio de Windows
# Ejecutar como Administrador

param(
    [string]$Action = "install"
)

$serviceName = "ColorManagerPrinter"
$serviceDisplayName = "ColorManager Printer Service"
$serviceDescription = "Recibe impresiones TCP en puerto 9100 y las guarda para ColorManager"
$port = 9100
$spoolDir = "$env:USERPROFILE\Documents\ColorManager\spool"

# Ruta del script del bridge
$bridgeScript = Join-Path $PSScriptRoot "printer-bridge.ps1"
if (-not (Test-Path $bridgeScript)) {
    $bridgeScript = Join-Path (Split-Path $PSScriptRoot) "resources\printer-bridge.ps1"
}

function Install-PrinterService {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  INSTALADOR DE SERVICIO COLORMANAGER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar que existe el script
    if (-not (Test-Path $bridgeScript)) {
        Write-Host "[ERROR] No se encontro printer-bridge.ps1" -ForegroundColor Red
        Write-Host "        Buscado en: $bridgeScript" -ForegroundColor Gray
        return $false
    }
    
    Write-Host "[INFO] Script encontrado: $bridgeScript" -ForegroundColor Gray
    
    # Crear carpeta de spool
    if (-not (Test-Path $spoolDir)) {
        New-Item -ItemType Directory -Path $spoolDir -Force | Out-Null
        Write-Host "[OK] Carpeta spool creada: $spoolDir" -ForegroundColor Green
    }
    
    # Verificar si el servicio ya existe
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "[INFO] Servicio existente encontrado, removiendo..." -ForegroundColor Yellow
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        sc.exe delete $serviceName | Out-Null
        Start-Sleep -Seconds 2
    }
    
    # Crear script wrapper que se ejecutará como servicio
    $wrapperScript = "$env:ProgramData\ColorManager\printer-service.ps1"
    $wrapperDir = Split-Path $wrapperScript
    
    if (-not (Test-Path $wrapperDir)) {
        New-Item -ItemType Directory -Path $wrapperDir -Force | Out-Null
    }
    
    # El wrapper es un script que corre indefinidamente
    $wrapperContent = @"
# ColorManager Printer Service Wrapper
# Auto-generado por install-service.ps1

`$ErrorActionPreference = 'Continue'
`$port = $port
`$spoolDir = "$spoolDir"

# Crear carpeta si no existe
if (-not (Test-Path `$spoolDir)) {
    New-Item -ItemType Directory -Path `$spoolDir -Force | Out-Null
}

# Log file
`$logFile = "$env:ProgramData\ColorManager\printer-service.log"

function Write-Log {
    param([string]`$Message)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "`$timestamp - `$Message" | Out-File -FilePath `$logFile -Append
}

Write-Log "Servicio iniciando..."

try {
    `$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, `$port)
    `$listener.Start()
    Write-Log "Escuchando en 127.0.0.1:`$port"
    
    while (`$true) {
        try {
            `$client = `$listener.AcceptTcpClient()
            `$stream = `$client.GetStream()
            `$buffer = New-Object byte[] 8192
            `$data = ""
            
            do {
                Start-Sleep -Milliseconds 50
                if (`$stream.DataAvailable) {
                    `$bytesRead = `$stream.Read(`$buffer, 0, `$buffer.Length)
                    `$data += [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString(`$buffer, 0, `$bytesRead)
                }
            } while (`$stream.DataAvailable -or (`$data.Length -eq 0 -and `$client.Connected))
            
            Start-Sleep -Milliseconds 300
            while (`$stream.DataAvailable) {
                `$bytesRead = `$stream.Read(`$buffer, 0, `$buffer.Length)
                `$data += [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString(`$buffer, 0, `$bytesRead)
            }
            
            `$client.Close()
            
            if (`$data.Length -gt 0) {
                `$timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
                `$filename = "receta_`$timestamp.txt"
                `$filepath = Join-Path `$spoolDir `$filename
                [System.IO.File]::WriteAllText(`$filepath, `$data, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
                Write-Log "Guardado: `$filename (`$(`$data.Length) bytes)"
            }
        } catch {
            Write-Log "Error en conexion: `$_"
        }
    }
} catch {
    Write-Log "Error fatal: `$_"
} finally {
    if (`$listener) { `$listener.Stop() }
    Write-Log "Servicio detenido"
}
"@
    
    $wrapperContent | Out-File -FilePath $wrapperScript -Encoding UTF8 -Force
    Write-Host "[OK] Script de servicio creado: $wrapperScript" -ForegroundColor Green
    
    # Crear el servicio usando sc.exe con PowerShell
    $pwshPath = (Get-Command powershell.exe).Source
    $serviceCmd = "`"$pwshPath`" -ExecutionPolicy Bypass -NoProfile -File `"$wrapperScript`""
    
    # Usar NSSM si está disponible, sino usar Task Scheduler
    $nssmPath = Get-Command nssm.exe -ErrorAction SilentlyContinue
    
    if ($nssmPath) {
        Write-Host "[INFO] Usando NSSM para crear servicio..." -ForegroundColor Gray
        & nssm install $serviceName $pwshPath "-ExecutionPolicy Bypass -NoProfile -File `"$wrapperScript`""
        & nssm set $serviceName DisplayName $serviceDisplayName
        & nssm set $serviceName Description $serviceDescription
        & nssm set $serviceName Start SERVICE_AUTO_START
        & nssm start $serviceName
    } else {
        # Usar Task Scheduler como alternativa
        Write-Host "[INFO] Usando Task Scheduler (NSSM no encontrado)..." -ForegroundColor Gray
        
        $taskName = "ColorManagerPrinterService"
        
        # Eliminar tarea existente
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        
        # Crear acción
        $action = New-ScheduledTaskAction -Execute $pwshPath `
            -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$wrapperScript`""
        
        # Crear trigger (al iniciar sesión y al inicio del sistema)
        $triggerStartup = New-ScheduledTaskTrigger -AtStartup
        $triggerLogon = New-ScheduledTaskTrigger -AtLogon
        
        # Configuración
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
        
        # Crear principal (ejecutar como usuario actual)
        $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
            -LogonType Interactive -RunLevel Highest
        
        # Registrar tarea
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggerStartup,$triggerLogon `
            -Settings $settings -Principal $principal -Description $serviceDescription | Out-Null
        
        # Iniciar la tarea ahora
        Start-ScheduledTask -TaskName $taskName
        
        Write-Host "[OK] Tarea programada creada: $taskName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  INSTALACION COMPLETADA" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  El servicio se iniciara automaticamente" -ForegroundColor White
    Write-Host "  con Windows y escuchara en puerto $port" -ForegroundColor White
    Write-Host ""
    Write-Host "  Carpeta spool: $spoolDir" -ForegroundColor Gray
    Write-Host "  Log: $env:ProgramData\ColorManager\printer-service.log" -ForegroundColor Gray
    Write-Host ""
    
    return $true
}

function Uninstall-PrinterService {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DESINSTALADOR DE SERVICIO" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Detener y eliminar servicio NSSM
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        sc.exe delete $serviceName | Out-Null
        Write-Host "[OK] Servicio eliminado" -ForegroundColor Green
    }
    
    # Eliminar tarea programada
    $taskName = "ColorManagerPrinterService"
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "[OK] Tarea programada eliminada" -ForegroundColor Green
    }
    
    # Eliminar script wrapper
    $wrapperScript = "$env:ProgramData\ColorManager\printer-service.ps1"
    if (Test-Path $wrapperScript) {
        Remove-Item $wrapperScript -Force
        Write-Host "[OK] Script de servicio eliminado" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[OK] Desinstalacion completada" -ForegroundColor Green
}

function Get-ServiceStatus {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ESTADO DEL SERVICIO" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar servicio
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "  Servicio: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Yellow' })
    }
    
    # Verificar tarea programada
    $taskName = "ColorManagerPrinterService"
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
        Write-Host "  Tarea: $($task.State)" -ForegroundColor $(if ($task.State -eq 'Running') { 'Green' } else { 'Yellow' })
        Write-Host "  Ultima ejecucion: $($taskInfo.LastRunTime)" -ForegroundColor Gray
    }
    
    # Verificar puerto
    $tcpConn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($tcpConn) {
        Write-Host "  Puerto $port: ESCUCHANDO" -ForegroundColor Green
    } else {
        Write-Host "  Puerto $port: NO ESCUCHANDO" -ForegroundColor Red
    }
    
    # Verificar log
    $logFile = "$env:ProgramData\ColorManager\printer-service.log"
    if (Test-Path $logFile) {
        Write-Host ""
        Write-Host "  Ultimas lineas del log:" -ForegroundColor Gray
        Get-Content $logFile -Tail 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    
    Write-Host ""
}

# Ejecutar acción
switch ($Action.ToLower()) {
    "install" { Install-PrinterService }
    "uninstall" { Uninstall-PrinterService }
    "status" { Get-ServiceStatus }
    default { 
        Write-Host "Uso: .\install-service.ps1 -Action [install|uninstall|status]" 
        Write-Host "  install   - Instala el servicio de impresora"
        Write-Host "  uninstall - Remueve el servicio"
        Write-Host "  status    - Muestra el estado del servicio"
    }
}

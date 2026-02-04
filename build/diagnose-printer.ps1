# ColorManager Printer Diagnostic Script
# IMPL-20260204-02: Diagnostica y corrige problemas de la impresora virtual
# Ejecutar como Administrador

$printerName = "ColorManager Printer"
$portName = "ColorManager_9100"
$hostAddress = "127.0.0.1"
$portNumber = 9100

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO DE COLORMANAGER PRINTER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fecha: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# 1. Verificar si ColorManager esta escuchando en el puerto
Write-Host "[1/6] Verificando si puerto 9100 esta en uso..." -ForegroundColor White
$tcpConnections = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
if ($tcpConnections) {
    Write-Host "  [OK] Puerto $portNumber esta escuchando" -ForegroundColor Green
    $process = Get-Process -Id $tcpConnections.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "       Proceso: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray
    }
} else {
    Write-Host "  [ERROR] Puerto $portNumber NO esta escuchando!" -ForegroundColor Red
    Write-Host "       Asegurese de que ColorManager este abierto" -ForegroundColor Yellow
}

# 2. Verificar existencia de la impresora
Write-Host ""
Write-Host "[2/6] Verificando impresora..." -ForegroundColor White
$printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
if ($printer) {
    Write-Host "  [OK] Impresora encontrada: $printerName" -ForegroundColor Green
    Write-Host "       Driver: $($printer.DriverName)" -ForegroundColor Gray
    Write-Host "       Puerto: $($printer.PortName)" -ForegroundColor Gray
    Write-Host "       Estado: $($printer.PrinterStatus)" -ForegroundColor Gray
    
    # Verificar si el puerto es correcto
    if ($printer.PortName -ne $portName) {
        Write-Host "  [ERROR] Puerto incorrecto! Deberia ser: $portName" -ForegroundColor Red
        Write-Host "       Puerto actual: $($printer.PortName)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] Impresora NO encontrada" -ForegroundColor Red
    Write-Host "       Ejecute: .\setup-printer.ps1 -Action install" -ForegroundColor Yellow
}

# 3. Verificar configuracion del puerto
Write-Host ""
Write-Host "[3/6] Verificando puerto TCP/IP..." -ForegroundColor White
$port = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  [OK] Puerto encontrado: $portName" -ForegroundColor Green
    
    # Obtener detalles via WMI
    $wmiPort = Get-WmiObject -Class Win32_TCPIPPrinterPort -Filter "Name='$portName'" -ErrorAction SilentlyContinue
    if ($wmiPort) {
        Write-Host "       Host: $($wmiPort.HostAddress)" -ForegroundColor Gray
        Write-Host "       Puerto: $($wmiPort.PortNumber)" -ForegroundColor Gray
        $protocol = if ($wmiPort.Protocol -eq 1) { "RAW" } elseif ($wmiPort.Protocol -eq 2) { "LPR" } else { "Desconocido ($($wmiPort.Protocol))" }
        Write-Host "       Protocolo: $protocol" -ForegroundColor Gray
        Write-Host "       SNMPEnabled: $($wmiPort.SNMPEnabled)" -ForegroundColor Gray
        
        if ($wmiPort.HostAddress -ne $hostAddress) {
            Write-Host "  [ERROR] Host incorrecto! Deberia ser: $hostAddress" -ForegroundColor Red
        }
        if ($wmiPort.PortNumber -ne $portNumber) {
            Write-Host "  [ERROR] Puerto incorrecto! Deberia ser: $portNumber" -ForegroundColor Red
        }
        if ($wmiPort.Protocol -ne 1) {
            Write-Host "  [WARN] Protocolo deberia ser RAW (1)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  [ERROR] Puerto TCP/IP NO encontrado" -ForegroundColor Red
    Write-Host "       El puerto '$portName' no existe" -ForegroundColor Yellow
}

# 4. Verificar cola de impresion
Write-Host ""
Write-Host "[4/6] Verificando cola de impresion..." -ForegroundColor White
$jobs = Get-PrintJob -PrinterName $printerName -ErrorAction SilentlyContinue
if ($jobs) {
    Write-Host "  [INFO] Hay $($jobs.Count) trabajos en cola:" -ForegroundColor Yellow
    foreach ($job in $jobs) {
        Write-Host "       ID: $($job.Id) | Estado: $($job.JobStatus) | Doc: $($job.DocumentName)" -ForegroundColor Gray
    }
    
    Write-Host ""
    $clearQueue = Read-Host "  Desea limpiar la cola? (S/N)"
    if ($clearQueue -eq "S" -or $clearQueue -eq "s") {
        Get-PrintJob -PrinterName $printerName | Remove-PrintJob -ErrorAction SilentlyContinue
        Write-Host "  [OK] Cola limpiada" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] Cola de impresion vacia" -ForegroundColor Green
}

# 5. Probar conexion TCP directa
Write-Host ""
Write-Host "[5/6] Probando conexion TCP a ${hostAddress}:${portNumber}..." -ForegroundColor White
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $tcpClient.BeginConnect($hostAddress, $portNumber, $null, $null)
    $waitHandle = $asyncResult.AsyncWaitHandle
    $connected = $waitHandle.WaitOne(3000, $false)
    
    if ($connected) {
        $tcpClient.EndConnect($asyncResult)
        Write-Host "  [OK] Conexion TCP exitosa!" -ForegroundColor Green
        Write-Host "       El servidor de impresion esta respondiendo" -ForegroundColor Gray
        $tcpClient.Close()
    } else {
        Write-Host "  [ERROR] No se pudo conectar (timeout)" -ForegroundColor Red
        Write-Host "       ColorManager no esta escuchando en el puerto" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Error de conexion: $_" -ForegroundColor Red
}

# 6. Verificar firewall
Write-Host ""
Write-Host "[6/6] Verificando firewall..." -ForegroundColor White
$rule = Get-NetFirewallRule -DisplayName "ColorManager Printer" -ErrorAction SilentlyContinue
if ($rule) {
    Write-Host "  [OK] Regla de firewall existe" -ForegroundColor Green
    Write-Host "       Habilitada: $($rule.Enabled)" -ForegroundColor Gray
    Write-Host "       Accion: $($rule.Action)" -ForegroundColor Gray
} else {
    Write-Host "  [WARN] Regla de firewall no encontrada" -ForegroundColor Yellow
}

# Resumen y recomendaciones
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN Y RECOMENDACIONES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$issues = @()

# Verificar problemas detectados
if (-not $tcpConnections) {
    $issues += "- ColorManager debe estar ABIERTO antes de imprimir"
}
if (-not $printer) {
    $issues += "- Ejecute: .\setup-printer.ps1 -Action install"
}
if ($printer -and $printer.PortName -ne $portName) {
    $issues += "- El puerto de la impresora esta mal configurado"
    $issues += "- Ejecute: .\setup-printer.ps1 -Action uninstall; .\setup-printer.ps1 -Action install"
}

if ($issues.Count -eq 0) {
    Write-Host "  Todo parece correcto!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Para probar:" -ForegroundColor White
    Write-Host "  1. Abra ColorManager" -ForegroundColor Gray
    Write-Host "  2. Imprima cualquier documento a 'ColorManager Printer'" -ForegroundColor Gray
    Write-Host "  3. El contenido deberia aparecer en ColorManager" -ForegroundColor Gray
} else {
    Write-Host "  Se detectaron problemas:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  $issue" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Ofrecer reinstalacion
Write-Host ""
$reinstall = Read-Host "Desea reinstalar la impresora? (S/N)"
if ($reinstall -eq "S" -or $reinstall -eq "s") {
    Write-Host ""
    Write-Host "Reinstalando..." -ForegroundColor Cyan
    
    # Desinstalar
    Write-Host "[1/2] Eliminando configuracion anterior..." -ForegroundColor White
    Get-PrintJob -PrinterName $printerName -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue
    Remove-Printer -Name $printerName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Remove-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "  [OK] Limpieza completada" -ForegroundColor Green
    
    # Reinstalar
    Write-Host "[2/2] Creando nueva configuracion..." -ForegroundColor White
    & "$PSScriptRoot\setup-printer.ps1" -Action install
}

Write-Host ""
Write-Host "Presione Enter para salir..."
$null = Read-Host

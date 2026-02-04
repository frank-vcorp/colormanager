# ColorManager Printer Bridge
# FIX-20260204-11: Script que escucha TCP 9100 y guarda archivos para ColorManager
# Este script debe ejecutarse ANTES de ColorManager o como servicio

param(
    [int]$Port = 9100,
    [string]$SpoolDir = "$env:USERPROFILE\Documents\ColorManager\spool"
)

$listener = $null

# Crear carpeta de spool si no existe
if (-not (Test-Path $SpoolDir)) {
    New-Item -ItemType Directory -Path $SpoolDir -Force | Out-Null
}

try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  COLORMANAGER PRINTER BRIDGE" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Puerto: $Port" -ForegroundColor Gray
    Write-Host "  Spool:  $SpoolDir" -ForegroundColor Gray
    Write-Host ""
    
    # Crear listener TCP
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    
    Write-Host "[OK] Servidor escuchando en 127.0.0.1:$Port" -ForegroundColor Green
    Write-Host "[INFO] Los archivos se guardaran en: $SpoolDir" -ForegroundColor Yellow
    Write-Host "[INFO] ColorManager detectara los archivos automaticamente" -ForegroundColor Yellow
    Write-Host "[INFO] Presiona Ctrl+C para detener" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Esperando impresiones..." -ForegroundColor Gray
    Write-Host ""
    
    $jobCount = 0
    
    while ($true) {
        # Esperar conexión
        $client = $listener.AcceptTcpClient()
        $remoteIP = $client.Client.RemoteEndPoint
        $jobCount++
        
        Write-Host "[CONEXION #$jobCount] Recibida desde: $remoteIP" -ForegroundColor Blue
        
        # Leer datos
        $stream = $client.GetStream()
        $buffer = New-Object byte[] 8192
        $data = ""
        
        # Leer hasta que no haya más datos
        do {
            Start-Sleep -Milliseconds 50
            if ($stream.DataAvailable) {
                $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                $data += [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($buffer, 0, $bytesRead)
            }
        } while ($stream.DataAvailable -or ($data.Length -eq 0 -and $client.Connected))
        
        # Esperar un poco más por si hay datos adicionales
        Start-Sleep -Milliseconds 300
        while ($stream.DataAvailable) {
            $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
            $data += [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($buffer, 0, $bytesRead)
        }
        
        $client.Close()
        
        if ($data.Length -gt 0) {
            # Generar nombre de archivo único
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
            $filename = "receta_$timestamp.txt"
            $filepath = Join-Path $SpoolDir $filename
            
            # Guardar archivo
            [System.IO.File]::WriteAllText($filepath, $data, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
            
            Write-Host "[GUARDADO] $filename ($($data.Length) bytes)" -ForegroundColor Green
            
            # Mostrar preview
            $preview = $data.Substring(0, [Math]::Min(200, $data.Length)) -replace "`n", " "
            Write-Host "  Preview: $preview..." -ForegroundColor DarkGray
            Write-Host ""
        } else {
            Write-Host "[WARN] Conexion sin datos" -ForegroundColor Yellow
        }
        
        Write-Host "Esperando siguiente impresion..." -ForegroundColor Gray
    }
}
catch {
    Write-Host "[ERROR] $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "  - El puerto $Port ya esta en uso (cierre ColorManager primero)" -ForegroundColor Gray
    Write-Host "  - Falta permisos de administrador" -ForegroundColor Gray
}
finally {
    if ($listener) {
        $listener.Stop()
        Write-Host "[INFO] Servidor detenido" -ForegroundColor Yellow
    }
}

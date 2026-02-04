; ColorManager NSIS Installer Script
; Instala automáticamente la impresora virtual para recibir recetas de Sayer
; IMPL-20260204-03

!macro customInstall
  ; Crear puerto TCP/IP para impresora virtual
  DetailPrint "Configurando impresora ColorManager..."
  
  ; Usar PowerShell para crear el puerto y la impresora
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -Command "\
    $portName = \"ColorManager_9100\"; \
    $printerName = \"ColorManager Printer\"; \
    $portExists = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue; \
    if (-not $portExists) { \
      Add-PrinterPort -Name $portName -PrinterHostAddress \"127.0.0.1\" -PortNumber 9100 -ErrorAction SilentlyContinue; \
      Write-Host \"Puerto TCP/IP creado: $portName\"; \
    } else { \
      Write-Host \"Puerto ya existe: $portName\"; \
    }; \
    $printerExists = Get-Printer -Name $printerName -ErrorAction SilentlyContinue; \
    if (-not $printerExists) { \
      Add-Printer -Name $printerName -DriverName \"Generic / Text Only\" -PortName $portName -ErrorAction SilentlyContinue; \
      Write-Host \"Impresora creada: $printerName\"; \
    } else { \
      Write-Host \"Impresora ya existe: $printerName\"; \
    }"'
  
  DetailPrint "Impresora ColorManager configurada."
!macroend

!macro customUnInstall
  ; Remover impresora y puerto al desinstalar
  DetailPrint "Removiendo impresora ColorManager..."
  
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -Command "\
    $portName = \"ColorManager_9100\"; \
    $printerName = \"ColorManager Printer\"; \
    $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue; \
    if ($printer) { \
      Remove-Printer -Name $printerName -ErrorAction SilentlyContinue; \
      Write-Host \"Impresora removida: $printerName\"; \
    }; \
    Start-Sleep -Seconds 1; \
    $port = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue; \
    if ($port) { \
      Remove-PrinterPort -Name $portName -ErrorAction SilentlyContinue; \
      Write-Host \"Puerto removido: $portName\"; \
    }"'
  
  DetailPrint "Limpieza completada."
!macroend

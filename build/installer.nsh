; ColorManager NSIS Installer Script
; Instala automaticamente la impresora virtual y servicio para recibir recetas de Sayer
; IMPL-20260204-03
; FIX-20260204-14: Usar complete-setup.ps1 que configura todo automaticamente

!macro customInstall
  DetailPrint "=========================================="
  DetailPrint "Configurando ColorManager Printer..."
  DetailPrint "=========================================="
  
  ; El script esta en resources/ (extraResources de electron-builder)
  SetOutPath "$INSTDIR\resources"
  
  ; Ejecutar el script de configuracion completa
  DetailPrint "Ejecutando configuracion completa..."
  
  ; Usar nsExec para ejecutar PowerShell con los privilegios del instalador
  nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\complete-setup.ps1" -Action install'
  Pop $0 ; Return code
  Pop $1 ; Output
  
  DetailPrint "Codigo retorno: $0"
  
  ; Si fallo con complete-setup, intentar con setup-printer como fallback
  StrCmp $0 "0" InstallDone 0
  StrCmp $0 "" InstallDone 0
  
  DetailPrint "Intentando configuracion basica..."
  nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\setup-printer.ps1" -Action install'
  Pop $0
  Pop $1
  DetailPrint "Codigo retorno (fallback): $0"
    
InstallDone:
  DetailPrint "=========================================="
  DetailPrint "Configuracion de impresora completada"
  DetailPrint "=========================================="
!macroend

!macro customUnInstall
  DetailPrint "=========================================="
  DetailPrint "Removiendo ColorManager Printer..."
  DetailPrint "=========================================="
  
  ; Ejecutar script de desinstalacion completa
  IfFileExists "$INSTDIR\resources\complete-setup.ps1" UninstallComplete UninstallBasic
  
UninstallComplete:
  nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\complete-setup.ps1" -Action uninstall'
  Pop $0
  Pop $1
  DetailPrint "Codigo retorno: $0"
  Goto UninstallDone

UninstallBasic:
  ; Fallback al script basico
  IfFileExists "$INSTDIR\resources\setup-printer.ps1" UninstallPrinter SkipUninstall
  
UninstallPrinter:
  nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\setup-printer.ps1" -Action uninstall'
  Pop $0
  Pop $1
  DetailPrint "Codigo retorno: $0"
  Goto UninstallDone
    
SkipUninstall:
  DetailPrint "Scripts no encontrados, saltando..."
    
UninstallDone:
  DetailPrint "=========================================="
  DetailPrint "Remocion completada"
  DetailPrint "=========================================="
!macroend

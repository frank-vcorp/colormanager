; ColorManager NSIS Installer Script
; Instala automáticamente la impresora virtual para recibir recetas de Sayer
; IMPL-20260204-03
; FIX-20260204-08: Corregir ruta del script y usar ExecWait para mejor compatibilidad

!macro customInstall
  DetailPrint "Configurando impresora ColorManager..."
  
  ; El script está en resources/ (extraResources de electron-builder)
  ; Usamos ExecWait que espera a que termine y hereda los privilegios de admin del instalador
  SetOutPath "$INSTDIR\resources"
  
  ; Copiar el script a un lugar accesible si no existe
  IfFileExists "$INSTDIR\resources\setup-printer.ps1" RunScript CopyScript
  
  CopyScript:
    DetailPrint "Copiando script de impresora..."
    ; El script ya debería estar ahí por extraResources
    
  RunScript:
    DetailPrint "Ejecutando instalación de impresora..."
    ; Usar nsExec con privilegios heredados del instalador (que ya es admin)
    nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\setup-printer.ps1" -Action install'
    Pop $0 ; Return code
    Pop $1 ; Output
    DetailPrint "Código retorno: $0"
    DetailPrint "Salida: $1"
    
    ; Si falló, intentar con la ruta alternativa
    StrCmp $0 "0" InstallDone 0
    StrCmp $0 "" InstallDone 0
    
    DetailPrint "Intentando ruta alternativa..."
    nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "& {Set-Location \"$INSTDIR\resources\"; ./setup-printer.ps1 -Action install}"'
    Pop $0
    Pop $1
    DetailPrint "Código retorno (alt): $0"
    DetailPrint "Salida (alt): $1"
    
  InstallDone:
    DetailPrint "Configuración de impresora completada"
!macroend

!macro customUnInstall
  DetailPrint "Removiendo impresora ColorManager..."
  
  ; Ejecutar script de desinstalación si existe
  IfFileExists "$INSTDIR\resources\setup-printer.ps1" UninstallPrinter SkipUninstall
  
  UninstallPrinter:
    nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\setup-printer.ps1" -Action uninstall'
    Pop $0
    Pop $1
    DetailPrint "Código retorno: $0"
    DetailPrint "Salida: $1"
    Goto UninstallDone
    
  SkipUninstall:
    DetailPrint "Script de impresora no encontrado, saltando..."
    
  UninstallDone:
    DetailPrint "Remoción de impresora completada"
!macroend

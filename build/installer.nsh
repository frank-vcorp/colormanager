; ColorManager NSIS Installer Script
; Instala automáticamente la impresora virtual para recibir recetas de Sayer
; IMPL-20260204-03

!macro customInstall
  DetailPrint "Configurando impresora ColorManager..."
  ; El script está en resources/ relativo a $INSTDIR
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\setup-printer.ps1" -Action install'
  Pop $0
  DetailPrint "Resultado instalación impresora: $0"
!macroend

!macro customUnInstall
  DetailPrint "Removiendo impresora ColorManager..."
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\setup-printer.ps1" -Action uninstall'
  Pop $0
  DetailPrint "Resultado remoción impresora: $0"
!macroend

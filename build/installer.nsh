; ColorManager NSIS Installer Script
; Instala automáticamente la impresora virtual para recibir recetas de Sayer
; IMPL-20260204-03

!macro customInstall
  DetailPrint "Configurando impresora ColorManager..."
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\resources\setup-printer.ps1" -Action install'
  DetailPrint "Impresora ColorManager configurada."
!macroend

!macro customUnInstall
  DetailPrint "Removiendo impresora ColorManager..."
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\resources\setup-printer.ps1" -Action uninstall'
  DetailPrint "Limpieza completada."
!macroend

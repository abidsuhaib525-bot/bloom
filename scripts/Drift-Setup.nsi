; Drift-Setup.nsi
; Modern, AV-friendly, user-level NSIS installer for Drift (V-Notch Architecture)
; Compression: Solid LZMA
; Target: $LOCALAPPDATA\Programs\Drift (Zero Administrator UAC prompt needed)

!define APP_NAME "Drift"
!define APP_PUBLISHER "Drift"
!define APP_EXE "drift.exe"
!define APP_BUILD_DIR "..\src-tauri\target\release"
!define APP_URL "https://github.com/abidsuhaib525-bot/drift"

!define APP_VERSION "3.9.2"
!define APP_VERSION_FULL "3.9.2.0"

!include "LogicLib.nsh"
!include "x64.nsh"

; ── Version Info (Critical for Windows SmartScreen & AV Trust) ──
VIProductVersion "${APP_VERSION_FULL}"
VIFileVersion "${APP_VERSION_FULL}"
VIAddVersionKey "ProductName"      "${APP_NAME}"
VIAddVersionKey "CompanyName"      "${APP_PUBLISHER}"
VIAddVersionKey "LegalCopyright"   "Copyright © 2026 ${APP_PUBLISHER}"
VIAddVersionKey "FileDescription"  "${APP_NAME} Installer"
VIAddVersionKey "FileVersion"      "${APP_VERSION_FULL}"
VIAddVersionKey "ProductVersion"   "${APP_VERSION}"
VIAddVersionKey "OriginalFilename" "Drift-Setup.exe"
VIAddVersionKey "InternalName"     "Drift-Setup"

Name "${APP_NAME} ${APP_VERSION}"
OutFile "..\installers\Drift-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP_NAME}"
RequestExecutionLevel user
SetCompressor /SOLID lzma

; Visual Branding
Icon "..\src-tauri\icons\icon.ico"
UninstallIcon "..\src-tauri\icons\icon.ico"

; Modern UI setup
Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

Section "Install"
    DetailPrint "Preparing ${APP_NAME} installation..."

    ; Gracefully stop running process to avoid locked file errors
    DetailPrint "Closing any running instances of ${APP_NAME}..."
    nsExec::ExecToStack 'taskkill /F /IM drift.exe'
    Sleep 600

    ; Output folder
    SetOutPath "$INSTDIR"
    DetailPrint "Extracting application payload..."
    File "${APP_BUILD_DIR}\drift.exe"

    ; Create Uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; Create Start Menu Shortcuts
    DetailPrint "Creating shortcuts..."
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

    ; Create Desktop Shortcut
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

    ; Register Auto-Start with Windows
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}" '"$INSTDIR\${APP_EXE}"'

    ; Register Uninstaller in Windows 10/11 Settings -> "Installed Apps"
    DetailPrint "Registering application with Windows..."
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\${APP_EXE},0"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout" "${APP_URL}"

    ; Launch app immediately after installation
    DetailPrint "Launching ${APP_NAME}..."
    ExecShell "" "$INSTDIR\${APP_EXE}"
SectionEnd

Section "Uninstall"
    DetailPrint "Stopping running instances of ${APP_NAME}..."
    nsExec::ExecToStack 'taskkill /F /IM drift.exe'
    Sleep 500

    ; Remove Shortcuts
    DetailPrint "Removing shortcuts..."
    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME}"

    ; Remove Registry Keys
    DetailPrint "Cleaning registry entries..."
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

    ; Remove Application Files
    DetailPrint "Removing application files..."
    Delete "$INSTDIR\drift.exe"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir /r "$INSTDIR"
SectionEnd

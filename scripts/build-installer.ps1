# Build Drift Installer (V-Notch Architecture)
# Builds Release payload and generates modern LZMA NSIS Installer
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [string]$NsisPath = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$repoRoot = Split-Path $scriptDir -Parent

function Write-Step([string]$Tag, [string]$Title) {
    Write-Host "  [$Tag] " -ForegroundColor Cyan -NoNewline
    Write-Host $Title -ForegroundColor White
}

function Write-Info([string]$Message, [string]$State = "Info") {
    switch ($State) {
        "Info"    { Write-Host "     > " -ForegroundColor DarkCyan -NoNewline; Write-Host $Message -ForegroundColor Gray }
        "Success" { Write-Host "     + " -ForegroundColor Green -NoNewline; Write-Host $Message -ForegroundColor White }
        "Warn"    { Write-Host "     ! " -ForegroundColor Yellow -NoNewline; Write-Host $Message -ForegroundColor Yellow }
        "Error"   { Write-Host "     x " -ForegroundColor Red -NoNewline; Write-Host $Message -ForegroundColor Red }
    }
}

Push-Location $repoRoot
try {
    Write-Host "`n========================================================" -ForegroundColor DarkCyan
    Write-Host "         DRIFT INSTALLER BUILD ENGINE (V-NOTCH)         " -ForegroundColor Cyan
    Write-Host "========================================================`n" -ForegroundColor DarkCyan

    # Step 1: Ensure NSIS is available
    Write-Step "1/3" "Locating NSIS 3.x Compiler"
    $compiler = $null

    if ($NsisPath -and (Test-Path $NsisPath)) {
        $compiler = $NsisPath
    } elseif (Get-Command "makensis" -ErrorAction SilentlyContinue) {
        $compiler = (Get-Command "makensis").Source
    } else {
        # Check standard Tauri or Program Files locations
        $candidates = @(
            "$env:LOCALAPPDATA\tauri\NSIS\makensis.exe",
            "$env:ProgramFiles\NSIS\makensis.exe",
            "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
            "$repoRoot\.nsis\nsis-3.12\makensis.exe",
            "$env:LOCALAPPDATA\Programs\NSIS\makensis.exe"
        )
        foreach ($c in $candidates) {
            if (Test-Path $c) {
                $compiler = $c
                break
            }
        }
    }

    if (-not $compiler) {
        Write-Info "NSIS not found locally. Downloading portable NSIS 3.12 toolchain..." "Warn"
        $toolsDir = Join-Path $repoRoot ".nsis"
        New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
        $zipPath = Join-Path $toolsDir "nsis-3.12.zip"
        
        if (-not (Test-Path $zipPath)) {
            $url = "https://phoenixnap.dl.sourceforge.net/project/nsis/NSIS%203/3.12/nsis-3.12.zip"
            Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
        }
        
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $toolsDir, $true)
        $compiler = Join-Path $toolsDir "nsis-3.12\makensis.exe"
    }

    if (-not (Test-Path $compiler)) {
        throw "Failed to locate makensis.exe. Please install NSIS or specify -NsisPath."
    }
    Write-Info "Using NSIS: $compiler" "Success"

    # Step 2: Build Payload
    if (-not $SkipBuild) {
        Write-Step "2/3" "Building Release Binaries (Bun + Cargo)"
        Write-Info "Compiling frontend assets..."
        bun run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

        Write-Info "Compiling Rust release executable..."
        Push-Location "src-tauri"
        try {
            cargo build --release
            if ($LASTEXITCODE -ne 0) { throw "Rust compilation failed" }
        } finally {
            Pop-Location
        }
        Write-Info "Release binaries built successfully." "Success"
    } else {
        Write-Step "2/3" "Skipping build steps (-SkipBuild specified)"
    }

    # Step 3: Compile Installer
    Write-Step "3/3" "Generating Drift-Setup.exe via NSIS (Solid LZMA)"
    $installerDir = Join-Path $repoRoot "installers"
    New-Item -ItemType Directory -Path $installerDir -Force | Out-Null

    $nsiFile = Join-Path $scriptDir "Drift-Setup.nsi"
    & "$compiler" "$nsiFile"
    if ($LASTEXITCODE -ne 0) { throw "NSIS compiler failed." }

    $targetExe = Join-Path $installerDir "Drift-Setup.exe"
    if (Test-Path $targetExe) {
        $sizeMB = [math]::Round((Get-Item $targetExe).Length / 1MB, 2)
        Write-Info "Installer created: $targetExe ($sizeMB MB)" "Success"
        Write-Host "`n[DONE] Professional V-Notch-style installer ready!`n" -ForegroundColor Green
    }
} finally {
    Pop-Location
}

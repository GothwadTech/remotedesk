<#
.SYNOPSIS
    One-Time Transparent Installer for Gothwad Remote Desktop Agent (Zero-D1 WebRTC P2P).

.DESCRIPTION
    - Requires explicit confirmation from the PC owner.
    - Downloads GothwadRemoteAgent-win64.exe from GothwadTech/remotedesktop GitHub Releases.
    - Links this PC (Main Windows OS + Hyper-V VM) to your @gothwadtech.com P2P slot.
    - Registers a transparent startup task ('GothwadRemoteAgent') so it reconnects on boot.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$GothwadUser,

    [Parameter(Mandatory = $false)]
    [int]$Slot = 1,

    [Parameter(Mandatory = $false)]
    [string]$DeviceName = $env:COMPUTERNAME,

    [Parameter(Mandatory = $false)]
    [string]$VMName = "RemoteWorkVM",

    [Parameter(Mandatory = $false)]
    [string]$ReleaseExeUrl = "https://github.com/GothwadTech/remotedesktop/releases/latest/download/GothwadRemoteAgent-win64.exe"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Gothwad Remote Desktop — Zero-D1 WebRTC P2P Setup             " -ForegroundColor Cyan
Write-Host "  Portal: https://remotedesktop.gothwadtech.com                 " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: Run ONLY with the explicit permission of this PC's owner." -ForegroundColor Yellow

$consentInput = Read-Host "Does the PC owner consent to linking this PC with Gothwad Remote Desktop? Type YES to continue"
if ($consentInput -ne "YES") {
    Write-Warning "Setup cancelled (Owner consent not confirmed)."
    exit 1
}

$pinPlain = Read-Host "Create a 6 to 12 digit Remote Access PIN (numeric)"
if ($pinPlain -notmatch '^\d{6,12}$') {
    Write-Error "PIN must be 6 to 12 digits."
    exit 1
}

$installDir = "C:\Program Files\GothwadRemote"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
$exePath = Join-Path $installDir "GothwadRemoteAgent.exe"

Write-Host "[1/3] Downloading GothwadRemoteAgent from GitHub Releases..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $ReleaseExeUrl -OutFile $exePath
} catch {
    $fallbackUrl = "https://github.com/GothwadTech/vm/releases/latest/download/GothwadRemoteAgent-win64.exe"
    Invoke-WebRequest -Uri $fallbackUrl -OutFile $exePath
}

Write-Host "[2/3] Configuring Zero-D1 P2P Slot $Slot for '$GothwadUser@gothwadtech.com'..." -ForegroundColor Green
& $exePath --pair --gothwad-user $GothwadUser --slot $Slot --device-name $DeviceName --vm-name $VMName --pin $pinPlain --confirm-owner-consent

Write-Host "[3/3] Registering startup Scheduled Task 'GothwadRemoteAgent'..." -ForegroundColor Green
$action = New-ScheduledTaskAction -Execute $exePath -Argument "--run"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 2)

Register-ScheduledTask -TaskName "GothwadRemoteAgent" `
    -Description "Gothwad Remote Desktop & Hyper-V P2P Agent (https://remotedesktop.gothwadtech.com)" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force | Out-Null

Start-ScheduledTask -TaskName "GothwadRemoteAgent"
Write-Host ""
Write-Host "Done! Open https://remotedesktop.gothwadtech.com in your browser to control Main OS or Hyper-V VM '$VMName'." -ForegroundColor Cyan

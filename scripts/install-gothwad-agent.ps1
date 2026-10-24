<#
.SYNOPSIS
    PowerShell Installer for Gothwad Remote Desktop Host (Zero-D1 WebRTC P2P).

.DESCRIPTION
    - Requires explicit confirmation from the PC owner.
    - Downloads GothwadRemoteHostSetup.exe from GothwadTech/remotedesk GitHub Releases.
    - Configures and starts the background Windows Host service.
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
    [string]$ReleaseExeUrl = "https://github.com/GothwadTech/remotedesk/releases/latest/download/GothwadRemoteHostSetup.exe"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Gothwad Remote Desktop Host — Windows Setup                   " -ForegroundColor Cyan
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
$exePath = Join-Path $installDir "GothwadRemoteHost.exe"

Write-Host "[1/2] Downloading GothwadRemoteHostSetup.exe from GitHub Releases..." -ForegroundColor Green
Invoke-WebRequest -Uri $ReleaseExeUrl -OutFile $exePath

Write-Host "[2/2] Configuring Slot $Slot and starting background host service..." -ForegroundColor Green
& $exePath --pair --gothwad-user $GothwadUser --slot $Slot --device-name $DeviceName --vm-name $VMName --pin $pinPlain --confirm-owner-consent

Write-Host ""
Write-Host "Done! Open https://remotedesktop.gothwadtech.com on your phone or browser to connect." -ForegroundColor Cyan

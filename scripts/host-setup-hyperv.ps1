<#
.SYNOPSIS
    Transparent Hyper-V Headless VM Provisioning Script for Windows 11 Pro (16GB RAM / 512GB SSD Host).

.DESCRIPTION
    Run ONLY with the explicit permission of the PC owner.
    - Enables Microsoft Hyper-V if not yet enabled.
    - Creates an isolated Generation 2 VM connected to 'Default Switch' (Wi-Fi NAT friendly).
    - Caps RAM (Dynamic 1.5GB - 4GB) and CPU (Max 60%) so the host PC stays fast and cool.
    - Configures Automatic Start on Boot (30s delay) and Automatic State Save on Shutdown.

.EXAMPLE
    .\host-setup-hyperv.ps1 -VMName "RemoteWorkVM" -GuestType "Linux" -IsoPath "C:\HyperV\ISO\ubuntu-24.04.iso"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$VMName = "RemoteWorkVM",

    [Parameter(Mandatory = $false)]
    [ValidateSet("Linux", "Windows")]
    [string]$GuestType = "Linux",

    [Parameter(Mandatory = $true)]
    [string]$IsoPath,

    [Parameter(Mandatory = $false)]
    [string]$BaseFolder = "C:\HyperV",

    [Parameter(Mandatory = $false)]
    [int]$DiskSizeGB = 50,

    [Parameter(Mandatory = $false)]
    [int]$MaxRamMB = 4096
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Hyper-V Headless Background VM Setup (Transparent Mode)   " -ForegroundColor Cyan
Write-Host "  IMPORTANT: Run ONLY with the laptop owner's full consent. " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Please run PowerShell as Administrator (Right-click -> Run as Administrator)."
    exit 1
}

# 2. Check if Hyper-V is enabled
$hypervFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V
if ($hypervFeature.State -ne "Enabled") {
    Write-Host "[!] Hyper-V is not enabled yet. Enabling Microsoft-Hyper-V-All..." -ForegroundColor Yellow
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
    Write-Host "[+] Hyper-V has been enabled. Please restart this Windows PC once and run this script again." -ForegroundColor Green
    exit 0
}

# 3. Validate ISO file path
if (-not (Test-Path -Path $IsoPath)) {
    Write-Error "ISO file not found: $IsoPath. Please pass a valid -IsoPath."
    exit 1
}

# 4. Prepare directories
$vmPath = Join-Path $BaseFolder "VMs"
$vhdPath = Join-Path $vmPath "$VMName\$VMName.vhdx"
New-Item -ItemType Directory -Force -Path $vmPath | Out-Null

if (Get-VM -Name $VMName -ErrorAction SilentlyContinue) {
    Write-Error "VM '$VMName' already exists. Specify a different -VMName or check the existing VM."
    exit 1
}

Write-Host "[1/6] Creating Generation 2 VM '$VMName' on 'Default Switch'..." -ForegroundColor Green
$startupBytes = if ($GuestType -eq "Linux") { 2560MB } else { 3584MB }
$minBytes     = 1536MB
$maxBytes     = ($MaxRamMB * 1MB)
$diskBytes    = ([int64]$DiskSizeGB * 1GB)

New-VM -Name $VMName `
    -MemoryStartupBytes $startupBytes `
    -Generation 2 `
    -NewVHDPath $vhdPath `
    -NewVHDSizeBytes $diskBytes `
    -Path $vmPath `
    -SwitchName "Default Switch" | Out-Null

Write-Host "[2/6] Setting Dynamic Memory Limits (Min: 1.5GB | Max: $($MaxRamMB)MB)..." -ForegroundColor Green
Set-VMMemory -VMName $VMName `
    -DynamicMemoryEnabled $true `
    -MinimumBytes $minBytes `
    -StartupBytes $startupBytes `
    -MaximumBytes $maxBytes

Write-Host "[3/6] Setting CPU Cap (2 vCPUs, Max 60% Host Load so laptop stays cool)..." -ForegroundColor Green
Set-VMProcessor -VMName $VMName -Count 2 -Maximum 60

Write-Host "[4/6] Attaching Installer ISO & Configuring Secure Boot for $GuestType..." -ForegroundColor Green
Add-VMDvdDrive -VMName $VMName -Path $IsoPath | Out-Null
$dvd = Get-VMDvdDrive -VMName $VMName

if ($GuestType -eq "Linux") {
    Set-VMFirmware -VMName $VMName `
        -EnableSecureBoot On `
        -SecureBootTemplate "MicrosoftUEFICertificateAuthority" `
        -FirstBootDevice $dvd
} else {
    Set-VMFirmware -VMName $VMName `
        -EnableSecureBoot On `
        -SecureBootTemplate "MicrosoftWindows" `
        -FirstBootDevice $dvd
    # Enable vTPM for Windows 11 compatibility
    Set-VMKeyProtector -VMName $VMName -NewLocalKeyProtector
    Enable-VMTPM -VMName $VMName
}

Write-Host "[5/6] Setting 1080p Virtual Display & Headless Auto-Start/Save Lifecycle..." -ForegroundColor Green
Set-VMVideo -VMName $VMName -HorizontalResolution 1920 -VerticalResolution 1080 -ResolutionType Single

Set-VM -Name $VMName `
    -AutomaticStartAction Start `
    -AutomaticStartDelay 30 `
    -AutomaticStopAction Save `
    -CheckpointType Disabled

Write-Host "[6/6] VM '$VMName' successfully created!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open 'Hyper-V Manager' -> Double-click '$VMName' -> Click 'Start' to install $GuestType."
Write-Host "  2. Inside the VM, setup Browser Access (Option A: Chrome Remote Desktop OR Option B: KasmVNC + Cloudflare)."
Write-Host "  3. Close the Hyper-V window — '$VMName' will keep running headlessly in the background and auto-start on every boot!"

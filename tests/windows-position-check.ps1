param([Parameter(Mandatory=$true)][string]$PetHandle)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class KeyCritterPositionCheck {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
}
'@
[void][KeyCritterPositionCheck]::SetProcessDPIAware()
$bounds = New-Object KeyCritterPositionCheck+Rect
$pet = [IntPtr]::new([Int64]::Parse($PetHandle))
if (-not [KeyCritterPositionCheck]::GetWindowRect($pet, [ref]$bounds)) {
  throw 'The pet window was not found.'
}
[ordered]@{ x = $bounds.Left; y = $bounds.Top } | ConvertTo-Json -Compress

param(
  [Parameter(Mandatory=$true)][string]$PetHandle,
  [Parameter(Mandatory=$true)][double]$XFraction,
  [Parameter(Mandatory=$true)][double]$YFraction
)
$ErrorActionPreference = 'Stop'
if ($XFraction -lt 0 -or $XFraction -gt 1 -or $YFraction -lt 0 -or $YFraction -gt 1) {
  throw 'The drag point must be inside the pet window.'
}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class KeyCritterDragCheck {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point point);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
[void][KeyCritterDragCheck]::SetProcessDPIAware()
$pet = [IntPtr]::new([Int64]::Parse($PetHandle))
$before = New-Object KeyCritterDragCheck+Rect
if (-not [KeyCritterDragCheck]::IsWindow($pet) -or -not [KeyCritterDragCheck]::GetWindowRect($pet, [ref]$before)) {
  throw 'The pet window was not found.'
}
$cursor = New-Object KeyCritterDragCheck+Point
[void][KeyCritterDragCheck]::GetCursorPos([ref]$cursor)
$startX = [int]($before.Left + ($before.Right - $before.Left) * $XFraction)
$startY = [int]($before.Top + ($before.Bottom - $before.Top) * $YFraction)
try {
  [void][KeyCritterDragCheck]::SetCursorPos($startX, $startY)
  Start-Sleep -Milliseconds 250
  [KeyCritterDragCheck]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  for ($step = 1; $step -le 8; $step++) {
    [void][KeyCritterDragCheck]::SetCursorPos(($startX - 10 * $step), ($startY - 5 * $step))
    Start-Sleep -Milliseconds 30
  }
} finally {
  [KeyCritterDragCheck]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 100
  [void][KeyCritterDragCheck]::SetCursorPos($cursor.X, $cursor.Y)
}
Start-Sleep -Milliseconds 200
$after = New-Object KeyCritterDragCheck+Rect
[void][KeyCritterDragCheck]::GetWindowRect($pet, [ref]$after)
[ordered]@{
  moved = ($after.Left -lt $before.Left - 20) -and ($after.Top -lt $before.Top - 10)
  before = @{ x = $before.Left; y = $before.Top }
  after = @{ x = $after.Left; y = $after.Top }
} | ConvertTo-Json -Compress

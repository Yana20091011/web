param(
  [Parameter(Mandatory=$true)][string]$PetHandle,
  [int]$CursorX,
  [int]$CursorY,
  [ValidateSet('Down', 'Up')][string]$Button
)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class KeyCritterPositionCheck {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point point);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
[void][KeyCritterPositionCheck]::SetProcessDPIAware()
if ($Button -eq 'Down') { [KeyCritterPositionCheck]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero) }
if ($Button -eq 'Up') { [KeyCritterPositionCheck]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero) }
if ($Button) { Start-Sleep -Milliseconds 40 }
if ($PSBoundParameters.ContainsKey('CursorX') -ne $PSBoundParameters.ContainsKey('CursorY')) {
  throw 'Both cursor coordinates must be supplied.'
}
if ($PSBoundParameters.ContainsKey('CursorX')) {
  if (-not [KeyCritterPositionCheck]::SetCursorPos($CursorX, $CursorY)) { throw 'The Windows test desktop could not move its cursor.' }
  Start-Sleep -Milliseconds 40
}
$bounds = New-Object KeyCritterPositionCheck+Rect
$pet = [IntPtr]::new([Int64]::Parse($PetHandle))
if (-not [KeyCritterPositionCheck]::GetWindowRect($pet, [ref]$bounds)) {
  throw 'The pet window was not found.'
}
$cursor = New-Object KeyCritterPositionCheck+Point
$hasCursor = [KeyCritterPositionCheck]::GetCursorPos([ref]$cursor)
[ordered]@{
  x = $bounds.Left; y = $bounds.Top
  width = $bounds.Right - $bounds.Left; height = $bounds.Bottom - $bounds.Top
  hasCursor = $hasCursor; cursorX = $cursor.X; cursorY = $cursor.Y
  leftPressed = ([KeyCritterPositionCheck]::GetAsyncKeyState(1) -band 32768) -ne 0
} | ConvertTo-Json -Compress

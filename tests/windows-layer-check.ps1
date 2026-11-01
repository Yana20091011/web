param(
  [Parameter(Mandatory=$true)][string]$PetHandle,
  [Parameter(Mandatory=$true)][string]$BrowserTitle,
  [switch]$Demote
)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class KeyCritterWindowLayer {
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr parent);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr window, uint command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr window, int index);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
}
'@
$pet = [IntPtr]::new([Int64]::Parse($PetHandle))
$browser = [IntPtr]::Zero
$petIndex = -1
$browserIndex = -1
$current = [KeyCritterWindowLayer]::GetTopWindow([IntPtr]::Zero)
for ($index=0; $current -ne [IntPtr]::Zero -and $index -lt 10000; $index++) {
  if ($current -eq $pet) { $petIndex = $index }
  $title = New-Object System.Text.StringBuilder 512
  [void][KeyCritterWindowLayer]::GetWindowText($current, $title, 512)
  if ($browser -eq [IntPtr]::Zero -and [KeyCritterWindowLayer]::IsWindowVisible($current) -and $title.ToString().Contains($BrowserTitle)) {
    $browser = $current
    $browserIndex = $index
  }
  $current = [KeyCritterWindowLayer]::GetWindow($current, 2)
}
$demoted = $false
if ($Demote -and $pet -ne [IntPtr]::Zero) {
  # Deliberately remove topmost without activating or moving the pet. The app
  # must recover its own window while the browser keeps keyboard focus.
  $demoted = [KeyCritterWindowLayer]::SetWindowPos($pet, [IntPtr](-2), 0, 0, 0, 0, 0x13)
}
$style = if ($pet -ne [IntPtr]::Zero) { [KeyCritterWindowLayer]::GetWindowLongPtr($pet, -20).ToInt64() } else { 0 }
$a = New-Object KeyCritterWindowLayer+Rect
$b = New-Object KeyCritterWindowLayer+Rect
$hasRects = [KeyCritterWindowLayer]::GetWindowRect($pet, [ref]$a) -and [KeyCritterWindowLayer]::GetWindowRect($browser, [ref]$b)
[ordered]@{
  petFound = [KeyCritterWindowLayer]::IsWindow($pet)
  browserFound = $browser -ne [IntPtr]::Zero
  petVisible = $pet -ne [IntPtr]::Zero -and [KeyCritterWindowLayer]::IsWindowVisible($pet)
  petTopmost = ($style -band 8) -ne 0
  petAboveBrowser = $petIndex -ge 0 -and $browserIndex -ge 0 -and $petIndex -lt $browserIndex
  browserHasFocus = $browser -ne [IntPtr]::Zero -and [KeyCritterWindowLayer]::GetForegroundWindow() -eq $browser
  overlapsBrowser = $hasRects -and $a.Left -lt $b.Right -and $a.Right -gt $b.Left -and $a.Top -lt $b.Bottom -and $a.Bottom -gt $b.Top
  demoted = $demoted
} | ConvertTo-Json -Compress

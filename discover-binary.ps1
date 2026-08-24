# Consulta a GitHub qué binarios base de Node existen para la versión de
# pkg-fetch instalada, y devuelve la lista de versiones para la plataforma dada.
param(
  [string]$Platform = "win"
)

$ErrorActionPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

# Tag de la release de pkg-fetch según la versión instalada.
$pkgFetchPkg = Join-Path $PSScriptRoot "node_modules\@yao-pkg\pkg-fetch\package.json"
$tag = "v3.6"
if (Test-Path $pkgFetchPkg) {
  $ver = (Get-Content $pkgFetchPkg -Raw | ConvertFrom-Json).version
  $parts = $ver.Split(".")
  $tag = "v$($parts[0]).$($parts[1])"
}

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/yao-pkg/pkg-fetch/releases/tags/$tag" -Headers @{ "User-Agent" = "noditos-build-script" }
$assetsUrl = $release.assets_url + "?per_page=100"
$assets = Invoke-RestMethod -Uri $assetsUrl -Headers @{ "User-Agent" = "noditos-build-script" }

$re = "^node-v(\d+\.\d+\.\d+)-$Platform-x64$"
$versions = @()
foreach ($a in $assets) {
  if ($a.name -match $re) { $versions += $matches[1] }
}
$versions = $versions | Sort-Object { [version]$_ } -Descending
if ($versions.Count -gt 0) {
  Write-Output ($versions -join " ")
}

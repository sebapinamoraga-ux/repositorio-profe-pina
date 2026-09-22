param(
  [Parameter(Mandatory = $true)][string]$ScriptPath,
  [Parameter(Mandatory = $true)][string]$ProjectPath,
  [Parameter(Mandatory = $true)][string]$ArchivePath
)

function Convert-ToWslPath([string]$Path) {
  $converted = & wsl.exe wslpath -a $Path
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  return $converted.Trim()
}

$wslScript = Convert-ToWslPath $ScriptPath
$wslProject = Convert-ToWslPath $ProjectPath
$wslArchive = Convert-ToWslPath $ArchivePath

& wsl.exe bash $wslScript $wslProject $wslArchive
exit $LASTEXITCODE

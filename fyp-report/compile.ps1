# =====================================================================
#  compile.ps1 -- build the FYP report on Windows (PowerShell)
#
#  Usage:   .\compile.ps1
#           .\compile.ps1 -Engine pdflatex     # fallback engine
#           .\compile.ps1 -Clean               # remove build artefacts
#
#  Four passes are needed: the first builds the .aux/.toc, biber builds
#  the bibliography, and the last two settle the Table of Contents,
#  Table of Figures, List of Tables and all cross-references.
# =====================================================================
param(
    [ValidateSet('xelatex', 'lualatex', 'pdflatex')]
    [string]$Engine = 'xelatex',
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

if ($Clean) {
    $patterns = @('*.aux', '*.bbl', '*.bcf', '*.blg', '*.lof', '*.log',
                  '*.lot', '*.out', '*.run.xml', '*.toc', '*.synctex.gz')
    foreach ($p in $patterns) {
        Get-ChildItem -Path . -Filter $p -Recurse -ErrorAction SilentlyContinue |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }
    Write-Output 'Build artefacts removed.'
    return
}

if (-not (Get-Command $Engine -ErrorAction SilentlyContinue)) {
    Write-Error "$Engine was not found on PATH. Install MiKTeX or TeX Live first."
}

Write-Output "Pass 1 of 3: $Engine"
& $Engine -interaction=nonstopmode -halt-on-error main.tex

if (Get-Command biber -ErrorAction SilentlyContinue) {
    Write-Output 'Bibliography: biber'
    & biber main
} else {
    Write-Warning 'biber not found - the reference list will be empty.'
}

Write-Output "Pass 2 of 3: $Engine"
& $Engine -interaction=nonstopmode -halt-on-error main.tex

Write-Output "Pass 3 of 3: $Engine"
& $Engine -interaction=nonstopmode -halt-on-error main.tex

Write-Output 'Done. Output: main.pdf'

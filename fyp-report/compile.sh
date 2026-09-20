#!/usr/bin/env bash
# =====================================================================
#  compile.sh -- build the FYP report (Git Bash / Linux / macOS)
#
#  Usage:   ./compile.sh                # XeLaTeX (recommended)
#           ./compile.sh pdflatex       # fallback engine
#           ./compile.sh clean          # remove build artefacts
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")"

ENGINE="${1:-xelatex}"

if [ "$ENGINE" = "clean" ]; then
  rm -f ./*.aux ./*.bbl ./*.bcf ./*.blg ./*.lof ./*.log \
        ./*.lot ./*.out ./*.run.xml ./*.toc ./*.synctex.gz \
        chapters/*.aux frontmatter/*.aux
  echo "Build artefacts removed."
  exit 0
fi

if ! command -v "$ENGINE" >/dev/null 2>&1; then
  echo "ERROR: $ENGINE not found on PATH. Install TeX Live or MiKTeX." >&2
  exit 1
fi

echo "Pass 1 of 3: $ENGINE"
"$ENGINE" -interaction=nonstopmode -halt-on-error main.tex

if command -v biber >/dev/null 2>&1; then
  echo "Bibliography: biber"
  biber main
else
  echo "WARNING: biber not found - the reference list will be empty." >&2
fi

echo "Pass 2 of 3: $ENGINE"
"$ENGINE" -interaction=nonstopmode -halt-on-error main.tex

echo "Pass 3 of 3: $ENGINE"
"$ENGINE" -interaction=nonstopmode -halt-on-error main.tex

echo "Done. Output: main.pdf"

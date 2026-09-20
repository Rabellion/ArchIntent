# ArchIntent — FYP Report (LaTeX)

Final Year Project report for the **Department of Software Engineering**,
Faculty of Engineering & Technology, **Mirpur University of Science and Technology
(MUST), Mirpur, AJK, Pakistan**.

Built from `Fyp_Proposal.pdf` and the department's *Rubrics for Evaluation of FYP
Report*.

---

## Which engine did we pick?

**XeLaTeX** — because it can use the real **Times New Roman** installed on Windows,
via `fontspec`.

`style/fypstyle.sty` detects the engine automatically:

| You compile with | What happens |
|---|---|
| `xelatex` *(recommended)* | Real Times New Roman via `fontspec` |
| `lualatex` | Same as above |
| `pdflatex` | Falls back to the `mathptmx` package (Times clone) |

So it builds either way — but **use XeLaTeX** for the intended result.

---

## How to build

```powershell
.\compile.ps1              # Windows PowerShell
```

```bash
./compile.sh               # Git Bash / Linux / macOS
```

Or manually — **four passes, do not skip them**:

```
xelatex main
biber    main
xelatex  main
xelatex  main
```

> **Why four passes?** The Table of Contents, Table of Figures and List of Tables
> are written to disk on one pass and read back on the next. After a single pass
> the contents pages are empty or wrong. Normal LaTeX behaviour, not a bug.

### Uploading to Overleaf

1. Use **`ArchIntent-FYP-Report-Overleaf.zip`** (one folder up, in `ArchIntent/`).
   Don't re-zip with Windows right-click → *Send to → Compressed folder*: Windows
   writes backslash path separators, and Overleaf can turn
   `chapters/ch1-introduction.tex` into a single flat file with a backslash in its
   name, which breaks every `\include`. The supplied zip is built with forward
   slashes.
2. Overleaf → **New Project → Upload Project** → drop the zip in.
3. **Menu → Compiler → XeLaTeX.** This is not optional — the default is pdfLaTeX,
   and the font handling differs. *(pdfLaTeX will still build via the `mathptmx`
   fallback, but XeLaTeX is the intended path.)*
4. Confirm **Menu → Main document → `main.tex`** (Overleaf usually detects it).
5. Upload `must_logo.jpg` into the **`images/`** folder — click the folder first,
   then *Upload*, so it doesn't land at the project root.
6. Hit **Recompile** twice. The first pass leaves the contents pages empty;
   Overleaf's `latexmk` settles them on the second.

**About the font on Overleaf:** Times New Roman is a Microsoft font and is not
installed on Overleaf's servers. `style/fypstyle.sty` detects this and falls back
to **TeX Gyre Termes**, a metrically identical clone — same character widths, same
line breaks, same page count. The PDF is indistinguishable to an examiner. You'll
see a yellow warning in the log saying the fallback was used; that is expected and
correct, not an error.

---

⚠️ **No LaTeX distribution is installed on this machine**, so this project has
**not been test-compiled**. It has been checked structurally (brace balance,
environment matching, every `\cite` key resolves, every `\ref` has a `\label`),
but the first real build is yours. Install
[MiKTeX](https://miktex.org/download) or [TeX Live](https://tug.org/texlive/),
or upload the folder to [Overleaf](https://overleaf.com) and set the compiler to
**XeLaTeX** under *Menu → Compiler*.

On the first MiKTeX build, expect prompts to install missing packages
(`titlesec`, `biblatex`, `hyphenat`, `tikz`, …). Accept them.

---

## What is already written vs. what you still write

Content carried over from your proposal is **your own words, reformatted** — no
arguments were rewritten and no sources were invented.

| File | State |
|---|---|
| `metadata.tex` | ✅ **Filled** — names, reg. numbers, supervisors, session |
| `references.bib` | ✅ **Filled** — your 10 real sources, numbered as in the proposal |
| `ch2-literature-review.tex` | ✅ **Written** from proposal §1.3, §2, §5 |
| `ch1-introduction.tex` | ✅ **Mostly written** from proposal §1, §1.1, §3, §4.2, §6 — scope exclusions still TODO |
| `ch3-methodology.tex` | 🟡 **Partly filled** — methodology, increments, modules and tool stack carried over; requirements, feasibility and algorithm detail are placeholders |
| `ch4-system-design.tex` | ⬜ **Placeholders** + all seven diagram slots |
| `ch5-implementation-testing.tex` | ⬜ **Placeholders** + test-case table |
| `ch6-results.tex` | ⬜ **Placeholders** |
| `ch7-conclusion.tex` | ⬜ **Placeholders** |
| `frontmatter/*` | ⬜ **Placeholders** — abstract, acknowledgments, dedication |

---

## Files created

| File | What it is |
|---|---|
| `main.tex` | Master file — document order, bibliography setup, reference-numbering lock |
| `metadata.tex` | Every personalization value, defined once |
| `style/fypstyle.sty` | All formatting rules — fonts, margins, headings, captions |
| `frontmatter/cover-title.tex` | 1. Cover title page |
| `frontmatter/inner-title.tex` | 2. Inner title page |
| `frontmatter/certification.tex` | 3. Certification + plagiarism undertaking |
| `frontmatter/dedication.tex` | 4. Dedication |
| `frontmatter/contents-pages.tex` | 5–7. Table of Contents, Table of Figures, List of Tables |
| `frontmatter/acknowledgments.tex` | 8. Acknowledgments |
| `frontmatter/abstract.tex` | 9. Abstract (2-page limit) |
| `chapters/ch1-introduction.tex` | Ch. 1 — background, problem statement, objectives, scope |
| `chapters/ch2-literature-review.tex` | Ch. 2 — from your proposal |
| `chapters/ch3-methodology.tex` | Ch. 3 — approach, requirements, tools |
| `chapters/ch4-system-design.tex` | Ch. 4 — architecture + **all seven diagram placeholders** |
| `chapters/ch5-implementation-testing.tex` | Ch. 5 — implementation + test-case table |
| `chapters/ch6-results.tex` | Ch. 6 — results, figures, discussion |
| `chapters/ch7-conclusion.tex` | Ch. 7 — conclusion + future work |
| `chapters/appendices.tex` | Optional appendices |
| `references.bib` | Your 10 sources |
| `images/README.txt` | Where to put `must_logo.jpg` and your diagrams |
| `compile.ps1` / `compile.sh` | Build scripts |

---

## Search-and-replace before submission

### 1. Required file

```
images/must_logo.jpg        <-- NOT PRESENT YET. The build fails without it.
```

### 2. The seven diagram placeholders — `chapters/ch4-system-design.tex`

```
[INSERT ER DIAGRAM HERE]                §4.2.2
[INSERT CLASS DIAGRAM HERE]             §4.2.3
[INSERT USE CASE DIAGRAM HERE]          §4.2.4
[INSERT SEQUENCE DIAGRAM HERE]          §4.2.5
[INSERT ACTIVITY DIAGRAM HERE]          §4.2.6
[INSERT STATE MACHINE DIAGRAM HERE]     §4.2.7
[INSERT COMPONENT DIAGRAM HERE]         §4.2.8
```

Extra figure slots elsewhere:

```
[INSERT SYSTEM ARCHITECTURE DIAGRAM HERE]   ch4
[INSERT PROCESS MODEL DIAGRAM HERE]         ch3   (adapt proposal Fig. 1)
[INSERT SCREENSHOT OF [SCREEN NAME] HERE]   ch5  (×2)
[INSERT RESULTS GRAPH 1 / 2 HERE]           ch6
```

To swap one in: replace the `\fypdiagram{...}` line with
`\includegraphics[width=0.8\textwidth]{your-file.png}`. Leave the surrounding
`figure`, `\caption` and `\label` lines alone — the numbering, the Table of
Figures entry and every `\ref` keep working.

### 3. Verify in `metadata.tex`

```
Project title    — proposal uses the bare name "ArchIntent"; a descriptive
                   subtitle may be expected
Session          — set to 2022–2026, derived from the FA22 prefix
Supervisor       — proposal gives "Dr. Shamila" with no surname
```

### 4. Find every remaining placeholder

```powershell
Get-ChildItem -Recurse -Filter *.tex | Select-String -Pattern '\[[A-Z]'
```

```bash
grep -rn '\[[A-Z]' --include='*.tex' .
```

Before submitting, that search should return **nothing**.

Then search for these three markers:

| Marker | Meaning |
|---|---|
| `TODO:` | Content you still have to write |
| `EXPAND:` | Written, but a final report needs more depth than a proposal did |
| `FLAG:` | ⚠️ **A citation problem carried over from your proposal — must be resolved** |

---

## ✅ Citation corrections applied to Chapter 2

Five of the proposal's citations attached sources that do not support the claims
they were attached to. All five are **fixed**. The corrections are documented in
a comment block in `ch2-literature-review.tex` — show it to your supervisor, since
this chapter now differs from the proposal on purpose.

| Claim | Proposal cited | Now cites | Why |
|---|---|---|---|
| Need for a unified pre-contract marketplace | [7] `hawlitschek2016trust` | [8] `hossain2018platform` | [7] covers trust in platform-mediated exchange — related but indirect; [8] reviews platform business models in construction specifically |
| Intent decoding capability | [2] blockchain + [3] Whisper | [3] Whisper + [5] `wu2022nlp` | [2] says nothing about intent decoding; [5] surveys NLP for construction and covers unstructured→structured conversion |
| Secure contracting capability | [3] Whisper + [4] S-BERT | [2] `li2019blockchain` + [7] `hawlitschek2016trust` | Speech recognition and sentence embeddings have nothing to do with contracting |
| "Platforms fail to deliver an integrated pre-contract solution" | [3] Whisper | [8] `hossain2018platform` | A review of platform business models in construction actually supports this |
| Togal.AI / Upwork limitations | *nothing* | [11] `togal2025overview` / [12] `upwork2025overview` | Both were named with specific limitations and no source |

The two competitor claims were also **narrowed to what a product page can
support** — Togal.AI is now described by what it is built for (takeoff from
drawings) rather than by what it cannot do, and Upwork by how its discovery works
rather than by an absolute claim about keyword matching.

**Reference count is now 12.** [11] and [12] are cited first in Table 2.1, so they
number after the ten proposal sources automatically.

### ⚠️ Still open — these need you, not the template

1. **`references.bib` [7]** — journal given as *Die Unterrichtspraxis / Teaching
   German*, which publishes German-language teaching research. Wrong journal for
   a paper on trust in the sharing economy. Volume/issue/pages look right; verify
   the journal name against the original.
2. **`references.bib` [10]** — given as "Zhang, J., et al."; the co-author names
   in the entry are a reconstruction. Verify the full author list.
3. **`references.bib` [9], [11], [12]** — vendor product pages. Open all three
   URLs, confirm the descriptions in Table 2.1 still match what each vendor
   advertises, and update the `urldate` fields to the date you checked. Vendor
   pages are the least stable source in any reference list.

### Where each source is now used

`hawlitschek2016trust` [7] is no longer in Table 2.1's first row, but it is **not
orphaned** — it remains the source for the trust claim in the contracting row, and
for Section 2.2.3 on trust and digital contracting, which is where it belongs.

---

## Other decisions to confirm

1. **Citation style.** The department template is internally inconsistent: one
   line asks for Chicago, but the only worked example is IEEE-numeric. This
   project defaults to **IEEE-numeric**, which also matches your proposal. See
   the comment block near the top of `main.tex` to switch.
2. **Reference numbering is locked** to your proposal's order via a `\nocite`
   block in `main.tex`, so [1]–[10] mean the same thing in both documents.
   Delete that block to renumber purely by citation order.
3. **Dedication page** — delete `\input{frontmatter/dedication}` from `main.tex`
   if not required.
4. **Future Work** — Ch. 7 splits Conclusion and Future Work into two sections.
   See the comment at the top of `ch7-conclusion.tex` to merge them.
5. **Appendices** — delete `\include{chapters/appendices}` from `main.tex` if
   not required.

---

## Formatting rules implemented

| Rule | Setting |
|---|---|
| Paper | A4 |
| Margins | Top / bottom / right 3 cm, **left 3.8 cm** (binding gutter) |
| Body font | Times New Roman, 12 pt |
| Line spacing | 1.5 (`\onehalfspacing`) |
| Paragraphs | Justified, indented 0.5 in, no extra gap between them |
| Hyphenation | **Disabled entirely** (`[none]{hyphenat}`) + `microtype` + loosened tolerance so lines still fit |
| Widows / orphans | Prevented (`\widowpenalty=\clubpenalty=10000`) |
| Front matter pages | Lowercase roman — Certification = **i** (title pages unnumbered) |
| Body pages | Restart at Arabic **1** at Chapter 1 |
| Header | Body chapters only — "N. CHAPTER NAME", centered |
| Footer | Centered page number, every page |
| Chapter heading | `1. INTRODUCTION` — 14 pt, **bold**, ALL CAPS, centered |
| Section heading | `1.1 PROBLEM STATEMENT` — 14 pt, ALL CAPS, *not* bold |
| Sub-section heading | `1.1.1 Something` — 12 pt, **bold**, Sentence case |
| Figure captions | **Bold** `Figure X.Y:` + normal text, centered, **below** the figure |
| Table captions | **Bold** `Table X.Y:` + normal text, centered, **above** the table |
| Numbering | Figures and tables numbered per chapter |

### Writing headings

Because the Table of Contents must show the same capitalisation as the printed
pages, type chapter and section titles **in capitals** in the source, and
sub-sections **in sentence case**:

```latex
\chapter{INTRODUCTION}            % -> "1. INTRODUCTION"
\section{PROBLEM STATEMENT}       % -> "1.1 PROBLEM STATEMENT"
\subsection{System overview}      % -> "1.1.1 System overview"
```

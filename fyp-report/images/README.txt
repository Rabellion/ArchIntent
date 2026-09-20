IMAGES FOLDER
=============

Put every image the report uses in THIS folder. The style file sets
\graphicspath{{images/}}, so you refer to them by filename only:

    \includegraphics[width=0.8\textwidth]{er-diagram.png}


ALREADY HERE
------------

must_logo.jpg          269 x 269 px
    The MUST crest, extracted from page 1 of Fyp_Proposal.pdf.
    Used by both title pages. Clean white background, no cropping needed.

    QUALITY NOTE: 269 px is the full resolution embedded in the
    proposal PDF -- there is no more detail to recover from that file.
    Printed at 3.5 cm wide that works out to about 195 DPI. Fine for a
    bound report, but slightly soft if you look closely. If you want it
    crisp, download the official crest from the university website and
    overwrite this file, keeping the same name. Nothing else changes.

activity-diagram.png   1017 x 1839 px
    The swimlane activity diagram, extracted from Figure 1 on page 8 of
    Fyp_Proposal.pdf. Already wired into Chapter 4, Section 4.2.6.
    Good resolution -- no need to redraw unless the workflow changed.

    It is sized by HEIGHT in ch4-system-design.tex, not width, because
    it is about twice as tall as it is wide. Do not change that to
    width=0.8\textwidth or it will overflow the page.


STILL NEEDED -- the six remaining diagram placeholders
------------------------------------------------------
    ER diagram, class diagram, use case diagram, sequence diagram,
    state machine diagram, component diagram.

Each placeholder in chapters/ch4-system-design.tex looks like this:

    \fypdiagram{[INSERT ER DIAGRAM HERE]}

Save your diagram here, then replace that single line with:

    \includegraphics[width=0.8\textwidth]{er-diagram.png}

Leave the surrounding \begin{figure}, \caption and \label lines alone --
the figure number, the Table of Figures entry and every \ref to it keep
working.

For a TALL diagram, size by height instead so it cannot overflow:

    \includegraphics[height=0.82\textheight,keepaspectratio]{file.png}


FORMAT ADVICE
-------------
Use PNG or PDF for diagrams, not JPG. JPG compression blurs thin lines
and small text, which is exactly what UML diagrams are made of. If your
modelling tool can export PDF or SVG, export PDF -- it stays sharp at
any zoom and prints cleanly.

<?php

/**
 * Image manifest for PakistaniMarketplaceSeeder and TestDataSeeder.
 *
 * URLs point at Picsum Photos's /id/{n}/{w}/{h} endpoint -- a
 * permanent reference to one specific fixed photo from a maintained
 * ~1000-photo set, explicitly built for long-term hotlinking stability.
 *
 * This replaces an earlier LoremFlickr-backed manifest. LoremFlickr
 * proxies Flickr's live API and is explicitly a lorem-ipsum-for-images
 * testing tool, not a production image host: 123 of 124 seeded URLs
 * were already returning 404 within hours of being written. Picsum
 * has no keyword/theme search, so this trades precise per-project
 * theming for durability -- a generic real photo that keeps loading
 * beats a themed one that goes blank.
 *
 * Every URL was verified with a real GET request (confirming HTTP 200
 * and an image/* content-type) before being written here. Regenerate
 * via scratchpad/reseed_picsum.py (session artifact, not part of the
 * shipped app).
 */

return [
    'architect_projects' => [
        'ARC-1012' => ['https://picsum.photos/id/411/800/600', 'https://picsum.photos/id/81/800/600'],
        'ARC-0002' => ['https://picsum.photos/id/320/800/600', 'https://picsum.photos/id/509/800/600'],
        'ARC-1008' => ['https://picsum.photos/id/188/800/600', 'https://picsum.photos/id/421/800/600'],
        'ARC-1006' => ['https://picsum.photos/id/500/800/600', 'https://picsum.photos/id/183/800/600'],
        'ARC-1009' => ['https://picsum.photos/id/215/800/600', 'https://picsum.photos/id/225/800/600'],
        'ARC-0003' => ['https://picsum.photos/id/177/800/600', 'https://picsum.photos/id/103/800/600'],
        'ARC-1011' => ['https://picsum.photos/id/435/800/600', 'https://picsum.photos/id/211/800/600'],
        'ARC-0001' => ['https://picsum.photos/id/371/800/600', 'https://picsum.photos/id/494/800/600'],
        'ARC-1002' => ['https://picsum.photos/id/46/800/600', 'https://picsum.photos/id/330/800/600'],
        'ARC-1004' => ['https://picsum.photos/id/110/800/600', 'https://picsum.photos/id/264/800/600'],
        'ARC-1014' => ['https://picsum.photos/id/236/800/600', 'https://picsum.photos/id/383/800/600'],
        'ARC-1016' => ['https://picsum.photos/id/21/800/600', 'https://picsum.photos/id/142/800/600'],
        'ARC-1015' => ['https://picsum.photos/id/231/800/600', 'https://picsum.photos/id/273/800/600'],
        'ARC-1017' => ['https://picsum.photos/id/321/800/600', 'https://picsum.photos/id/62/800/600'],
        'ARC-0004' => ['https://picsum.photos/id/31/800/600', 'https://picsum.photos/id/354/800/600'],
        'ARC-1018' => ['https://picsum.photos/id/65/800/600', 'https://picsum.photos/id/384/800/600'],
        'ARC-1021' => ['https://picsum.photos/id/237/800/600', 'https://picsum.photos/id/441/800/600'],
        'ARC-1003' => ['https://picsum.photos/id/450/800/600', 'https://picsum.photos/id/329/800/600'],
        'ARC-1010' => ['https://picsum.photos/id/503/800/600', 'https://picsum.photos/id/228/800/600'],
        'ARC-1019' => ['https://picsum.photos/id/506/800/600', 'https://picsum.photos/id/287/800/600'],
        'ARC-1001' => ['https://picsum.photos/id/316/800/600', 'https://picsum.photos/id/288/800/600'],
        'ARC-1022' => ['https://picsum.photos/id/145/800/600', 'https://picsum.photos/id/267/800/600'],
        'ARC-1005' => ['https://picsum.photos/id/159/800/600', 'https://picsum.photos/id/368/800/600'],
        'ARC-1020' => ['https://picsum.photos/id/367/800/600', 'https://picsum.photos/id/196/800/600'],
        'ARC-1023' => ['https://picsum.photos/id/223/800/600', 'https://picsum.photos/id/265/800/600'],
        'ARC-1024' => ['https://picsum.photos/id/157/800/600', 'https://picsum.photos/id/66/800/600'],
        'ARC-1007' => ['https://picsum.photos/id/317/800/600', 'https://picsum.photos/id/412/800/600'],
        'ARC-1013' => ['https://picsum.photos/id/2/800/600', 'https://picsum.photos/id/269/800/600'],
    ],

    'contractor_projects' => [
        'CON-0001' => ['https://picsum.photos/id/413/800/600', 'https://picsum.photos/id/364/800/600'],
        'CON-0003' => ['https://picsum.photos/id/341/800/600', 'https://picsum.photos/id/164/800/600'],
        'CON-1001' => ['https://picsum.photos/id/476/800/600', 'https://picsum.photos/id/356/800/600'],
        'CON-1005' => ['https://picsum.photos/id/266/800/600', 'https://picsum.photos/id/197/800/600'],
        'CON-1002' => ['https://picsum.photos/id/29/800/600', 'https://picsum.photos/id/294/800/600'],
        'CON-1003' => ['https://picsum.photos/id/326/800/600', 'https://picsum.photos/id/252/800/600'],
        'CON-1007' => ['https://picsum.photos/id/496/800/600', 'https://picsum.photos/id/451/800/600'],
        'CON-1009' => ['https://picsum.photos/id/172/800/600', 'https://picsum.photos/id/369/800/600'],
        'CON-1008' => ['https://picsum.photos/id/32/800/600', 'https://picsum.photos/id/123/800/600'],
        'CON-1010' => ['https://picsum.photos/id/111/800/600', 'https://picsum.photos/id/524/800/600'],
        'CON-0002' => ['https://picsum.photos/id/54/800/600', 'https://picsum.photos/id/22/800/600'],
        'CON-1012' => ['https://picsum.photos/id/23/800/600', 'https://picsum.photos/id/169/800/600'],
        'CON-1013' => ['https://picsum.photos/id/372/800/600', 'https://picsum.photos/id/175/800/600'],
        'CON-1016' => ['https://picsum.photos/id/381/800/600', 'https://picsum.photos/id/504/800/600'],
        'CON-1014' => ['https://picsum.photos/id/91/800/600', 'https://picsum.photos/id/104/800/600'],
        'CON-1015' => ['https://picsum.photos/id/109/800/600', 'https://picsum.photos/id/335/800/600'],
        'CON-1006' => ['https://picsum.photos/id/156/800/600', 'https://picsum.photos/id/87/800/600'],
        'CON-1004' => ['https://picsum.photos/id/351/800/600', 'https://picsum.photos/id/480/800/600'],
        'CON-1011' => ['https://picsum.photos/id/238/800/600', 'https://picsum.photos/id/290/800/600'],
    ],

    'portraits' => [
        'tariq.jameel' => 'https://picsum.photos/id/472/500/500',
        'tahir.yousafzai' => 'https://picsum.photos/id/24/500/500',
        'saima.rauf' => 'https://picsum.photos/id/129/500/500',
        'hamza.sheikh' => 'https://picsum.photos/id/258/500/500',
        'huzaifa.2' => 'https://picsum.photos/id/176/500/500',
        'zeeshan.abbasi' => 'https://picsum.photos/id/0/500/500',
        'mehwish.iqbal' => 'https://picsum.photos/id/90/500/500',
        'asad.mehmood' => 'https://picsum.photos/id/212/500/500',
        'huzaifa.1' => 'https://picsum.photos/id/181/500/500',
        'noman.afridi' => 'https://picsum.photos/id/96/500/500',
        'nida.baloch' => 'https://picsum.photos/id/132/500/500',
        'imran.qureshi' => 'https://picsum.photos/id/154/500/500',
        'client.dawood.2' => 'https://picsum.photos/id/426/500/500',
        'faisal.habib' => 'https://picsum.photos/id/423/500/500',
        'farah.siddiqui' => 'https://picsum.photos/id/202/500/500',
        'kamran.rashid' => 'https://picsum.photos/id/424/500/500',
        'client.dawood.1' => 'https://picsum.photos/id/347/500/500',
        'wajid.ali.khan' => 'https://picsum.photos/id/49/500/500',
        'ayesha.tariq' => 'https://picsum.photos/id/34/500/500',
        'usman.ghani' => 'https://picsum.photos/id/401/500/500',
        'ahmed.khan' => 'https://picsum.photos/id/263/500/500',
        'shahid.mahmood' => 'https://picsum.photos/id/57/500/500',
        'zara.shah' => 'https://picsum.photos/id/89/500/500',
        'ali.construction' => 'https://picsum.photos/id/449/500/500',
        'rizwan.cheema' => 'https://picsum.photos/id/358/500/500',
        'bilal.ahmed' => 'https://picsum.photos/id/229/500/500',
        'sara.malik' => 'https://picsum.photos/id/163/500/500',
        'hassan.builders' => 'https://picsum.photos/id/460/500/500',
        'rabia.noor' => 'https://picsum.photos/id/365/500/500',
        'adnan.satti' => 'https://picsum.photos/id/112/500/500',
    ],
];

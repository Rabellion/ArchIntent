<?php

/**
 * Image manifest for PakistaniMarketplaceSeeder and TestDataSeeder.
 *
 * URLs point at images.unsplash.com -- Unsplash's own permanent
 * photo CDN, the same class of URL used by production sites
 * everywhere. Every photo ID was found on a real, live Unsplash
 * search-results page for the exact theme it is used against (e.g.
 * the two Jamia Masjid project photos came from searching
 * "mosque islamic architecture dome"), not a keyword-tag proxy --
 * so unlike the two manifests before this one, these are both
 * durable AND actually match what each project/person is.
 *
 * History: v1 (LoremFlickr) had 123/124 URLs 404 within hours --
 * LoremFlickr proxies Flickr's live API and is a testing tool, not
 * a production host. v2 (Picsum) fixed durability but Picsum has no
 * keyword search, so it could not match project themes -- flagged
 * as wrong for an architecture-focused portfolio site. This is v3.
 *
 * Every URL was verified with a real GET request (HTTP 200 + an
 * image/* content-type) before being written here, and the full set
 * checked for zero duplicate URLs. Regenerate via
 * scratchpad/reseed_unsplash.py (session artifact, not part of the
 * shipped app).
 */

return [
    'architect_projects' => [
        'ARC-1001' => ['https://images.unsplash.com/photo-1762135881724-fdbd00d2f3b3?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1762507936435-4e9cb401a364?w=800&h=600&fit=crop&q=80'],
        'ARC-1002' => ['https://images.unsplash.com/photo-1778005895508-4f95e6b21fb1?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1763586261426-212e60d2959f?w=800&h=600&fit=crop&q=80'],
        'ARC-1003' => ['https://images.unsplash.com/photo-1567712595315-545da0d341b2?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1759930018775-bf3c3fe9bdc6?w=800&h=600&fit=crop&q=80'],
        'ARC-1004' => ['https://images.unsplash.com/photo-1763809631462-fda2f484b378?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1786337940929-67c9eaeee60b?w=800&h=600&fit=crop&q=80'],
        'ARC-1005' => ['https://images.unsplash.com/photo-1761158495949-247659eba9f0?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1774597998353-2b8be5199a01?w=800&h=600&fit=crop&q=80'],
        'ARC-1006' => ['https://images.unsplash.com/photo-1775377617374-b1c67996ec1f?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1782753307964-fe0a8f69f5bb?w=800&h=600&fit=crop&q=80'],
        'ARC-1007' => ['https://images.unsplash.com/photo-1580829831692-693c43561a12?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1714601344981-75e003bc5d18?w=800&h=600&fit=crop&q=80'],
        'ARC-1008' => ['https://images.unsplash.com/photo-1559458049-9d62fceeb52b?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1639781895346-054825a58d4a?w=800&h=600&fit=crop&q=80'],
        'ARC-1009' => ['https://images.unsplash.com/photo-1587351021821-f871837248c6?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1521386787102-15154d6bbca1?w=800&h=600&fit=crop&q=80'],
        'ARC-1010' => ['https://images.unsplash.com/photo-1587410198315-1f277736e66d?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1617972758319-a23ba7f07746?w=800&h=600&fit=crop&q=80'],
        'ARC-1011' => ['https://images.unsplash.com/photo-1632988663082-4bac2c1847a0?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1670528148572-9270351b95bd?w=800&h=600&fit=crop&q=80'],
        'ARC-1012' => ['https://images.unsplash.com/photo-1652487308763-4e9cee456d12?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1728206313441-281ef4ea5d62?w=800&h=600&fit=crop&q=80'],
        'ARC-1013' => ['https://images.unsplash.com/photo-1774146948217-8c622667c332?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1657707419206-1ee02449a7ab?w=800&h=600&fit=crop&q=80'],
        'ARC-1014' => ['https://images.unsplash.com/photo-1577910277144-10be41309dec?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1777445856015-e3787002c79d?w=800&h=600&fit=crop&q=80'],
        'ARC-1015' => ['https://images.unsplash.com/photo-1543304376-1ae7c2be5e59?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1678532685208-54acdd41187d?w=800&h=600&fit=crop&q=80'],
        'ARC-1016' => ['https://images.unsplash.com/photo-1669003750682-93cf2c65b9ca?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1557761469-f29c6e201784?w=800&h=600&fit=crop&q=80'],
        'ARC-1017' => ['https://images.unsplash.com/photo-1738168279272-c08d6dd22002?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1738168246881-40f35f8aba0a?w=800&h=600&fit=crop&q=80'],
        'ARC-1018' => ['https://images.unsplash.com/photo-1667510436110-79d3dabc2008?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1653972233541-f26768752d31?w=800&h=600&fit=crop&q=80'],
        'ARC-1019' => ['https://images.unsplash.com/photo-1759765099045-cf519bc13b64?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1758905458397-cb39615975a1?w=800&h=600&fit=crop&q=80'],
        'ARC-1020' => ['https://images.unsplash.com/photo-1778154973201-6f38b24aaed3?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1783679767579-097da0d1561a?w=800&h=600&fit=crop&q=80'],
        'ARC-1021' => ['https://images.unsplash.com/photo-1706736231412-936c032d47ac?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1778847749512-1c15d2fe580c?w=800&h=600&fit=crop&q=80'],
        'ARC-1022' => ['https://images.unsplash.com/photo-1687099415795-40b61242d421?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1707667573875-207658a82c68?w=800&h=600&fit=crop&q=80'],
        'ARC-1023' => ['https://images.unsplash.com/photo-1670589953903-b4e2f17a70a9?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&q=80'],
        'ARC-1024' => ['https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop&q=80'],
        'ARC-0001' => ['https://images.unsplash.com/photo-1633354747567-e0682586f082?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop&q=80'],
        'ARC-0002' => ['https://images.unsplash.com/photo-1706074740295-d7a79c079562?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&h=600&fit=crop&q=80'],
        'ARC-0003' => ['https://images.unsplash.com/photo-1724582586495-d050726cf354?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1756706718604-ef4af3970e33?w=800&h=600&fit=crop&q=80'],
        'ARC-0004' => ['https://images.unsplash.com/photo-1657978837950-03646a7c7b9e?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&h=600&fit=crop&q=80'],
    ],

    'contractor_projects' => [
        'CON-1001' => ['https://images.unsplash.com/photo-1602757115429-b4190ae087be?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1694521787162-5373b598945c?w=800&h=600&fit=crop&q=80'],
        'CON-1002' => ['https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1532562145520-b8cce2486cd2?w=800&h=600&fit=crop&q=80'],
        'CON-1003' => ['https://images.unsplash.com/photo-1782754652216-e14dd451dc91?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1782754216584-5e1e3f50d863?w=800&h=600&fit=crop&q=80'],
        'CON-1004' => ['https://images.unsplash.com/photo-1685799098734-ce4c9834623e?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1782754690395-81381da15af9?w=800&h=600&fit=crop&q=80'],
        'CON-1005' => ['https://images.unsplash.com/photo-1787672358790-871a76fdb4e6?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1651150538399-3bd977cb30c0?w=800&h=600&fit=crop&q=80'],
        'CON-1006' => ['https://images.unsplash.com/photo-1745162391671-244e8d3ccd5f?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1651855833979-80d8d469cc33?w=800&h=600&fit=crop&q=80'],
        'CON-1007' => ['https://images.unsplash.com/photo-1576577610667-c9ea0ac983fd?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1672627170267-fca17bb54156?w=800&h=600&fit=crop&q=80'],
        'CON-1008' => ['https://images.unsplash.com/photo-1672626881472-b96d3eb5445e?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1630061712710-2539eb457c55?w=800&h=600&fit=crop&q=80'],
        'CON-1009' => ['https://images.unsplash.com/photo-1715593949273-09009558300a?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1504297050568-910d24c426d3?w=800&h=600&fit=crop&q=80'],
        'CON-1010' => ['https://images.unsplash.com/photo-1706074797611-a02f9ed06439?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1706074793638-da28b90ea8ae?w=800&h=600&fit=crop&q=80'],
        'CON-1011' => ['https://images.unsplash.com/photo-1547895749-888a559fc2a7?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1627052428109-576e839d100a?w=800&h=600&fit=crop&q=80'],
        'CON-1012' => ['https://images.unsplash.com/photo-1578776349090-de61da00ff1a?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1720036236697-018370867320?w=800&h=600&fit=crop&q=80'],
        'CON-1013' => ['https://images.unsplash.com/photo-1775233123398-2b2a1316b1c7?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1763809678810-b5c9c39b2cb1?w=800&h=600&fit=crop&q=80'],
        'CON-1014' => ['https://images.unsplash.com/photo-1686629219775-fe70b6f7c3c0?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1763809676717-c1ac0c3123ee?w=800&h=600&fit=crop&q=80'],
        'CON-1015' => ['https://images.unsplash.com/photo-1772456595006-3b5cc6718ff9?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1768321902869-85d1f596c9cf?w=800&h=600&fit=crop&q=80'],
        'CON-1016' => ['https://images.unsplash.com/photo-1650825509538-ad782798c766?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1652549884754-86bb2de48c69?w=800&h=600&fit=crop&q=80'],
        'CON-0001' => ['https://images.unsplash.com/photo-1558661091-5cc1b64d0dc5?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1657346088167-b982455bf29a?w=800&h=600&fit=crop&q=80'],
        'CON-0002' => ['https://images.unsplash.com/photo-1618764889234-2d6ce7c70bd6?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1604026288681-d9fca55b06fa?w=800&h=600&fit=crop&q=80'],
        'CON-0003' => ['https://images.unsplash.com/photo-1737233451637-9fd32d96eb26?w=800&h=600&fit=crop&q=80', 'https://images.unsplash.com/photo-1653972233499-eaad56990299?w=800&h=600&fit=crop&q=80'],
    ],

    'portraits' => [
        'sara.malik' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop&q=80',
        'zara.shah' => 'https://images.unsplash.com/photo-1665224751641-8ea911ca2267?w=500&h=500&fit=crop&q=80',
        'ayesha.tariq' => 'https://images.unsplash.com/photo-1604904612715-47bf9d9bc670?w=500&h=500&fit=crop&q=80',
        'farah.siddiqui' => 'https://images.unsplash.com/photo-1582896911227-c966f6e7fb93?w=500&h=500&fit=crop&q=80',
        'nida.baloch' => 'https://images.unsplash.com/photo-1684262855358-88f296a2cfc2?w=500&h=500&fit=crop&q=80',
        'mehwish.iqbal' => 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=500&fit=crop&q=80',
        'saima.rauf' => 'https://images.unsplash.com/photo-1585240975858-7264fd020798?w=500&h=500&fit=crop&q=80',
        'rabia.noor' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop&q=80',
        'bilal.ahmed' => 'https://images.unsplash.com/photo-1600878459138-e1123b37cb30?w=500&h=500&fit=crop&q=80',
        'usman.ghani' => 'https://images.unsplash.com/photo-1640531005390-38bd92755d6a?w=500&h=500&fit=crop&q=80',
        'kamran.rashid' => 'https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?w=500&h=500&fit=crop&q=80',
        'imran.qureshi' => 'https://images.unsplash.com/photo-1648474484044-bb82df2f5a1f?w=500&h=500&fit=crop&q=80',
        'asad.mehmood' => 'https://images.unsplash.com/photo-1543132220-4bf3de6e10ae?w=500&h=500&fit=crop&q=80',
        'hamza.sheikh' => 'https://images.unsplash.com/photo-1588178454780-441fa5b99fa5?w=500&h=500&fit=crop&q=80',
        'tariq.jameel' => 'https://images.unsplash.com/photo-1642257859842-c95f9fa8121d?w=500&h=500&fit=crop&q=80',
        'hassan.builders' => 'https://images.unsplash.com/photo-1782105208181-c5b3b8996ad8?w=500&h=500&fit=crop&q=80',
        'ali.construction' => 'https://images.unsplash.com/photo-1688841747582-41097036109d?w=500&h=500&fit=crop&q=80',
        'shahid.mahmood' => 'https://images.unsplash.com/photo-1609664843043-a66fbe0684bc?w=500&h=500&fit=crop&q=80',
        'wajid.ali.khan' => 'https://images.unsplash.com/photo-1621905252472-943afaa20e20?w=500&h=500&fit=crop&q=80',
        'faisal.habib' => 'https://images.unsplash.com/photo-1575282366139-d605e098a825?w=500&h=500&fit=crop&q=80',
        'noman.afridi' => 'https://images.unsplash.com/photo-1725811641350-f63dc7442725?w=500&h=500&fit=crop&q=80',
        'zeeshan.abbasi' => 'https://images.unsplash.com/photo-1672748341520-6a839e6c05bb?w=500&h=500&fit=crop&q=80',
        'tahir.yousafzai' => 'https://images.unsplash.com/photo-1661263989552-d82526d03b0f?w=500&h=500&fit=crop&q=80',
        'adnan.satti' => 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&h=500&fit=crop&q=80',
        'rizwan.cheema' => 'https://images.unsplash.com/photo-1692895039161-e4f9554a757d?w=500&h=500&fit=crop&q=80',
        'ahmed.khan' => 'https://images.unsplash.com/photo-1613181013804-1dcba09e6a9d?w=500&h=500&fit=crop&q=80',
        'client.dawood.1' => 'https://images.unsplash.com/photo-1705645930353-0e335311ef20?w=500&h=500&fit=crop&q=80',
        'client.dawood.2' => 'https://images.unsplash.com/photo-1646227655685-a530813759b3?w=500&h=500&fit=crop&q=80',
        'huzaifa.1' => 'https://images.unsplash.com/photo-1718209881006-f6e313e2e109?w=500&h=500&fit=crop&q=80',
        'huzaifa.2' => 'https://images.unsplash.com/photo-1587715718640-987708ba38e1?w=500&h=500&fit=crop&q=80',
    ],
];

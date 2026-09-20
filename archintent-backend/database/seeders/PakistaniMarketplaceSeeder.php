<?php

namespace Database\Seeders;

use App\Models\Architect;
use App\Models\ArchitectPortfolio;
use App\Models\ArchitectProject;
use App\Models\Contractor;
use App\Models\ContractorPortfolio;
use App\Models\ContractorProject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Depth for the marketplace, specifically so semantic matching can be
 * tested rather than merely demonstrated.
 *
 * The original TestDataSeeder has three architects whose portfolios are
 * all some variation of "modern contemporary residential". Sentence-BERT
 * has almost nothing to separate them on, so every brief returns roughly
 * the same ranking and a wrong answer is indistinguishable from a right
 * one.
 *
 * Every profile below therefore occupies a deliberately distinct
 * vocabulary space -- heritage conservation, mosque design, passive
 * solar, hospital planning, cold-chain logistics, hillside resorts --
 * chosen so that a brief written for one of them should rank that
 * architect clearly above the rest. That separation is what makes the
 * ranking falsifiable: if a brief about restoring a Mughal haveli does
 * not surface the conservation specialist, the matching is wrong, and
 * now that is visible.
 *
 * Idempotent: re-running updates in place rather than duplicating, so it
 * is safe against the production database.
 */
class PakistaniMarketplaceSeeder extends Seeder
{
    private const PASSWORD = 'Test@1234';

    public function run(): void
    {
        $hash = Hash::make(self::PASSWORD);

        foreach ($this->architects() as $data) {
            $this->seedArchitect($data, $hash);
        }

        foreach ($this->contractors() as $data) {
            $this->seedContractor($data, $hash);
        }

        $this->command?->info(sprintf(
            'Seeded %d architects and %d construction companies.',
            count($this->architects()),
            count($this->contractors())
        ));
    }

    private function seedArchitect(array $data, string $hash): void
    {
        $user = User::updateOrCreate(
            ['email' => $data['email']],
            [
                'full_name' => $data['name'],
                'password_hash' => $hash,
                'role' => 'architect',
                'account_status' => 'active',
                'phone_number' => $data['phone'],
                'profile_completed' => true,
            ]
        );

        $architect = Architect::updateOrCreate(
            ['user_id' => $user->user_id],
            [
                'license_number' => $data['license'],
                'city' => $data['city'],
                'experience_years' => $data['years'],
                'specialization' => $data['specialization'],
                'design_types' => $data['design_types'],
                'bio' => $data['bio'],
                // Verified, because browse filters on it and an unverified
                // profile would never appear in a match list.
                'verification_status' => 'verified',
                'verification_document' => null,
            ]
        );

        $portfolio = ArchitectPortfolio::updateOrCreate(
            ['architect_id' => $architect->architect_id],
            [
                'bio_statement' => $data['portfolio_statement'],
                'total_projects_count' => count($data['projects']),
            ]
        );

        foreach ($data['projects'] as $project) {
            ArchitectProject::updateOrCreate(
                ['project_ref' => $project['ref']],
                [
                    'architect_portfolio_id' => $portfolio->architect_portfolio_id,
                    'project_title' => $project['title'],
                    'project_description' => $project['description'],
                    'project_type' => $project['type'],
                    'style_tags' => $project['tags'],
                    'location' => $project['location'],
                    'area_sqft' => $project['area'],
                    'year_completed' => $project['year'],
                    'budget_range_min' => $project['budget_min'],
                    'budget_range_max' => $project['budget_max'],
                    'is_featured' => $project['featured'] ?? false,
                    'visibility' => 'public',
                ]
            );
        }
    }

    private function seedContractor(array $data, string $hash): void
    {
        $user = User::updateOrCreate(
            ['email' => $data['email']],
            [
                'full_name' => $data['contact_name'],
                'password_hash' => $hash,
                'role' => 'contractor',
                'account_status' => 'active',
                'phone_number' => $data['phone'],
                'profile_completed' => true,
            ]
        );

        $contractor = Contractor::updateOrCreate(
            ['user_id' => $user->user_id],
            [
                'company_name' => $data['company'],
                'registration_number' => $data['registration'],
                'company_address' => $data['address'],
                'city' => $data['city'],
                'experience_years' => $data['years'],
                'specialization' => $data['specialization'],
                'work_types' => $data['work_types'],
                'bio' => $data['bio'],
                'verification_status' => 'verified',
                'verification_document' => null,
            ]
        );

        // ContractorPortfolio names these differently from
        // ArchitectPortfolio (company_bio / years_in_business, not
        // bio_statement) -- using the architect names here would have been
        // dropped silently by mass assignment.
        $portfolio = ContractorPortfolio::updateOrCreate(
            ['contractor_id' => $contractor->contractor_id],
            [
                'company_bio' => $data['portfolio_statement'],
                'years_in_business' => $data['years'],
                'total_projects_count' => count($data['projects']),
            ]
        );

        foreach ($data['projects'] as $project) {
            ContractorProject::updateOrCreate(
                ['project_ref' => $project['ref']],
                [
                    'contractor_portfolio_id' => $portfolio->contractor_portfolio_id,
                    'project_title' => $project['title'],
                    'project_description' => $project['description'],
                    'project_type' => $project['type'],
                    'location' => $project['location'],
                    'area_sqft' => $project['area'],
                    'completion_date' => $project['completed'],
                    'project_value_pkr' => $project['value'],
                    'duration_days' => $project['duration'],
                    'client_feedback' => $project['feedback'],
                    'is_featured' => $project['featured'] ?? false,
                    'visibility' => 'public',
                ]
            );
        }
    }

    /**
     * Twelve architects, each in a distinct semantic niche.
     */
    private function architects(): array
    {
        return [
            [
                'name' => 'Ayesha Tariq',
                'email' => 'ayesha.tariq@archintent.pk',
                'phone' => '+92 300 4410221',
                'city' => 'Lahore',
                'license' => 'PCATP/A-4411',
                'years' => 16,
                'specialization' => 'Heritage Conservation',
                'design_types' => ['Heritage', 'Restoration', 'Adaptive Reuse'],
                'bio' => 'Conservation architect working on Mughal-era and colonial heritage fabric. Specialises in structural consolidation of historic masonry, lime plaster and fresco restoration, traditional jharoka and jali detailing, and the adaptive reuse of protected buildings under Department of Archaeology guidelines.',
                'portfolio_statement' => 'Sixteen years restoring and adaptively reusing Pakistan\'s built heritage, from Walled City havelis to colonial civic buildings.',
                'projects' => [
                    [
                        'ref' => 'ARC-1001',
                        'title' => 'Haveli Restoration, Walled City Lahore',
                        'description' => 'Full conservation of a nineteenth-century haveli in the Walled City. Work included structural consolidation of load-bearing brick masonry, replacement of decayed deodar timber beams, restoration of original lime plaster and fresco work, reinstatement of carved jharokas and wooden jali screens, and reintroduction of the traditional central courtyard for passive cooling. Executed to Department of Archaeology conservation standards with reversible interventions throughout.',
                        // architect_projects.project_type has no
                        // 'renovation' value; the conservation signal for
                        // matching lives in the description and tags.
                        'type' => 'residential',
                        'tags' => ['Heritage', 'Traditional', 'Restoration'],
                        'location' => 'Walled City, Lahore',
                        'area' => 6200,
                        'year' => 2023,
                        'budget_min' => 8000000,
                        'budget_max' => 18000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1002',
                        'title' => 'Colonial Post Office Adaptive Reuse',
                        'description' => 'Conversion of a disused British-era post office into a public archive and reading room. The original stone facade, arched verandah and high timber ceilings were retained and repaired, while new services, fire egress and accessibility were inserted as a clearly contemporary, reversible layer distinguishable from the historic fabric.',
                        'type' => 'commercial',
                        'tags' => ['Heritage', 'Adaptive Reuse', 'Classic'],
                        'location' => 'The Mall, Lahore',
                        'area' => 11000,
                        'year' => 2021,
                        'budget_min' => 15000000,
                        'budget_max' => 26000000,
                    ],
                ],
            ],
            [
                'name' => 'Usman Ghani',
                'email' => 'usman.ghani@archintent.pk',
                'phone' => '+92 301 7723845',
                'city' => 'Islamabad',
                'license' => 'PCATP/A-3920',
                'years' => 14,
                'specialization' => 'Islamic and Religious Architecture',
                'design_types' => ['Mosque', 'Religious', 'Traditional'],
                'bio' => 'Designs mosques, madrasa complexes and Islamic community buildings. Focused on qibla orientation, prayer hall acoustics, dome and minaret proportion, muqarnas and geometric ornament, calligraphic banding, and ablution and courtyard sequencing for large congregational gatherings.',
                'portfolio_statement' => 'Congregational mosques and Islamic learning complexes across Punjab and the federal capital.',
                'projects' => [
                    [
                        'ref' => 'ARC-1003',
                        'title' => 'Jamia Masjid, Bahria Enclave',
                        'description' => 'A congregational mosque for two thousand worshippers. The central dome spans the main prayer hall with a ring of clerestory openings for daylight, flanked by twin minarets. Design work covered precise qibla orientation, acoustic treatment so the imam carries without amplification distortion, hand-glazed tile mosaic in the mihrab, Thuluth calligraphic banding at the drum, and a shaded ablution court separating wudu circulation from the prayer hall entrance.',
                        'type' => 'commercial',
                        'tags' => ['Islamic', 'Traditional', 'Classic'],
                        'location' => 'Bahria Enclave, Islamabad',
                        'area' => 24000,
                        'year' => 2022,
                        'budget_min' => 40000000,
                        'budget_max' => 75000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1004',
                        'title' => 'Madrasa and Hifz Complex, Rawalpindi',
                        'description' => 'A residential Islamic school combining classrooms, a hifz memorisation hall, a library of religious texts, dormitories and a small prayer hall around a shaded courtyard. Arcaded walkways in exposed brick give shelter between blocks, and window placement prioritises indirect north light for long periods of reading.',
                        'type' => 'commercial',
                        'tags' => ['Islamic', 'Traditional', 'Minimalist'],
                        'location' => 'Satellite Town, Rawalpindi',
                        'area' => 31000,
                        'year' => 2020,
                        'budget_min' => 28000000,
                        'budget_max' => 45000000,
                    ],
                ],
            ],
            [
                'name' => 'Farah Siddiqui',
                'email' => 'farah.siddiqui@archintent.pk',
                'phone' => '+92 321 9948117',
                'city' => 'Karachi',
                'license' => 'PCATP/A-5108',
                'years' => 11,
                'specialization' => 'Sustainable and Passive Design',
                'design_types' => ['Sustainable', 'Passive Solar', 'Green Building'],
                'bio' => 'Low-energy architect working on passive solar orientation, cross ventilation and stack effect cooling, rammed earth and compressed stabilised earth block construction, rainwater harvesting, greywater recycling, solar photovoltaic integration and net-zero operational energy targets in hot arid climates.',
                'portfolio_statement' => 'Net-zero and near-zero energy buildings proving that low-carbon construction works in Pakistan\'s climate.',
                'projects' => [
                    [
                        'ref' => 'ARC-1005',
                        'title' => 'Net-Zero Energy House, DHA Karachi',
                        'description' => 'A family home operating at net-zero annual energy use. Thick rammed earth walls provide thermal mass against Karachi heat, deep overhangs and vertical fins block summer sun while admitting winter gain, and a central wind-catcher drives stack ventilation without mechanical cooling for most of the year. A twelve-kilowatt rooftop solar photovoltaic array, rainwater harvesting tank and greywater recycling for irrigation complete the system.',
                        'type' => 'residential',
                        'tags' => ['Sustainable', 'Passive Solar', 'Modern'],
                        'location' => 'DHA Phase 8, Karachi',
                        'area' => 3800,
                        'year' => 2024,
                        'budget_min' => 12000000,
                        'budget_max' => 22000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1006',
                        'title' => 'Earth-Built Eco Lodge, Tharparkar',
                        'description' => 'A desert eco lodge built almost entirely from compressed stabilised earth blocks made on site from local soil, drastically cutting embodied carbon and transport. Courtyards, lime-washed surfaces and shaded verandahs manage extreme daytime heat, while off-grid solar and a sealed rainwater cistern make the building independent of a fragile local supply.',
                        'type' => 'commercial',
                        'tags' => ['Sustainable', 'Vernacular', 'Minimalist'],
                        'location' => 'Tharparkar, Sindh',
                        'area' => 9500,
                        'year' => 2022,
                        'budget_min' => 14000000,
                        'budget_max' => 24000000,
                    ],
                ],
            ],
            [
                'name' => 'Kamran Rashid',
                'email' => 'kamran.rashid@archintent.pk',
                'phone' => '+92 333 2216708',
                'city' => 'Karachi',
                'license' => 'PCATP/A-2877',
                'years' => 19,
                'specialization' => 'High-Rise Commercial',
                'design_types' => ['High-Rise', 'Commercial', 'Mixed-Use'],
                'bio' => 'High-rise specialist delivering corporate towers and mixed-use developments. Experience covers unitised curtain wall facades, core-and-shell delivery, lift traffic analysis and vertical transportation planning, podium parking, seismic bracing for Zone 2B, and LEED-oriented base build documentation.',
                'portfolio_statement' => 'Twenty years of towers on Karachi\'s commercial spine, delivered core-and-shell for corporate tenants.',
                'projects' => [
                    [
                        'ref' => 'ARC-1007',
                        'title' => 'Twenty-Eight Storey Corporate Tower, I.I. Chundrigar',
                        'description' => 'A twenty-eight storey headquarters tower on Karachi\'s financial artery. A unitised double-glazed curtain wall with ceramic frit manages solar gain on the western elevation, a central reinforced concrete core provides lateral stability under Zone 2B seismic loading, and lift traffic analysis set six high-speed cars in two banks to hold peak waiting intervals under thirty seconds. Delivered core-and-shell with raised access floors for tenant fit-out.',
                        'type' => 'commercial',
                        'tags' => ['High-Rise', 'Contemporary', 'Glass Facade'],
                        'location' => 'I.I. Chundrigar Road, Karachi',
                        'area' => 420000,
                        'year' => 2023,
                        'budget_min' => 900000000,
                        'budget_max' => 1600000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1008',
                        'title' => 'Mixed-Use Podium Tower, Clifton',
                        'description' => 'Retail podium with four levels of structured parking supporting eighteen floors of serviced apartments above. Separating residential and retail cores kept the two circulation systems independent, and a landscaped podium roof gives residents amenity space lifted clear of the arterial road.',
                        'type' => 'commercial',
                        'tags' => ['Mixed-Use', 'High-Rise', 'Contemporary'],
                        'location' => 'Clifton Block 5, Karachi',
                        'area' => 310000,
                        'year' => 2021,
                        'budget_min' => 600000000,
                        'budget_max' => 1100000000,
                    ],
                ],
            ],
            [
                'name' => 'Nida Baloch',
                'email' => 'nida.baloch@archintent.pk',
                'phone' => '+92 312 6640933',
                'city' => 'Quetta',
                'license' => 'PCATP/A-4730',
                'years' => 13,
                'specialization' => 'Healthcare Architecture',
                'design_types' => ['Healthcare', 'Institutional'],
                'bio' => 'Hospital planner focused on clinical adjacency, infection control and patient flow. Work covers operating theatre suites with laminar airflow, isolation and negative pressure wards, sterile services departments, separation of clean and dirty circulation, medical gas distribution and emergency department triage layouts.',
                'portfolio_statement' => 'Teaching hospitals, maternity units and diagnostic centres planned around clinical adjacency and infection control.',
                'projects' => [
                    [
                        'ref' => 'ARC-1009',
                        'title' => 'Two Hundred Bed Teaching Hospital, Quetta',
                        'description' => 'A tertiary teaching hospital organised around strict separation of clean and contaminated circulation. The operating theatre suite uses laminar airflow with positive pressure cascades, an isolation ward provides negative pressure rooms with anterooms for airborne precautions, and the sterile services department sits directly below theatres on a dedicated lift. Emergency triage, imaging and the resuscitation bay form a single ground-floor adjacency to compress the time from arrival to intervention.',
                        'type' => 'commercial',
                        'tags' => ['Healthcare', 'Institutional', 'Functional'],
                        'location' => 'Sariab Road, Quetta',
                        'area' => 185000,
                        'year' => 2023,
                        'budget_min' => 700000000,
                        'budget_max' => 1200000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1010',
                        'title' => 'Maternal and Child Health Centre, Pishin',
                        'description' => 'A district maternity and neonatal unit with labour, delivery and recovery rooms, a neonatal intensive care nursery and an outpatient antenatal clinic. Planning kept the obstetric theatre within thirty seconds of the delivery suite, and separated the outpatient stream from inpatient circulation so routine antenatal visits never cross the acute pathway.',
                        'type' => 'commercial',
                        'tags' => ['Healthcare', 'Institutional', 'Minimalist'],
                        'location' => 'Pishin, Balochistan',
                        'area' => 42000,
                        'year' => 2021,
                        'budget_min' => 120000000,
                        'budget_max' => 220000000,
                    ],
                ],
            ],
            [
                'name' => 'Imran Qureshi',
                'email' => 'imran.qureshi@archintent.pk',
                'phone' => '+92 345 5518260',
                'city' => 'Peshawar',
                'license' => 'PCATP/A-3355',
                'years' => 15,
                'specialization' => 'Educational Architecture',
                'design_types' => ['Educational', 'Institutional', 'Campus'],
                'bio' => 'Campus and school architect working on classroom daylighting and acoustics, laboratory and workshop planning, library and learning commons design, universal accessibility, safeguarding sightlines across playgrounds, and phased campus master planning that allows teaching to continue through construction.',
                'portfolio_statement' => 'University campuses and government schools planned for daylight, acoustics and phased growth.',
                'projects' => [
                    [
                        'ref' => 'ARC-1011',
                        'title' => 'University Science Campus Master Plan, Peshawar',
                        'description' => 'Master plan and first-phase buildings for a science faculty: lecture theatres, teaching laboratories with fume extraction, a central library and a student commons. North-facing clerestory glazing gives even daylight without glare on laboratory benches, acoustic separation isolates lecture theatres from circulation noise, and the plan was phased so each block could be occupied while the next was still on site.',
                        'type' => 'commercial',
                        'tags' => ['Educational', 'Institutional', 'Contemporary'],
                        'location' => 'University Town, Peshawar',
                        'area' => 220000,
                        'year' => 2024,
                        'budget_min' => 550000000,
                        'budget_max' => 950000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1012',
                        'title' => 'Government Primary School and Library, Mardan',
                        'description' => 'A sixteen-classroom primary school with an attached community library. Classrooms open onto a shaded arcade facing a central playground, giving staff clear sightlines across the whole play area. Cross ventilation and high-level openings keep rooms usable through summer without air conditioning, and ramps throughout make every space step-free.',
                        'type' => 'commercial',
                        'tags' => ['Educational', 'Sustainable', 'Functional'],
                        'location' => 'Mardan, Khyber Pakhtunkhwa',
                        'area' => 38000,
                        'year' => 2022,
                        'budget_min' => 65000000,
                        'budget_max' => 120000000,
                    ],
                ],
            ],
            [
                'name' => 'Mehwish Iqbal',
                'email' => 'mehwish.iqbal@archintent.pk',
                'phone' => '+92 355 3072194',
                'city' => 'Gilgit',
                'license' => 'PCATP/A-5501',
                'years' => 10,
                'specialization' => 'Hospitality and Resorts',
                'design_types' => ['Hospitality', 'Resort', 'Tourism'],
                'bio' => 'Hospitality architect designing mountain resorts, boutique hotels and guest lodges in northern Pakistan. Work addresses guest room key counts and back-of-house separation, view-framing from every room, dry stone and local timber construction, snow loading and freeze-thaw detailing, and building on steep terrain with minimal cut and fill.',
                'portfolio_statement' => 'Boutique mountain hospitality across Gilgit-Baltistan, built from local stone and timber for hard winters.',
                'projects' => [
                    [
                        'ref' => 'ARC-1013',
                        'title' => 'Boutique Mountain Resort, Hunza Valley',
                        'description' => 'A thirty-two key boutique resort stepping down a steep slope above the Hunza river so that every room frames a view of Rakaposhi. Built in local dry stone with deodar timber framing, detailed for heavy snow loading and freeze-thaw cycling. Back-of-house service circulation is buried into the hillside, keeping staff movement and deliveries entirely out of the guest experience, and terraces are cut to follow existing contours to avoid destabilising the slope.',
                        'type' => 'commercial',
                        'tags' => ['Hospitality', 'Vernacular', 'Stone'],
                        'location' => 'Karimabad, Hunza',
                        'area' => 46000,
                        'year' => 2023,
                        'budget_min' => 180000000,
                        'budget_max' => 320000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1014',
                        'title' => 'Lakeside Guest Lodge, Skardu',
                        'description' => 'A fourteen room lodge on the shore of an alpine lake, arranged as three low timber pavilions linked by sheltered walkways so that no single mass dominates the shoreline. Triple glazing, a high-insulation envelope and a central wood-burning hearth keep the lodge usable through deep winter.',
                        'type' => 'commercial',
                        'tags' => ['Hospitality', 'Vernacular', 'Minimalist'],
                        'location' => 'Shangrila Road, Skardu',
                        'area' => 19000,
                        'year' => 2021,
                        'budget_min' => 75000000,
                        'budget_max' => 140000000,
                    ],
                ],
            ],
            [
                'name' => 'Asad Mehmood',
                'email' => 'asad.mehmood@archintent.pk',
                'phone' => '+92 302 8845560',
                'city' => 'Faisalabad',
                'license' => 'PCATP/A-4102',
                'years' => 17,
                'specialization' => 'Industrial and Logistics',
                'design_types' => ['Industrial', 'Warehouse', 'Logistics'],
                'bio' => 'Industrial architect for manufacturing plants and distribution facilities. Covers long-span steel portal frames, production line flow and material handling, crane gantries, loading dock and trailer turning circles, cold chain and insulated panel construction, and fire compartmentation for high-hazard storage.',
                'portfolio_statement' => 'Textile mills, distribution hubs and cold stores across the Punjab industrial belt.',
                'projects' => [
                    [
                        'ref' => 'ARC-1015',
                        'title' => 'Textile Spinning Mill, Faisalabad',
                        'description' => 'A spinning and weaving facility laid out around uninterrupted production line flow, from bale store through blowroom, carding and ring spinning to packing and despatch. Long-span steel portal frames give a column-free floor so machinery can be relocated as the line changes, overhead crane gantries serve the maintenance bay, and a dedicated humidification plant holds the tight relative humidity that yarn quality depends on.',
                        'type' => 'industrial',
                        'tags' => ['Industrial', 'Functional', 'Steel'],
                        'location' => 'Sitara Industrial Estate, Faisalabad',
                        'area' => 260000,
                        'year' => 2023,
                        'budget_min' => 480000000,
                        'budget_max' => 850000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1016',
                        'title' => 'Cold Chain Distribution Warehouse, Sheikhupura',
                        'description' => 'A temperature-controlled distribution centre with separate chilled and frozen chambers built from insulated sandwich panel, airlock dock shelters at every bay to hold the cold chain during loading, and a trailer yard sized for full articulated turning circles. Fire compartmentation and a dedicated sprinkler design address the high-hazard classification of stacked palletised goods.',
                        'type' => 'industrial',
                        'tags' => ['Industrial', 'Logistics', 'Functional'],
                        'location' => 'Sheikhupura Road, Punjab',
                        'area' => 140000,
                        'year' => 2022,
                        'budget_min' => 300000000,
                        'budget_max' => 520000000,
                    ],
                ],
            ],
            [
                'name' => 'Saima Rauf',
                'email' => 'saima.rauf@archintent.pk',
                'phone' => '+92 308 1193472',
                'city' => 'Lahore',
                'license' => 'PCATP/A-5744',
                'years' => 9,
                'specialization' => 'Interior Architecture',
                'design_types' => ['Interior', 'Adaptive Reuse', 'Fit-Out'],
                'bio' => 'Interior architect working on apartment and workplace interiors, bespoke joinery and millwork, layered lighting design, material and finish specification, small-footprint space planning, and the conversion of existing shells into offices, cafes and studios.',
                'portfolio_statement' => 'Interiors and fit-outs that make small and awkward footprints work harder.',
                'projects' => [
                    [
                        'ref' => 'ARC-1017',
                        'title' => 'Compact Apartment Interior, Gulberg',
                        'description' => 'A one thousand square foot apartment reworked around bespoke joinery: a full-height storage wall absorbs clutter, a folding partition lets the living area become a guest room, and concealed cove lighting layered with task and accent fittings removes the flat single-source glare of the original. Warm oak veneer, brushed brass and off-white micro-cement give the small footprint visual continuity.',
                        'type' => 'residential',
                        'tags' => ['Interior', 'Minimalist', 'Contemporary'],
                        'location' => 'Gulberg II, Lahore',
                        'area' => 1000,
                        'year' => 2024,
                        'budget_min' => 3500000,
                        'budget_max' => 7000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1018',
                        'title' => 'Warehouse to Studio Office Conversion',
                        'description' => 'Conversion of a disused single-storey warehouse into a creative studio office. The existing steel trusses and brick shell were stripped back and left exposed, a new mezzanine added floor area without touching the envelope, and acoustic baffles were hung between trusses to control reverberation in the hard-surfaced volume.',
                        'type' => 'commercial',
                        'tags' => ['Interior', 'Adaptive Reuse', 'Industrial'],
                        'location' => 'Badami Bagh, Lahore',
                        'area' => 8000,
                        'year' => 2022,
                        'budget_min' => 9000000,
                        'budget_max' => 16000000,
                    ],
                ],
            ],
            [
                'name' => 'Hamza Sheikh',
                'email' => 'hamza.sheikh@archintent.pk',
                'phone' => '+92 331 7758012',
                'city' => 'Islamabad',
                'license' => 'PCATP/A-4988',
                'years' => 12,
                'specialization' => 'Landscape and Urban Design',
                'design_types' => ['Landscape', 'Urban Design', 'Public Realm'],
                'bio' => 'Landscape architect designing public parks, waterfronts and civic plazas. Work covers native and drought-tolerant planting palettes, stormwater management and bioswales, hard landscape and paving detailing, shade structures and tree canopy strategy, pedestrian desire lines and accessible route grading.',
                'portfolio_statement' => 'Parks, promenades and plazas designed around shade, water and how people actually walk.',
                'projects' => [
                    [
                        'ref' => 'ARC-1019',
                        'title' => 'Riverfront Public Park, Islamabad',
                        'description' => 'A linear riverside park built around a continuous shaded promenade. Planting is entirely native and drought tolerant to cut irrigation demand, bioswales along the path intercept and filter stormwater before it reaches the watercourse, and a staggered canopy of indigenous shade trees keeps the walking route usable through summer afternoons. Routes are graded for step-free access along the full length.',
                        'type' => 'landscape',
                        'tags' => ['Landscape', 'Sustainable', 'Public Realm'],
                        'location' => 'Sector F-9, Islamabad',
                        'area' => 340000,
                        'year' => 2023,
                        'budget_min' => 140000000,
                        'budget_max' => 260000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1020',
                        'title' => 'Civic Plaza and Market Square, Rawalpindi',
                        'description' => 'Reworking of a congested civic forecourt into a pedestrian square. Vehicle access was pushed to the perimeter, granite paving laid in bands that read the main desire lines across the space, and a light tensile canopy added over the market edge to give traders and shoppers usable shade.',
                        'type' => 'landscape',
                        'tags' => ['Urban Design', 'Public Realm', 'Contemporary'],
                        'location' => 'Saddar, Rawalpindi',
                        'area' => 72000,
                        'year' => 2021,
                        'budget_min' => 60000000,
                        'budget_max' => 110000000,
                    ],
                ],
            ],
            [
                'name' => 'Rabia Noor',
                'email' => 'rabia.noor@archintent.pk',
                'phone' => '+92 313 4429987',
                'city' => 'Sukkur',
                'license' => 'PCATP/A-5312',
                'years' => 8,
                'specialization' => 'Affordable and Resilient Housing',
                'design_types' => ['Affordable Housing', 'Disaster Resilient', 'Modular'],
                'bio' => 'Works on low-cost and disaster-resilient housing. Focus on flood-resilient raised plinth construction, lime-stabilised and bamboo-reinforced techniques buildable by local labour, incremental housing that families can extend over time, modular repeatable unit planning, and post-disaster reconstruction at village scale.',
                'portfolio_statement' => 'Flood-resilient and incremental housing built with local labour and local materials.',
                'projects' => [
                    [
                        'ref' => 'ARC-1021',
                        'title' => 'Flood-Resilient Village Housing, Sindh',
                        'description' => 'Reconstruction of one hundred and twenty homes after flooding, using raised earthen plinths above the recorded flood line, lime-stabilised block walls and bamboo-reinforced roof structures. Every technique was chosen so village masons could build and later repair the houses without outside contractors, and each unit is planned so a family can add a second room incrementally as money allows.',
                        'type' => 'residential',
                        'tags' => ['Affordable', 'Resilient', 'Vernacular'],
                        'location' => 'Khairpur District, Sindh',
                        'area' => 96000,
                        'year' => 2024,
                        'budget_min' => 45000000,
                        'budget_max' => 85000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1022',
                        'title' => 'Low-Cost Modular Apartments, Sukkur',
                        'description' => 'A four-storey walk-up of forty-eight modular apartments built from a single repeated structural bay to cut formwork cost and construction time. Shared stair cores open to cross-ventilated corridors, and every unit gets a service balcony so that washing and storage do not colonise the living space.',
                        'type' => 'residential',
                        'tags' => ['Affordable', 'Modular', 'Functional'],
                        'location' => 'Sukkur, Sindh',
                        'area' => 58000,
                        'year' => 2022,
                        'budget_min' => 70000000,
                        'budget_max' => 130000000,
                    ],
                ],
            ],
            [
                'name' => 'Tariq Jameel',
                'email' => 'tariq.jameel@archintent.pk',
                'phone' => '+92 300 6617734',
                'city' => 'Lahore',
                'license' => 'PCATP/A-3641',
                'years' => 18,
                'specialization' => 'Luxury Contemporary Residential',
                'design_types' => ['Luxury', 'Contemporary', 'Residential'],
                'bio' => 'Designs high-end private residences and farmhouses. Work features double-height living volumes, imported marble and travertine, infinity pools and water features, home cinema and wellness suites, smart home automation, landscaped entrance courts and cantilevered concrete forms.',
                'portfolio_statement' => 'Large private residences and farmhouses for clients who want the finish to match the ambition.',
                'projects' => [
                    [
                        'ref' => 'ARC-1023',
                        'title' => 'Cantilevered Farmhouse, Bedian Road',
                        'description' => 'A four acre farmhouse organised around a double-height living volume that opens entirely to a seventy foot infinity pool. A dramatic cantilevered concrete canopy shades the terrace, Italian marble runs continuously from interior floors out to the pool deck, and the guest wing, home cinema and spa are zoned away from family quarters. Fully integrated smart home automation controls lighting, climate and security.',
                        'type' => 'residential',
                        'tags' => ['Luxury', 'Contemporary', 'Marble'],
                        'location' => 'Bedian Road, Lahore',
                        'area' => 14000,
                        'year' => 2024,
                        'budget_min' => 90000000,
                        'budget_max' => 180000000,
                        'featured' => true,
                    ],
                    [
                        'ref' => 'ARC-1024',
                        'title' => 'Travertine Courtyard Villa, DHA Lahore',
                        'description' => 'A five bedroom villa planned around a private travertine-clad courtyard with a reflecting pool at its centre. Full-height glazing on the courtyard elevations lets every principal room borrow light and view from the court, while the street facade stays deliberately closed for privacy.',
                        'type' => 'residential',
                        'tags' => ['Luxury', 'Modern', 'Courtyard'],
                        'location' => 'DHA Phase 7, Lahore',
                        'area' => 8200,
                        'year' => 2022,
                        'budget_min' => 55000000,
                        'budget_max' => 100000000,
                    ],
                ],
            ],
        ];
    }

    /**
     * Eight construction companies, each in a distinct build discipline.
     */
    private function contractors(): array
    {
        return [
            [
                'company' => 'Chenab Builders (Pvt) Ltd',
                'contact_name' => 'Shahid Mahmood',
                'email' => 'shahid@chenabbuilders.pk',
                'phone' => '+92 300 8812004',
                'city' => 'Lahore',
                'registration' => 'PEC/C-A-1188',
                'address' => '44-B Main Boulevard, Gulberg III, Lahore',
                'years' => 22,
                'specialization' => 'High-Rise Reinforced Concrete',
                'work_types' => ['High-Rise', 'Structural', 'Commercial'],
                'bio' => 'Structural contractor for high-rise reinforced concrete frames. Capability in raft and pile foundations, slipform and jumpform core construction, post-tensioned slabs, tower crane logistics on constrained sites and concrete pumping to height.',
                'portfolio_statement' => 'Twenty-two years of concrete frames and cores on tight urban sites.',
                'projects' => [
                    [
                        'ref' => 'CON-1001',
                        'title' => 'Twenty-Two Storey Tower Core and Frame, Lahore',
                        'description' => 'Complete structural package for a twenty-two storey commercial tower: bored pile foundations through soft strata, a jumpform central core rising ahead of the floor plates, and post-tensioned flat slabs to keep floor-to-floor height down. Concrete was pumped to full height on a site with a single access road and no lay-down area, sequenced around a night-time delivery window.',
                        'type' => 'commercial',
                        'location' => 'Gulberg, Lahore',
                        'area' => 290000,
                        'completed' => '2023-11-20',
                        'value' => 780000000,
                        'duration' => 640,
                        'feedback' => 'Structure topped out three weeks ahead of programme despite a restricted city-centre site.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1002',
                        'title' => 'Raft Foundation and Basement, Corporate Block',
                        'description' => 'Three-level basement with secant pile retaining wall and a two metre thick raft, executed with dewatering under a high water table. Continuous concrete pours were planned to avoid cold joints in the raft.',
                        'type' => 'commercial',
                        'location' => 'Johar Town, Lahore',
                        'area' => 120000,
                        'completed' => '2022-04-15',
                        'value' => 310000000,
                        'duration' => 300,
                        'feedback' => 'Dewatering and sequencing handled without a single stoppage.',
                    ],
                ],
            ],
            [
                'company' => 'Karakoram Infrastructure Co.',
                'contact_name' => 'Wajid Ali Khan',
                'email' => 'wajid@karakoraminfra.pk',
                'phone' => '+92 355 6690117',
                'city' => 'Gilgit',
                'registration' => 'PEC/C-A-2204',
                'address' => 'Konodas, Jutial, Gilgit',
                'years' => 18,
                'specialization' => 'Roads, Bridges and Infrastructure',
                'work_types' => ['Infrastructure', 'Roads', 'Bridges'],
                'bio' => 'Civil infrastructure contractor working in high-altitude and mountainous terrain. Experience in rock cutting and controlled blasting, gabion and reinforced earth slope stabilisation, cable-stayed and girder bridge erection, culvert and drainage works, and access road construction on unstable ground.',
                'portfolio_statement' => 'Roads, bridges and slope works across Gilgit-Baltistan\'s hardest terrain.',
                'projects' => [
                    [
                        'ref' => 'CON-1003',
                        'title' => 'Mountain Access Road and Slope Stabilisation',
                        'description' => 'Eleven kilometres of mountain access road including controlled rock blasting, gabion retaining structures and reinforced earth embankments through a persistent landslide zone. Cross-drainage culverts were sized for glacial melt surge, and the alignment was set to minimise cut volume on the most unstable sections.',
                        'type' => 'infrastructure',
                        'location' => 'Ghizer District, Gilgit-Baltistan',
                        'area' => 0,
                        'completed' => '2023-09-05',
                        'value' => 420000000,
                        'duration' => 520,
                        'feedback' => 'Road held through two seasons of melt without slope failure.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1004',
                        'title' => 'Steel Girder Bridge over Gilgit River',
                        'description' => 'A one hundred and twenty metre steel girder bridge with reinforced concrete abutments, erected by incremental launching to avoid falsework in a fast-flowing river channel.',
                        'type' => 'infrastructure',
                        'location' => 'Gilgit',
                        'area' => 0,
                        'completed' => '2021-07-22',
                        'value' => 265000000,
                        'duration' => 400,
                        'feedback' => 'Launch executed without disrupting river traffic or seasonal flow.',
                    ],
                ],
            ],
            [
                'company' => 'Indus Steel Structures',
                'contact_name' => 'Faisal Habib',
                'email' => 'faisal@industeel.pk',
                'phone' => '+92 321 4478206',
                'city' => 'Karachi',
                'registration' => 'PEC/C-B-3390',
                'address' => 'Plot 210, Korangi Industrial Area, Karachi',
                'years' => 15,
                'specialization' => 'Pre-Engineered Steel Buildings',
                'work_types' => ['Industrial', 'Steel', 'Warehouse'],
                'bio' => 'Fabricator and erector of pre-engineered steel buildings. Delivers long-span portal frames, mezzanine structures, crane gantry systems, insulated sandwich panel cladding and roofing, and fast-track industrial sheds from in-house fabrication.',
                'portfolio_statement' => 'Long-span steel sheds and industrial envelopes, fabricated in house and erected fast.',
                'projects' => [
                    [
                        'ref' => 'CON-1005',
                        'title' => 'Long-Span Distribution Warehouse, Port Qasim',
                        'description' => 'A forty metre clear span pre-engineered steel warehouse with insulated sandwich panel roofing and walls, a ten tonne overhead crane gantry, and twelve dock levellers. Fabricated off site and erected in fourteen weeks to meet a fixed lease commencement date.',
                        'type' => 'industrial',
                        'location' => 'Port Qasim, Karachi',
                        'area' => 180000,
                        'completed' => '2024-02-10',
                        'value' => 340000000,
                        'duration' => 210,
                        'feedback' => 'Handed over ahead of the lease date; span and crane capacity exactly as specified.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1006',
                        'title' => 'Steel Mezzanine and Crane Gantry Retrofit',
                        'description' => 'Insertion of a structural steel mezzanine and a new crane gantry into a live operating factory, sequenced in weekend shutdowns so production never stopped.',
                        'type' => 'industrial',
                        'location' => 'Landhi, Karachi',
                        'area' => 45000,
                        'completed' => '2022-08-30',
                        'value' => 95000000,
                        'duration' => 150,
                        'feedback' => 'Zero production downtime across the whole retrofit.',
                    ],
                ],
            ],
            [
                'company' => 'Sarhad Construction & Developers',
                'contact_name' => 'Noman Afridi',
                'email' => 'noman@sarhaddev.pk',
                'phone' => '+92 345 2218890',
                'city' => 'Peshawar',
                'registration' => 'PEC/C-B-2761',
                'address' => 'Phase 3 Chowk, Hayatabad, Peshawar',
                'years' => 16,
                'specialization' => 'Residential Housing Schemes',
                'work_types' => ['Residential', 'Housing Scheme', 'Turnkey'],
                'bio' => 'Developer and contractor delivering residential housing schemes end to end: land development and plot servicing, sewerage and water reticulation, boundary and street infrastructure, and repeated turnkey house construction at scheme scale.',
                'portfolio_statement' => 'Housing schemes delivered from raw land through to handed-over homes.',
                'projects' => [
                    [
                        'ref' => 'CON-1007',
                        'title' => 'Eighty-Unit Housing Scheme, Hayatabad',
                        'description' => 'Turnkey delivery of eighty homes including full land development, underground sewerage and water reticulation, street lighting, boundary walls and internal roads, followed by repeated construction of four standardised house types to handover standard.',
                        'type' => 'residential',
                        'location' => 'Hayatabad, Peshawar',
                        'area' => 310000,
                        'completed' => '2023-06-18',
                        'value' => 560000000,
                        'duration' => 700,
                        'feedback' => 'All eighty units handed over within a single season.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1008',
                        'title' => 'Gated Community Infrastructure, Nowshera',
                        'description' => 'Land development and services for a gated community: internal road network, storm drainage, water supply, electrical reticulation and a community centre shell.',
                        'type' => 'residential',
                        'location' => 'Nowshera, Khyber Pakhtunkhwa',
                        'area' => 420000,
                        'completed' => '2021-12-02',
                        'value' => 290000000,
                        'duration' => 540,
                        'feedback' => 'Services laid to spec and ahead of plot handover dates.',
                    ],
                ],
            ],
            [
                'company' => 'Meezan Interiors & Finishes',
                'contact_name' => 'Zeeshan Abbasi',
                'email' => 'zeeshan@meezaninteriors.pk',
                'phone' => '+92 333 6640028',
                'city' => 'Islamabad',
                'registration' => 'PEC/C-C-4417',
                'address' => 'Office 7, Blue Area, Islamabad',
                'years' => 11,
                'specialization' => 'Interior Fit-Out and Finishes',
                'work_types' => ['Fit-Out', 'Interior', 'Joinery'],
                'bio' => 'Fit-out contractor for office, retail and residential interiors. Delivers bespoke joinery and millwork, gypsum and cove ceiling systems, imported marble and stone cladding, wooden and epoxy flooring, decorative lighting installation and final finishes to snag-free handover.',
                'portfolio_statement' => 'Fit-out and finishing work where the last five percent is the whole job.',
                'projects' => [
                    [
                        'ref' => 'CON-1009',
                        'title' => 'Corporate Head Office Fit-Out, Blue Area',
                        'description' => 'Full interior fit-out of four floors of corporate office: bespoke reception joinery in walnut and brass, gypsum cove ceilings with integrated linear lighting, glass partition systems, marble cladding to lift lobbies and engineered wood flooring throughout, delivered to a snag-free handover.',
                        'type' => 'commercial',
                        'location' => 'Blue Area, Islamabad',
                        'area' => 38000,
                        'completed' => '2024-01-25',
                        'value' => 145000000,
                        'duration' => 190,
                        'feedback' => 'Finish quality held consistent across all four floors.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1010',
                        'title' => 'Retail Flagship Interior, Centaurus',
                        'description' => 'Retail flagship fit-out with custom display millwork, feature stone cladding, epoxy terrazzo flooring and a fully integrated decorative lighting scheme, built out in night shifts around mall trading hours.',
                        'type' => 'commercial',
                        'location' => 'Centaurus Mall, Islamabad',
                        'area' => 9000,
                        'completed' => '2022-10-08',
                        'value' => 48000000,
                        'duration' => 95,
                        'feedback' => 'Completed entirely in night shifts with no impact on mall trading.',
                    ],
                ],
            ],
            [
                'company' => 'Gadoon Industrial Contractors',
                'contact_name' => 'Tahir Yousafzai',
                'email' => 'tahir@gadoonindustrial.pk',
                'phone' => '+92 312 7790463',
                'city' => 'Swabi',
                'registration' => 'PEC/C-A-1955',
                'address' => 'Gadoon Amazai Industrial Estate, Swabi',
                'years' => 20,
                'specialization' => 'Plant and Factory Construction',
                'work_types' => ['Industrial', 'Plant', 'Mechanical'],
                'bio' => 'Industrial contractor for process plant and factory construction. Handles heavy machine foundations, plant civil works, pipe racks and structural platforms, mechanical erection and alignment, boiler and utility housing, and commissioning support alongside process engineers.',
                'portfolio_statement' => 'Process plant civils and mechanical erection for manufacturers across KP and Punjab.',
                'projects' => [
                    [
                        'ref' => 'CON-1011',
                        'title' => 'Sugar Mill Plant Civils and Erection',
                        'description' => 'Plant civil works and mechanical erection for a sugar mill expansion: heavy vibration-isolated machine foundations, structural steel pipe racks and access platforms, boiler house, and alignment of mill tandem equipment, carried out to a commissioning deadline fixed by the crushing season.',
                        'type' => 'industrial',
                        'location' => 'Mardan, Khyber Pakhtunkhwa',
                        'area' => 165000,
                        'completed' => '2023-10-12',
                        'value' => 610000000,
                        'duration' => 480,
                        'feedback' => 'Commissioned in time for the crushing season with alignment within tolerance.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1012',
                        'title' => 'Cement Plant Utility Block and Pipe Racks',
                        'description' => 'Utility block, compressor house and an extensive structural pipe rack network for a cement plant, executed inside a live operating facility under strict permit-to-work control.',
                        'type' => 'industrial',
                        'location' => 'Hattar, Haripur',
                        'area' => 72000,
                        'completed' => '2021-05-30',
                        'value' => 230000000,
                        'duration' => 360,
                        'feedback' => 'Worked inside a live plant with a clean safety record.',
                    ],
                ],
            ],
            [
                'company' => 'Murree Hills Builders',
                'contact_name' => 'Adnan Satti',
                'email' => 'adnan@murreehills.pk',
                'phone' => '+92 302 5583319',
                'city' => 'Murree',
                'registration' => 'PEC/C-C-5028',
                'address' => 'Jhika Gali, Murree',
                'years' => 13,
                'specialization' => 'Hillside and Slope Construction',
                'work_types' => ['Residential', 'Hillside', 'Retaining Structures'],
                'bio' => 'Contractor specialising in building on steep terrain. Work covers stepped and terraced foundations, retaining wall and shoring systems, slope drainage to prevent saturation failure, stone masonry in local material, snow loading roof structures and construction access on sites unreachable by heavy plant.',
                'portfolio_statement' => 'Cottages, lodges and retaining structures on slopes other contractors turn down.',
                'projects' => [
                    [
                        'ref' => 'CON-1013',
                        'title' => 'Terraced Hillside Cottages, Nathia Gali',
                        'description' => 'Six stepped cottages on a thirty-five degree slope, built on terraced strip foundations with stone-faced retaining walls between levels. Subsurface drainage was installed behind every retaining structure to stop monsoon saturation, and roofs were framed for heavy snow load. All material was moved to the plots by winch and manual haulage where no plant access existed.',
                        'type' => 'residential',
                        'location' => 'Nathia Gali, Abbottabad',
                        'area' => 22000,
                        'completed' => '2023-05-14',
                        'value' => 185000000,
                        'duration' => 430,
                        'feedback' => 'No slope movement or water ingress through two monsoon seasons.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1014',
                        'title' => 'Retaining Wall and Slope Remediation, Murree',
                        'description' => 'Emergency remediation of a failing slope below an existing hotel: soil nailing, a new reinforced concrete retaining structure and a full redesign of surface and subsurface drainage.',
                        'type' => 'infrastructure',
                        'location' => 'Mall Road, Murree',
                        'area' => 0,
                        'completed' => '2022-03-19',
                        'value' => 78000000,
                        'duration' => 180,
                        'feedback' => 'Slope stabilised ahead of the season with the hotel staying open.',
                    ],
                ],
            ],
            [
                'company' => 'Al-Barkat Renovation Works',
                'contact_name' => 'Rizwan Cheema',
                'email' => 'rizwan@albarkatworks.pk',
                'phone' => '+92 308 9942175',
                'city' => 'Multan',
                'registration' => 'PEC/C-C-6140',
                'address' => 'Gulgasht Colony, Multan',
                'years' => 12,
                'specialization' => 'Renovation and Restoration',
                'work_types' => ['Renovation', 'Restoration', 'Heritage'],
                'bio' => 'Renovation contractor working on existing and historic buildings. Skilled in traditional lime mortar and plaster work, structural repair and underpinning of old masonry, damp proofing and rising damp treatment, terracotta and glazed tile restoration, and phased refurbishment of occupied buildings.',
                'portfolio_statement' => 'Careful repair and refurbishment work on buildings that are still standing and still in use.',
                'projects' => [
                    [
                        'ref' => 'CON-1015',
                        'title' => 'Heritage Shrine Facade Restoration, Multan',
                        'description' => 'Restoration of a historic shrine facade: replacement of failed cement pointing with traditional lime mortar, consolidation of spalled brickwork, conservation and matched replacement of blue glazed terracotta tilework, and treatment of long-standing rising damp at the plinth.',
                        'type' => 'renovation',
                        'location' => 'Multan',
                        'area' => 14000,
                        'completed' => '2023-08-27',
                        'value' => 88000000,
                        'duration' => 320,
                        'feedback' => 'Tile matching was close enough that the repair is hard to locate.',
                        'featured' => true,
                    ],
                    [
                        'ref' => 'CON-1016',
                        'title' => 'Occupied Office Refurbishment, Bosan Road',
                        'description' => 'Phased refurbishment of a four-storey office that stayed fully occupied: structural repair to cracked beams, underpinning of a settled corner, full re-servicing and new finishes, executed a floor at a time with staff decanted between levels.',
                        'type' => 'renovation',
                        'location' => 'Bosan Road, Multan',
                        'area' => 26000,
                        'completed' => '2021-11-11',
                        'value' => 64000000,
                        'duration' => 280,
                        'feedback' => 'Building stayed in use throughout with minimal disruption.',
                    ],
                ],
            ],
        ];
    }
}

/**
 * Authoritative City of Houston Historic, Heritage & National Register Districts
 * Sourced directly from City of Houston Planning & Development Department
 */

export interface HistoricDistrictItem {
  id: string;
  name: string;
  full_name: string;
  dist_num: number;
  designated_year: number;
  designation_type: 'City Historic District' | 'City Heritage District' | 'National Register Historic District';
  arch_styles: string[];
  description: string;
  bounds: [number, number, number, number];
  centroid: [number, number];
}

export const HISTORIC_DISTRICTS: HistoricDistrictItem[] = [
  {
    "id": "courtland-place",
    "name": "Courtland Place",
    "full_name": "Courtland Place Historic District",
    "dist_num": 1,
    "designated_year": 1996,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Neo-Classical",
      "Italian Renaissance",
      "Tudor Revival",
      "Colonial Revival"
    ],
    "description": "Houston's premier grand residential boulevard enclave, planned in 1906 by S.E. Gideon with monumental brick entrance gates, majestic palm trees, and landmark estates designed by Birdsall Briscoe and John Staub.",
    "bounds": [
      -95.38589206936928,
      29.742847927620534,
      -95.3818098640354,
      29.744274456995218
    ],
    "centroid": [
      -95.38388579331149,
      29.74356429971667
    ]
  },
  {
    "id": "main-street-market-square",
    "name": "Main Street / Market Square",
    "full_name": "Main Street/Market Square Historic District",
    "dist_num": 2,
    "designated_year": 1997,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Victorian Commercial",
      "Italianate",
      "Commercial Classical",
      "Art Deco"
    ],
    "description": "The historic civic and commercial heart of 19th-century Houston surrounding the original 1836 town square, featuring Texas's finest collection of Victorian commercial brick storefronts and early financial institutions.",
    "bounds": [
      -95.36323612563692,
      29.75996314169153,
      -95.35847302770593,
      29.766463239976872
    ],
    "centroid": [
      -95.36082594448403,
      29.7630505845658
    ]
  },
  {
    "id": "west-eleventh-place",
    "name": "West Eleventh Place",
    "full_name": "West Eleventh Place Historic District",
    "dist_num": 3,
    "designated_year": 1997,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Craftsman",
      "Eclectic Revival",
      "Tudor Revival"
    ],
    "description": "A secluded residential cul-de-sac enclave designed in 1920 by noted architect Maurice J. Sullivan, featuring distinctive English cottage and Craftsman residences set along private brick gardens.",
    "bounds": [
      -95.39274892624111,
      29.724924570104864,
      -95.39191441128384,
      29.726067112148282
    ],
    "centroid": [
      -95.39235953917729,
      29.725558755452784
    ]
  },
  {
    "id": "westmoreland",
    "name": "Westmoreland",
    "full_name": "Westmoreland Historic District",
    "dist_num": 4,
    "designated_year": 1997,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Queen Anne",
      "Craftsman",
      "Colonial Revival",
      "Prairie"
    ],
    "description": "Planned in 1902 as Houston's first elite master-planned streetcar suburb south of downtown, characterized by wide esplanades, stone carriage blocks, and ornate transitional Victorian and Craftsman homes.",
    "bounds": [
      -95.38598147323601,
      29.73927611724507,
      -95.38201040613168,
      29.742926480231645
    ],
    "centroid": [
      -95.38403643844477,
      29.741106240602196
    ]
  },
  {
    "id": "old-sixth-ward",
    "name": "Old Sixth Ward",
    "full_name": "Old Sixth Ward Historic District",
    "dist_num": 5,
    "designated_year": 1998,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Victorian Cottage",
      "Queen Anne",
      "Folk Victorian",
      "Greek Revival"
    ],
    "description": "Houston's oldest intact residential neighborhood, settled in the 1850s by German and rail worker families, preserving the greatest concentration of 19th-century Victorian cottages and gingerbread trim in the southern United States.",
    "bounds": [
      -95.38261324809926,
      29.76434872718744,
      -95.37474238660027,
      29.7677618767873
    ],
    "centroid": [
      -95.37859337375124,
      29.766140042430955
    ]
  },
  {
    "id": "avondale-east",
    "name": "Avondale East",
    "full_name": "Avondale East Historic District",
    "dist_num": 6,
    "designated_year": 1999,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Prairie School",
      "Craftsman",
      "American Foursquare",
      "Colonial Revival"
    ],
    "description": "An early 20th-century residential streetcar subdivision in Montrose developed between 1907 and 1925, distinguished by grand American Foursquare residences, Craftsman woodwork, and wide front verandas.",
    "bounds": [
      -95.38380039126393,
      29.745067867577283,
      -95.381616120147,
      29.74687544486365
    ],
    "centroid": [
      -95.38260456166856,
      29.746073893918993
    ]
  },
  {
    "id": "norhill",
    "name": "Norhill",
    "full_name": "Norhill Historic District",
    "dist_num": 7,
    "designated_year": 2000,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Craftsman Bungalow",
      "Spanish Colonial Revival",
      "Tudor Revival"
    ],
    "description": "A beloved master-planned 1920s neighborhood developed by Will Hogg's Varner Realty Co., celebrated for its dense rows of intact Craftsman bungalows with exposed rafter tails, bracketed eaves, and Proctor Plaza Park.",
    "bounds": [
      -95.38794169004989,
      29.790928031481663,
      -95.37884667220776,
      29.803442672383344
    ],
    "centroid": [
      -95.38455859446823,
      29.795167911539874
    ]
  },
  {
    "id": "broadacres",
    "name": "Broadacres",
    "full_name": "Broadacres Historic District",
    "dist_num": 8,
    "designated_year": 2007,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Georgian Revival",
      "Spanish Colonial Revival",
      "Tudor Revival",
      "Italian Renaissance"
    ],
    "description": "A landmark planned park-like residential community developed in the 1920s by Capt. James A. Baker and prominent Houston leaders, designed by architect William Ward Watkin with wide oak-lined boulevards and monumental estates.",
    "bounds": [
      -95.39901752140018,
      29.725803601309398,
      -95.39466570455062,
      29.728790268917408
    ],
    "centroid": [
      -95.39685300118951,
      29.72731217300184
    ]
  },
  {
    "id": "avondale-west",
    "name": "Avondale West",
    "full_name": "Avondale West Historic District",
    "dist_num": 9,
    "designated_year": 2007,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Craftsman",
      "Prairie",
      "Colonial Revival",
      "Bungalow"
    ],
    "description": "The western continuation of Montrose's historic Avondale subdivision along Lovett and Stratford streets, featuring well-preserved Craftsman bungalows and two-story brick and timber residences.",
    "bounds": [
      -95.38961231410634,
      29.74492720809263,
      -95.38552646907053,
      29.74682366853827
    ],
    "centroid": [
      -95.38757058520501,
      29.745820640859375
    ]
  },
  {
    "id": "houston-heights-west",
    "name": "Houston Heights West",
    "full_name": "Houston Heights West Historic District",
    "dist_num": 10,
    "designated_year": 2007,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Queen Anne",
      "Folk Victorian",
      "Craftsman Bungalow",
      "Colonial Revival"
    ],
    "description": "The western sector of Houston's premier 1891 streetcar suburb, developed by the Omaha and South Texas Land Company, showcasing picturesque Victorian turrets, wraparound porches, and Craftsman streetscapes.",
    "bounds": [
      -95.40408284677271,
      29.790766300359902,
      -95.39911866663682,
      29.80036307977492
    ],
    "centroid": [
      -95.40172973647161,
      29.79565837109226
    ]
  },
  {
    "id": "houston-heights-east",
    "name": "Houston Heights East",
    "full_name": "Houston Heights East Historic District",
    "dist_num": 11,
    "designated_year": 2008,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Victorian",
      "Queen Anne",
      "Craftsman",
      "Folk Victorian"
    ],
    "description": "The eastern residential sector of the Heights along Harvard and Cortlandt streets, lined with magnificent turn-of-the-century Victorian residences, shady oak trees, and historic neighborhood churches.",
    "bounds": [
      -95.39905525630763,
      29.790777864768046,
      -95.39211463181714,
      29.80397473509476
    ],
    "centroid": [
      -95.39550839919376,
      29.797340176851314
    ]
  },
  {
    "id": "freeland",
    "name": "Freeland",
    "full_name": "Freeland Historic District",
    "dist_num": 12,
    "designated_year": 2008,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Craftsman Bungalow",
      "Folk Victorian"
    ],
    "description": "A charming and compact residential enclave in Near Northside platted in the 1920s, consisting of intact modest Craftsman bungalows built for middle-class rail and industrial workers.",
    "bounds": [
      -95.39109832002205,
      29.780174155095256,
      -95.38882110086863,
      29.781489317351028
    ],
    "centroid": [
      -95.39014038964737,
      29.78083796377258
    ]
  },
  {
    "id": "shadow-lawn",
    "name": "Shadow Lawn",
    "full_name": "Shadow Lawn Historic District",
    "dist_num": 13,
    "designated_year": 2008,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Tudor Revival",
      "French Eclectic",
      "Colonial Revival",
      "Neoclassical"
    ],
    "description": "A prestigious cul-de-sac enclave bordering Rice University and Hermann Park, platted in 1923 by Homer D. Torrey, featuring architect-designed revival manors and stately live oaks.",
    "bounds": [
      -95.39558138604501,
      29.723790654225894,
      -95.39372323408222,
      29.726052163163736
    ],
    "centroid": [
      -95.39468776389619,
      29.724989239122646
    ]
  },
  {
    "id": "audubon-place",
    "name": "Audubon Place",
    "full_name": "Audubon Place Historic District",
    "dist_num": 14,
    "designated_year": 2009,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Craftsman",
      "Prairie",
      "Tudor Revival",
      "Mission / Spanish Revival"
    ],
    "description": "An elegant Montrose subdivision platted in 1910 along Audubon, Kipling, and Marshall streets, famous for its wide palm- and oak-lined streets and impressive collection of Craftsman and Prairie-style residences.",
    "bounds": [
      -95.39105753265397,
      29.738863345563814,
      -95.38598896375554,
      29.742833369917236
    ],
    "centroid": [
      -95.38813338826256,
      29.74077463508877
    ]
  },
  {
    "id": "boulevard-oaks",
    "name": "Boulevard Oaks",
    "full_name": "Boulevard Oaks Historic District",
    "dist_num": 15,
    "designated_year": 2009,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Georgian Revival",
      "Tudor Revival",
      "French Eclectic",
      "Spanish Colonial Revival"
    ],
    "description": "World-renowned for its cathedral live oak canopy along North and South Boulevards, planned in the 1920s by landscape architect William L. Phillips with extraordinary period revival residences.",
    "bounds": [
      -95.40686119779113,
      29.725779729215514,
      -95.39899367977982,
      29.728808318186612
    ],
    "centroid": [
      -95.4028068571072,
      29.72721498069121
    ]
  },
  {
    "id": "first-montrose-commons",
    "name": "First Montrose Commons",
    "full_name": "First Montrose Commons Historic District",
    "dist_num": 16,
    "designated_year": 2010,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Queen Anne",
      "Craftsman",
      "Folk Victorian",
      "Prairie"
    ],
    "description": "A diverse historic neighborhood in southern Montrose between West Alabama and Richmond, featuring a rich variety of early 1900s Victorian cottages, American Foursquares, and Craftsman duplexes.",
    "bounds": [
      -95.39028634706392,
      29.734819718634075,
      -95.38298782921336,
      29.73877257392466
    ],
    "centroid": [
      -95.38688219203574,
      29.736823855418873
    ]
  },
  {
    "id": "houston-heights-south",
    "name": "Houston Heights South",
    "full_name": "Houston Heights South Historic District",
    "dist_num": 17,
    "designated_year": 2011,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Victorian",
      "Queen Anne",
      "Craftsman Bungalow",
      "Folk Victorian"
    ],
    "description": "The southern gateway to the Heights bounded by 11th Street and I-10, encompassing the Heights Boulevard historic esplanade, Victorian mansions, and early commercial storefronts.",
    "bounds": [
      -95.3983934641509,
      29.77699267744412,
      -95.39189883067213,
      29.79068437358919
    ],
    "centroid": [
      -95.39523089538412,
      29.78405556791528
    ]
  },
  {
    "id": "woodland-heights",
    "name": "Woodland Heights",
    "full_name": "Woodland Heights Historic District",
    "dist_num": 18,
    "designated_year": 2011,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Craftsman Bungalow",
      "Queen Anne",
      "Colonial Revival",
      "Folk Victorian"
    ],
    "description": "Developed in 1907 by William A. Wilson along the Houston Electric Company streetcar line, featuring rolling topography, proximity to Stude and White Oak Parks, and pristine Craftsman bungalows.",
    "bounds": [
      -95.38198811994756,
      29.78302816431471,
      -95.372620262183,
      29.78863958549611
    ],
    "centroid": [
      -95.37708006927582,
      29.786399524905878
    ]
  },
  {
    "id": "glenbrook-valley",
    "name": "Glenbrook Valley",
    "full_name": "Glenbrook Valley Historic District",
    "dist_num": 19,
    "designated_year": 2011,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Mid-Century Modern",
      "Contemporary",
      "American Ranch",
      "Neo-Colonial Ranch"
    ],
    "description": "The largest designated mid-century modern historic district in the state of Texas and one of the largest in the nation, developed between 1953 and 1962 with stunning custom Atomic Era and Mid-Century Modern ranch estates.",
    "bounds": [
      -95.28692078565801,
      29.659275549418698,
      -95.27126267802709,
      29.679491431377794
    ],
    "centroid": [
      -95.2784070820606,
      29.670224608391756
    ]
  },
  {
    "id": "germantown",
    "name": "Germantown",
    "full_name": "Germantown Historic District",
    "dist_num": 20,
    "designated_year": 2012,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Folk Victorian",
      "Craftsman Bungalow",
      "Queen Anne Cottage"
    ],
    "description": "Platted in 1894 along Little White Oak Bayou by German immigrant families, retaining modest late 19th-century frame cottages, brick streets, and deep vernacular community ties.",
    "bounds": [
      -95.37262228625603,
      29.7813334783601,
      -95.3688965747258,
      29.787166317879596
    ],
    "centroid": [
      -95.3708342151112,
      29.78350814241959
    ]
  },
  {
    "id": "starkweather",
    "name": "Starkweather",
    "full_name": "Starkweather Historic District",
    "dist_num": 21,
    "designated_year": 2014,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Folk Victorian",
      "Craftsman",
      "Vernacular Cottage"
    ],
    "description": "A historic residential enclave in Independence Heights, established during the Jim Crow era as Texas's first incorporated Black municipality, preserving vernacular frame cottages and shotgun structures.",
    "bounds": [
      -95.3990696135179,
      29.814759398483062,
      -95.39658795882482,
      29.81547844694369
    ],
    "centroid": [
      -95.39772472863453,
      29.815156445760522
    ]
  },
  {
    "id": "high-first-ward",
    "name": "High First Ward",
    "full_name": "High First Ward Historic District",
    "dist_num": 22,
    "designated_year": 2014,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Victorian Cottage",
      "Queen Anne",
      "Folk Victorian",
      "Bungalow"
    ],
    "description": "A historic working-class neighborhood northwest of downtown near the Southern Pacific rail yards, retaining early Victorian cottages, corner grocery structures, and immigrant artisan homes.",
    "bounds": [
      -95.3788852414365,
      29.772586430508102,
      -95.37418425278645,
      29.77507583561323
    ],
    "centroid": [
      -95.37640998561086,
      29.773792249888135
    ]
  },
  {
    "id": "brunner-harmonium",
    "name": "Brunner-Harmonium",
    "full_name": "Brunner-Harmonium Historic District",
    "dist_num": 23,
    "designated_year": 2022,
    "designation_type": "City Historic District",
    "arch_styles": [
      "Folk Victorian",
      "Queen Anne Cottage",
      "Craftsman Bungalow"
    ],
    "description": "Houston's newest historic district, located in the historic West End/Washington Avenue corridor, preserving vernacular 1890s-1920s railroad worker homes and historic church structures.",
    "bounds": [
      -95.40822820431576,
      29.767204049830163,
      -95.4069652500292,
      29.768225126360687
    ],
    "centroid": [
      -95.40772885998362,
      29.767651909863563
    ]
  },
  {
    "id": "freedmens-town-heritage",
    "name": "Freedmen's Town",
    "full_name": "Freedmen's Town Heritage District",
    "dist_num": 1,
    "designated_year": 2021,
    "designation_type": "City Heritage District",
    "arch_styles": [
      "Shotgun House",
      "Creole Cottage",
      "Victorian Vernacular",
      "Craftsman"
    ],
    "description": "Settled in 1865 by formerly enslaved people upon Juneteenth emancipation, Freedmen's Town served as the cultural, educational, and commercial center of Black Houston, featuring hand-laid brick streets, historic churches, and shotgun cottages.",
    "bounds": [
      -95.38578769849732,
      29.750437682135686,
      -95.37070835301533,
      29.76111023668686
    ],
    "centroid": [
      -95.37939654091065,
      29.755955126063412
    ]
  },
  {
    "id": "idylwood-nr",
    "name": "Idylwood (NRHP)",
    "full_name": "Idylwood National Register Historic District",
    "dist_num": 0,
    "designated_year": 2000,
    "designation_type": "National Register Historic District",
    "arch_styles": [
      "Tudor Revival",
      "Craftsman Bungalow",
      "Colonial Revival"
    ],
    "description": "A picturesque 1920s-1930s residential subdivision in Houston's East End bordering Brays Bayou, noted for its hilly topography, winding streets, and dense Tudor Revival masonry bungalows.",
    "bounds": [
      -95.31351507314083,
      29.715532389293895,
      -95.30586580931856,
      29.724570868542106
    ],
    "centroid": [
      -95.30998157111868,
      29.72050060849638
    ]
  },
  {
    "id": "independence-heights-nr",
    "name": "Independence Heights (NRHP)",
    "full_name": "Independence Heights National Register Historic District",
    "dist_num": 0,
    "designated_year": 1997,
    "designation_type": "National Register Historic District",
    "arch_styles": [
      "Vernacular Frame",
      "Shotgun",
      "Bungalow",
      "Folk Victorian"
    ],
    "description": "The first incorporated African American municipality in Texas (incorporated 1915), documenting the resilience, civic independence, and architectural history of early 20th-century Black Texans.",
    "bounds": [
      -95.39938439911268,
      29.8134576340417,
      -95.393632929075,
      29.817173765463753
    ],
    "centroid": [
      -95.39639059320707,
      29.815614460443935
    ]
  },
  {
    "id": "near-northside-nr",
    "name": "Near Northside (NRHP)",
    "full_name": "Near Northside National Register Historic District",
    "dist_num": 0,
    "designated_year": 2021,
    "designation_type": "National Register Historic District",
    "arch_styles": [
      "Queen Anne",
      "Folk Victorian",
      "Bungalow",
      "Commercial"
    ],
    "description": "A historic rail and industrial community north of Buffalo Bayou with deep working-class roots, European immigrant settlement, and later Mexican-American cultural heritage.",
    "bounds": [
      -95.36806787389243,
      29.774952958538094,
      -95.3626285165926,
      29.78381526090966
    ],
    "centroid": [
      -95.3655888982102,
      29.779380011974727
    ]
  }
];

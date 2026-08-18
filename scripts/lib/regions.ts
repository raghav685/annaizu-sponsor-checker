// Maps a sponsor's raw Town/City + County text to one of the 12 UK ITL1-equivalent
// regions: England's 9 regions, Scotland, Wales, Northern Ireland.
// The register's location fields are free text (typos, abbreviations, inconsistent
// casing), so this is a best-effort curated lookup, not an authoritative gazetteer.
// Anything unresolved is reported as "Unknown" by the caller.

export type Region =
  | "London"
  | "South East"
  | "South West"
  | "East of England"
  | "East Midlands"
  | "West Midlands"
  | "North West"
  | "North East"
  | "Yorkshire and The Humber"
  | "Scotland"
  | "Wales"
  | "Northern Ireland"
  | "Unknown";

export const ALL_REGIONS: Region[] = [
  "London",
  "South East",
  "South West",
  "East of England",
  "East Midlands",
  "West Midlands",
  "North West",
  "North East",
  "Yorkshire and The Humber",
  "Scotland",
  "Wales",
  "Northern Ireland",
];

function normalise(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/["'.]/g, "")
    .replace(/[^A-Z0-9&\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Historic/ceremonial counties + common abbreviations -> region.
const COUNTY_TO_REGION: Record<string, Region> = {
  // London
  "LONDON": "London",
  "GREATER LONDON": "London",
  "GREATER LON": "London",
  "MIDDLESEX": "London",
  "MIDDX": "London",

  // South East
  "KENT": "South East",
  "SURREY": "South East",
  "BERKSHIRE": "South East",
  "BERKS": "South East",
  "BUCKINGHAMSHIRE": "South East",
  "BUCKS": "South East",
  "OXFORDSHIRE": "South East",
  "OXON": "South East",
  "HAMPSHIRE": "South East",
  "HANTS": "South East",
  "WEST SUSSEX": "South East",
  "EAST SUSSEX": "South East",
  "SUSSEX": "South East",
  "ISLE OF WIGHT": "South East",

  // South West
  "SOMERSET": "South West",
  "DEVON": "South West",
  "DORSET": "South West",
  "CORNWALL": "South West",
  "WILTSHIRE": "South West",
  "WILTS": "South West",
  "GLOUCESTERSHIRE": "South West",
  "GLOS": "South West",
  "AVON": "South West",
  "BRISTOL": "South West",
  "CITY OF BRISTOL": "South West",
  "NORTH SOMERSET": "South West",
  "BATH AND NORTH EAST SOMERSET": "South West",

  // East of England
  "ESSEX": "East of England",
  "SUFFOLK": "East of England",
  "NORFOLK": "East of England",
  "CAMBRIDGESHIRE": "East of England",
  "CAMBS": "East of England",
  "HERTFORDSHIRE": "East of England",
  "HERTS": "East of England",
  "BEDFORDSHIRE": "East of England",
  "BEDS": "East of England",

  // East Midlands
  "DERBYSHIRE": "East Midlands",
  "DERBYS": "East Midlands",
  "LEICESTERSHIRE": "East Midlands",
  "LEICS": "East Midlands",
  "LINCOLNSHIRE": "East Midlands",
  "LINCS": "East Midlands",
  "NOTTINGHAMSHIRE": "East Midlands",
  "NOTTS": "East Midlands",
  "NORTHAMPTONSHIRE": "East Midlands",
  "NORTHANTS": "East Midlands",
  "RUTLAND": "East Midlands",

  // West Midlands
  "WEST MIDLANDS": "West Midlands",
  "WARWICKSHIRE": "West Midlands",
  "WARKS": "West Midlands",
  "STAFFORDSHIRE": "West Midlands",
  "STAFFS": "West Midlands",
  "STAFFORRDSHIRE": "West Midlands",
  "WORCESTERSHIRE": "West Midlands",
  "WORCS": "West Midlands",
  "HEREFORDSHIRE": "West Midlands",
  "SHROPSHIRE": "West Midlands",
  "SHROPS": "West Midlands",
  "WEST GLAMORGAN": "Wales",

  // North West
  "LANCASHIRE": "North West",
  "LANCS": "North West",
  "GREATER MANCHESTER": "North West",
  "MERSEYSIDE": "North West",
  "CHESHIRE": "North West",
  "CUMBRIA": "North West",

  // North East
  "TYNE AND WEAR": "North East",
  "COUNTY DURHAM": "North East",
  "DURHAM": "North East",
  "NORTHUMBERLAND": "North East",
  "CLEVELAND": "North East",

  // Yorkshire and The Humber
  "YORKSHIRE": "Yorkshire and The Humber",
  "YORKS": "Yorkshire and The Humber",
  "WEST YORKSHIRE": "Yorkshire and The Humber",
  "NORTH YORKSHIRE": "Yorkshire and The Humber",
  "SOUTH YORKSHIRE": "Yorkshire and The Humber",
  "EAST YORKSHIRE": "Yorkshire and The Humber",
  "EAST RIDING OF YORKSHIRE": "Yorkshire and The Humber",
  "HUMBERSIDE": "Yorkshire and The Humber",

  // Scotland (nation + counties)
  "SCOTLAND": "Scotland",
  "ABERDEENSHIRE": "Scotland",
  "ANGUS": "Scotland",
  "ARGYLL": "Scotland",
  "AYRSHIRE": "Scotland",
  "NORTH AYRSHIRE": "Scotland",
  "SOUTH AYRSHIRE": "Scotland",
  "EAST AYRSHIRE": "Scotland",
  "BORDERS": "Scotland",
  "CAITHNESS": "Scotland",
  "DUMFRIES AND GALLOWAY": "Scotland",
  "DUMFRIESSHIRE": "Scotland",
  "DUNBARTONSHIRE": "Scotland",
  "EAST LOTHIAN": "Scotland",
  "WEST LOTHIAN": "Scotland",
  "MIDLOTHIAN": "Scotland",
  "FIFE": "Scotland",
  "HIGHLAND": "Scotland",
  "HIGHLANDS": "Scotland",
  "HIGHLANDS AND ISLANDS": "Scotland",
  "INVERNESS-SHIRE": "Scotland",
  "INVERNESSSHIRE": "Scotland",
  "LANARKSHIRE": "Scotland",
  "NORTH LANARKSHIRE": "Scotland",
  "SOUTH LANARKSHIRE": "Scotland",
  "MORAY": "Scotland",
  "PERTHSHIRE": "Scotland",
  "RENFREWSHIRE": "Scotland",
  "STIRLINGSHIRE": "Scotland",
  "STIRLING": "Scotland",

  // Wales (nation + counties)
  "WALES": "Wales",
  "GWENT": "Wales",
  "GWYNEDD": "Wales",
  "DYFED": "Wales",
  "POWYS": "Wales",
  "CLWYD": "Wales",
  "MID GLAMORGAN": "Wales",
  "SOUTH GLAMORGAN": "Wales",
  "DENBIGHSHIRE": "Wales",
  "FLINTSHIRE": "Wales",
  "PEMBROKESHIRE": "Wales",
  "NEATH PORT TALBOT": "Wales",
  "WREXHAM": "Wales",
  "CONWY": "Wales",
  "CEREDIGION": "Wales",
  "MONMOUTHSHIRE": "Wales",
  "CARMARTHENSHIRE": "Wales",
  "BRIDGEND": "Wales",
  "CAERPHILLY": "Wales",
  "TORFAEN": "Wales",
  "BLAENAU GWENT": "Wales",
  "ANGLESEY": "Wales",
  "MERTHYR TYDFIL": "Wales",
  "VALE OF GLAMORGAN": "Wales",

  // Northern Ireland
  "NORTHERN IRELAND": "Northern Ireland",
  "ANTRIM": "Northern Ireland",
  "ARMAGH": "Northern Ireland",
  "DOWN": "Northern Ireland",
  "FERMANAGH": "Northern Ireland",
  "LONDONDERRY": "Northern Ireland",
  "DERRY": "Northern Ireland",
  "TYRONE": "Northern Ireland",
  "CO ANTRIM": "Northern Ireland",
  "CO DOWN": "Northern Ireland",
  "CO TYRONE": "Northern Ireland",
};

// Major towns/cities -> region, used when County is blank (the common case) or
// disagrees with a blanket nation label like "England"/"UK".
const TOWN_TO_REGION: Record<string, Region> = {
  // London boroughs & districts
  LONDON: "London", "CITY OF LONDON": "London", WESTMINSTER: "London",
  CROYDON: "London", EALING: "London", BARNET: "London", LAMBETH: "London",
  SOUTHWARK: "London", GREENWICH: "London", HACKNEY: "London", ISLINGTON: "London",
  CAMDEN: "London", "TOWER HAMLETS": "London", "TOWER HAMLET": "London",
  BRENT: "London", HARROW: "London", HILLINGDON: "London", HOUNSLOW: "London",
  BROMLEY: "London", BEXLEY: "London", REDBRIDGE: "London", NEWHAM: "London",
  BARKING: "London", HAVERING: "London", ENFIELD: "London", HARINGEY: "London",
  MERTON: "London", SUTTON: "London", KINGSTON: "London", WANDSWORTH: "London",
  LEWISHAM: "London", BERMONDSEY: "London", WOOLWICH: "London", ILFORD: "London",
  EDGWARE: "London", WEMBLEY: "London", HOLBORN: "London", FARRINGDON: "London",

  // South East
  OXFORD: "South East", READING: "South East", GUILDFORD: "South East",
  BRIGHTON: "South East", "BRIGHTON AND HOVE": "South East", HOVE: "South East",
  MAIDSTONE: "South East", CANTERBURY: "South East", SLOUGH: "South East",
  "MILTON KEYNES": "South East", "HIGH WYCOMBE": "South East", BASINGSTOKE: "South East",
  PORTSMOUTH: "South East", SOUTHAMPTON: "South East", CRAWLEY: "South East",
  EASTBOURNE: "South East", WOKING: "South East", "TUNBRIDGE WELLS": "South East",
  ASHFORD: "South East", CHATHAM: "South East", DARTFORD: "South East", GRAVESEND: "South East",
  MARGATE: "South East", RAMSGATE: "South East", SHEERNESS: "South East",
  "ST LEONARDS-ON-SEA": "South East", HASTINGS: "South East", WANTAGE: "South East",
  BRACKNELL: "South East", WINDSOR: "South East", WORTHING: "South East",
  AYLESBURY: "South East", BANBURY: "South East", NEWBURY: "South East",
  ALDERSHOT: "South East", FARNBOROUGH: "South East", CAMBERLEY: "South East",
  FAREHAM: "South East", WINCHESTER: "South East", CHICHESTER: "South East",
  HORSHAM: "South East", SEVENOAKS: "South East", ROCHESTER: "South East",
  BICESTER: "South East", ABINGDON: "South East", LEATHERHEAD: "South East",
  EPSOM: "South East", AMERSHAM: "South East", WEYBRIDGE: "South East",
  STAINES: "South East", "STAINES-UPON-THAMES": "South East", EGHAM: "South East",
  MAIDENHEAD: "South East", HENLEY: "South East", ANDOVER: "South East",
  "HEMEL HEMPSTEAD": "East of England",

  // London (outer boroughs referenced by town name rather than borough)
  ROMFORD: "London", SOUTHALL: "London", HAYES: "London", UXBRIDGE: "London",
  DAGENHAM: "London", FELTHAM: "London", TWICKENHAM: "London", STANMORE: "London",
  MITCHAM: "London", "WEST DRAYTON": "London", PINNER: "London", RUISLIP: "London",
  "NEW MALDEN": "London", MORDEN: "London", SURBITON: "London", WALLINGTON: "London",
  NORTHOLT: "London", ORPINGTON: "London", WIMBLEDON: "London", TEDDINGTON: "London",
  WELLING: "London", NORTHWOOD: "London", SIDCUP: "London", CHESSINGTON: "London",
  BECKENHAM: "London", "THORNTON HEATH": "London", ERITH: "London", RAINHAM: "London",
  RICHMOND: "London",

  // South West
  BRISTOL: "South West", PLYMOUTH: "South West", EXETER: "South West",
  BATH: "South West", GLOUCESTER: "South West", SWINDON: "South West",
  TAUNTON: "South West", YEOVIL: "South West", TRURO: "South West",
  WEYMOUTH: "South West", SIDMOUTH: "South West", "ST IVES": "South West",

  // East of England
  CAMBRIDGE: "East of England", NORWICH: "East of England", IPSWICH: "East of England",
  CHELMSFORD: "East of England", COLCHESTER: "East of England", LUTON: "East of England",
  "SOUTHEND-ON-SEA": "East of England", SOUTHEND: "East of England",
  BASILDON: "East of England", "SOUTH OCKENDON": "East of England",
  ELY: "East of England", "BRAINTREE DISTRICT": "East of England", BRAINTREE: "East of England",
  WATFORD: "East of England", "ST ALBANS": "East of England", BOREHAMWOOD: "East of England",
  DUNSTABLE: "East of England", HATFIELD: "East of England", STEVENAGE: "East of England",
  HARLOW: "East of England", GRAYS: "East of England", HERTFORD: "East of England",
  HITCHIN: "East of England", "LEIGHTON BUZZARD": "East of England", NEWMARKET: "East of England",
  HUNTINGDON: "East of England", RICKMANSWORTH: "East of England", LOUGHTON: "East of England",

  // East Midlands
  NOTTINGHAM: "East Midlands", LEICESTER: "East Midlands", DERBY: "East Midlands",
  NORTHAMPTON: "East Midlands", LINCOLN: "East Midlands", RIPLEY: "East Midlands",
  WELLINGBOROUGH: "East Midlands", KETTERING: "East Midlands", MANSFIELD: "East Midlands",
  LOUGHBOROUGH: "East Midlands", CORBY: "East Midlands", PETERBOROUGH: "East of England",

  // West Midlands
  BIRMINGHAM: "West Midlands", COVENTRY: "West Midlands", WOLVERHAMPTON: "West Midlands",
  WALSALL: "West Midlands", TAMWORTH: "West Midlands", BEDWORTH: "West Midlands",
  HEREFORD: "West Midlands", STAFFORD: "West Midlands", DUDLEY: "West Midlands",
  TELFORD: "West Midlands", RUGBY: "West Midlands", SMETHWICK: "West Midlands",
  OLDBURY: "West Midlands", NUNEATON: "West Midlands", REDDITCH: "West Midlands",
  WEDNESBURY: "West Midlands", TIPTON: "West Midlands", STOURBRIDGE: "West Midlands",
  CANNOCK: "West Midlands", WILLENHALL: "West Midlands", "LEAMINGTON SPA": "West Midlands",
  "WEST BROMWICH": "West Midlands", WARWICK: "West Midlands", SHREWSBURY: "West Midlands",
  WORCESTER: "West Midlands",

  // North West
  MANCHESTER: "North West", LIVERPOOL: "North West", PRESTON: "North West",
  WARRINGTON: "North West", MACCLESFIELD: "North West", OLDHAM: "North West",
  "CHEETHAM HILL": "North West", CHEADLE: "North West", CARLISLE: "North West",
  "GREAT YARMOUTH": "East of England",
  BOLTON: "North West", STOCKPORT: "North West", ROCHDALE: "North West",
  BLACKBURN: "North West", SALFORD: "North West", BURY: "North West",
  CHESTER: "North West", WIGAN: "North West", ALTRINCHAM: "North West",
  BURNLEY: "North West", WIRRAL: "North West", BIRKENHEAD: "North West",
  CREWE: "North West", LANCASTER: "North West", ACCRINGTON: "North West",
  SALE: "North West", CHORLEY: "North West", SOUTHPORT: "North West",
  "ST HELENS": "North West", "ASHTON-UNDER-LYNE": "North West", NELSON: "North West",
  BLACKPOOL: "North West",

  // North East
  "NEWCASTLE UPON TYNE": "North East", NEWCASTLE: "North East", SUNDERLAND: "North East",
  "STOCKTON-ON-TEES": "North East", FERRYHILL: "North East",
  MIDDLESBROUGH: "North East", GATESHEAD: "North East", HARTLEPOOL: "North East",
  DARLINGTON: "North East",

  // Yorkshire and The Humber
  LEEDS: "Yorkshire and The Humber", SHEFFIELD: "Yorkshire and The Humber",
  BRADFORD: "Yorkshire and The Humber", HULL: "Yorkshire and The Humber",
  "KINGSTON UPON HULL": "Yorkshire and The Humber", YORK: "Yorkshire and The Humber",
  EASTWOOD: "Yorkshire and The Humber",
  HUDDERSFIELD: "Yorkshire and The Humber", DONCASTER: "Yorkshire and The Humber",
  ROTHERHAM: "Yorkshire and The Humber", WAKEFIELD: "Yorkshire and The Humber",
  HALIFAX: "Yorkshire and The Humber", HARROGATE: "Yorkshire and The Humber",
  BARNSLEY: "Yorkshire and The Humber", BATLEY: "Yorkshire and The Humber",
  KEIGHLEY: "Yorkshire and The Humber", DEWSBURY: "Yorkshire and The Humber",
  SCUNTHORPE: "Yorkshire and The Humber", GRIMSBY: "Yorkshire and The Humber",

  // South West (extra, beyond the county-level table)
  CHELTENHAM: "South West", BOURNEMOUTH: "South West", POOLE: "South West",
  SALISBURY: "South West",

  // Scotland
  GLASGOW: "Scotland", EDINBURGH: "Scotland", ABERDEEN: "Scotland", DUNDEE: "Scotland",
  INVERNESS: "Scotland", PAISLEY: "Scotland", LIVINGSTON: "Scotland", STIRLING: "Scotland",
  DUNFERMLINE: "Scotland", THURSO: "Scotland", PERTH: "Scotland", FALKIRK: "Scotland",
  KILMARNOCK: "Scotland", MOTHERWELL: "Scotland", HAMILTON: "Scotland", LERWICK: "Scotland",

  // Wales
  CARDIFF: "Wales", SWANSEA: "Wales", NEWPORT: "Wales", WREXHAM: "Wales",
  BANGOR: "Wales", ABERGAVENNY: "Wales", PONTYPRIDD: "Wales",

  // Northern Ireland
  BELFAST: "Northern Ireland", DERRY: "Northern Ireland", ARMAGH: "Northern Ireland",
  ANTRIM: "Northern Ireland", "CASTLEWELLAN": "Northern Ireland",
};

const NATION_ONLY = new Set(["ENGLAND", "UK", "GB", "UNITED KINGDOM", "UNITED KINGDOM GB"]);

export function resolveRegion(rawTown: string, rawCounty: string): Region {
  const county = normalise(rawCounty || "");
  const town = normalise(rawTown || "");

  if (county && COUNTY_TO_REGION[county]) return COUNTY_TO_REGION[county];
  if (town && TOWN_TO_REGION[town]) return TOWN_TO_REGION[town];
  // Data entry sometimes puts a county name in the Town/City field instead.
  if (town && COUNTY_TO_REGION[town]) return COUNTY_TO_REGION[town];

  // Try substring matches for compound/typo county strings (e.g. "WEST YORKSHIRE " variants).
  for (const [key, region] of Object.entries(COUNTY_TO_REGION)) {
    if (county && county.includes(key)) return region;
  }
  for (const [key, region] of Object.entries(TOWN_TO_REGION)) {
    if (town && town.includes(key)) return region;
  }
  for (const [key, region] of Object.entries(COUNTY_TO_REGION)) {
    if (town && town.includes(key)) return region;
  }

  if (county && NATION_ONLY.has(county)) return "Unknown";

  return "Unknown";
}

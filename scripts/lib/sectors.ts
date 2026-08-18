// Heuristic, keyword-based sector inference from organisation name only.
// This is NOT official Home Office data - the UI must label it as inferred.
// Order matters: more specific/high-precision rules are checked before generic ones.

export type Sector =
  | "Health & Social Care"
  | "IT & Software"
  | "Education"
  | "Hospitality"
  | "Construction"
  | "Logistics & Transport"
  | "Finance & Professional Services"
  | "Recruitment & Staffing"
  | "Retail"
  | "Manufacturing & Engineering"
  | "Agriculture"
  | "Creative & Media"
  | "Charity & Religious"
  | "Public Sector"
  | "Other";

export const ALL_SECTORS: Sector[] = [
  "Health & Social Care",
  "IT & Software",
  "Education",
  "Hospitality",
  "Construction",
  "Logistics & Transport",
  "Finance & Professional Services",
  "Recruitment & Staffing",
  "Retail",
  "Manufacturing & Engineering",
  "Agriculture",
  "Creative & Media",
  "Charity & Religious",
  "Public Sector",
  "Other",
];

const RULES: Array<{ sector: Sector; keywords: RegExp }> = [
  {
    sector: "Recruitment & Staffing",
    keywords: /\b(recruitment|staffing|resourcing|employment agency|talent partners?)\b/i,
  },
  {
    sector: "Health & Social Care",
    keywords:
      /\b(care home|care ltd|healthcare|health care|nhs|medical|dental|dentist|pharmac|clinic|hospital|nursing|physio|care services|domiciliary|social care|surgery)\b/i,
  },
  {
    sector: "Education",
    keywords: /\b(school|college|university|academy|nursery school|education|tuition|training institute)\b/i,
  },
  {
    sector: "IT & Software",
    keywords:
      /\b(software|technolog|digital|systems ltd|it services|it solutions|cyber|cloud|data solutions|tech ltd|technologies)\b/i,
  },
  {
    sector: "Construction",
    keywords:
      /\b(construction|builders?|building services|contractors?|civil engineering|roofing|plumbing|scaffold|groundworks|joinery)\b/i,
  },
  {
    sector: "Logistics & Transport",
    keywords: /\b(logistics|haulage|freight|couriers?|shipping|removals|distribution|transport)\b/i,
  },
  {
    sector: "Agriculture",
    keywords: /\b(farm|farming|agricultur|dairy|livestock|horticultur)\b/i,
  },
  {
    sector: "Hospitality",
    keywords:
      /\b(hotel|restaurant|cafe|caf[eé]|catering|takeaway|cuisine|kitchen|pizza|kebab|bar & grill|pub\b|bistro|patisserie|bakery)\b/i,
  },
  {
    sector: "Manufacturing & Engineering",
    keywords: /\b(manufactur|engineering|fabrication|industries|precision|foundry|refrigeration)\b/i,
  },
  {
    sector: "Creative & Media",
    keywords: /\b(media|films?|productions?|studios?|publishing|advertising|design studio|music\b|broadcast)\b/i,
  },
  {
    sector: "Finance & Professional Services",
    keywords:
      /\b(accountants?|accounting|financial|solicitors?|law firm|legal services|llp\b|consulting|consultancy|capital\b|insurance|chartered)\b/i,
  },
  {
    sector: "Charity & Religious",
    keywords: /\b(charity|charitable|church|mosque|temple|gurdwara|synagogue|ministries|diocese|foundation)\b/i,
  },
  {
    sector: "Public Sector",
    keywords: /\b(council|borough council|city council|county council|government|public authority)\b/i,
  },
  {
    sector: "Retail",
    keywords: /\b(retail|supermarket|store\b|stores\b|convenience|off licen[cs]e|newsagents?)\b/i,
  },
];

export function inferSector(organisationName: string): Sector {
  for (const rule of RULES) {
    if (rule.keywords.test(organisationName)) return rule.sector;
  }
  return "Other";
}

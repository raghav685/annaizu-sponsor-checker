export type SponsorLicenceType = "Worker" | "Temporary Worker";

export type SponsorRatingTier =
  | "A rating"
  | "A rating (Premium)"
  | "A rating (SME+)"
  | "B rating"
  | "UK Expansion Worker: Provisional";

export interface Sponsor {
  id: string;
  organisationName: string;
  townCity: string;
  county: string | null;
  /** e.g. "Worker (A rating)" — kept verbatim per licence for display */
  ratings: string[];
  types: SponsorLicenceType[];
  ratingTiers: SponsorRatingTier[];
  routes: string[];
}

export interface SponsorDataset {
  generatedAt: string;
  sourceUrl: string;
  sourcePublicationUrl: string;
  totalSponsors: number;
  totalRows: number;
  counties: string[];
  townCities: string[];
  routes: string[];
  ratingTiers: SponsorRatingTier[];
  types: SponsorLicenceType[];
  sponsors: Sponsor[];
}

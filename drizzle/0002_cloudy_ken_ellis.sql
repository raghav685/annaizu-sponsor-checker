ALTER TABLE "companies_house_cache" ADD COLUMN "incorporated_at" date;--> statement-breakpoint
ALTER TABLE "companies_house_cache" ADD COLUMN "registered_office" text;--> statement-breakpoint
ALTER TABLE "companies_house_cache" ADD COLUMN "company_type" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "companies_house_matched_on" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "companies_house_incorporated_at" date;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "companies_house_registered_office" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "companies_house_company_type" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "companies_house_needs_review" boolean DEFAULT false NOT NULL;
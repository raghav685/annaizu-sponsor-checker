CREATE TYPE "public"."industry_source" AS ENUM('companies_house', 'keyword', 'none');--> statement-breakpoint
CREATE TYPE "public"."review_candidate_type" AS ENUM('rename', 'relocate', 'unmerge');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."sponsor_event_type" AS ENUM('added', 'removed', 'rating_changed', 'route_added', 'route_removed', 'renamed', 'relocated', 'status_reclassified');--> statement-breakpoint
CREATE TYPE "public"."sponsor_link_type" AS ENUM('rename', 'relocate', 'merge');--> statement-breakpoint
CREATE TYPE "public"."sponsor_status" AS ENUM('active', 'withdrawn', 'closed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'success', 'no_change', 'failed', 'halted_for_review');--> statement-breakpoint
CREATE TABLE "companies_house_cache" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"query_name" text NOT NULL,
	"matched_company_number" text,
	"matched_company_name" text,
	"match_confidence" numeric,
	"company_status" text,
	"sic_codes" text[],
	"raw_response" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_breakdowns" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"dimension_type" text NOT NULL,
	"dimension_value" text NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_totals" (
	"date" date PRIMARY KEY NOT NULL,
	"active_count" integer NOT NULL,
	"withdrawn_count" integer NOT NULL,
	"closed_count" integer NOT NULL,
	"added_count" integer NOT NULL,
	"removed_count" integer NOT NULL,
	"updated_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_run_id" integer NOT NULL,
	"file_sha256" text NOT NULL,
	"blob_url" text NOT NULL,
	"blob_key" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_sync_run_id_unique" UNIQUE("sync_run_id"),
	CONSTRAINT "snapshots_file_sha256_unique" UNIQUE("file_sha256")
);
--> statement-breakpoint
CREATE TABLE "sponsor_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"sync_run_id" integer,
	"event_type" "sponsor_event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"route" text,
	"before" jsonb,
	"after" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_links" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"from_sponsor_id" uuid NOT NULL,
	"to_sponsor_id" uuid NOT NULL,
	"link_type" "sponsor_link_type" NOT NULL,
	"sync_run_id" integer,
	"confidence" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_review_queue" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sync_run_id" integer,
	"candidate_type" "review_candidate_type" NOT NULL,
	"old_sponsor_id" uuid NOT NULL,
	"new_row_raw" jsonb NOT NULL,
	"similarity_score" numeric NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"resulting_sponsor_id" uuid,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_routes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"route" text NOT NULL,
	"rating" text,
	"sponsor_type" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"match_key" text NOT NULL,
	"display_name" text NOT NULL,
	"name_variants" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"town" text NOT NULL,
	"county" text DEFAULT '' NOT NULL,
	"region" text NOT NULL,
	"sector" text NOT NULL,
	"industry_source" "industry_source" DEFAULT 'keyword' NOT NULL,
	"sic_code" text,
	"status" "sponsor_status" DEFAULT 'active' NOT NULL,
	"status_confidence" numeric,
	"companies_house_number" text,
	"companies_house_match_confidence" numeric,
	"companies_house_matched_at" timestamp with time zone,
	"merged_into_id" uuid,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "staged_rows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sync_run_id" integer NOT NULL,
	"match_key" text NOT NULL,
	"display_name" text NOT NULL,
	"town" text NOT NULL,
	"county" text DEFAULT '' NOT NULL,
	"region" text NOT NULL,
	"sector" text NOT NULL,
	"route" text NOT NULL,
	"rating" text,
	"sponsor_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"source_content_api_url" text NOT NULL,
	"csv_url" text,
	"csv_filename" text,
	"file_sha256" text,
	"register_public_updated_at" timestamp with time zone,
	"row_count" integer,
	"sponsors_active_before" integer,
	"sponsors_added_count" integer,
	"sponsors_removed_count" integer,
	"sponsors_updated_count" integer,
	"csv_rows_removed_count" integer,
	"halt_summary" jsonb,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_decision" text,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_events" ADD CONSTRAINT "sponsor_events_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_events" ADD CONSTRAINT "sponsor_events_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_links" ADD CONSTRAINT "sponsor_links_from_sponsor_id_sponsors_id_fk" FOREIGN KEY ("from_sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_links" ADD CONSTRAINT "sponsor_links_to_sponsor_id_sponsors_id_fk" FOREIGN KEY ("to_sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_links" ADD CONSTRAINT "sponsor_links_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_review_queue" ADD CONSTRAINT "sponsor_review_queue_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_review_queue" ADD CONSTRAINT "sponsor_review_queue_old_sponsor_id_sponsors_id_fk" FOREIGN KEY ("old_sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_review_queue" ADD CONSTRAINT "sponsor_review_queue_resulting_sponsor_id_sponsors_id_fk" FOREIGN KEY ("resulting_sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_routes" ADD CONSTRAINT "sponsor_routes_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_rows" ADD CONSTRAINT "staged_rows_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_house_cache_query_name_idx" ON "companies_house_cache" USING btree ("query_name");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_breakdowns_unique_idx" ON "daily_breakdowns" USING btree ("date","dimension_type","dimension_value");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsor_events_dedupe_uidx" ON "sponsor_events" USING btree ("sync_run_id","sponsor_id","event_type",COALESCE("route", ''));--> statement-breakpoint
CREATE INDEX "sponsor_events_sponsor_time_idx" ON "sponsor_events" USING btree ("sponsor_id","occurred_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsor_routes_current_uidx" ON "sponsor_routes" USING btree ("sponsor_id","route") WHERE "sponsor_routes"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "sponsors_match_key_town_uidx" ON "sponsors" USING btree ("match_key","town");--> statement-breakpoint
CREATE INDEX "sponsors_match_key_idx" ON "sponsors" USING btree ("match_key");--> statement-breakpoint
CREATE INDEX "staged_rows_sync_run_match_key_idx" ON "staged_rows" USING btree ("sync_run_id","match_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_runs_one_running_uidx" ON "sync_runs" USING btree ("status") WHERE "sync_runs"."status" = 'running';--> statement-breakpoint
CREATE UNIQUE INDEX "sync_runs_pending_halt_uidx" ON "sync_runs" USING btree ("file_sha256") WHERE "sync_runs"."status" = 'halted_for_review';
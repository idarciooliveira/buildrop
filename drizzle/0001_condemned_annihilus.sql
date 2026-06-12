CREATE TABLE "upload_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_storage_limits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"limit_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "file_size_bytes" bigint;--> statement-breakpoint
CREATE INDEX "upload_reservations_user_id_idx" ON "upload_reservations" USING btree ("user_id");
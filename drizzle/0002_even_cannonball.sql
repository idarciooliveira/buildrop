CREATE TABLE "app_share_items" (
	"app_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"item_order" integer NOT NULL,
	"share_id" text NOT NULL,
	CONSTRAINT "app_share_items_share_id_app_id_pk" PRIMARY KEY("share_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "app_shares" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"share_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_share_items" ADD CONSTRAINT "app_share_items_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_share_items" ADD CONSTRAINT "app_share_items_share_id_app_shares_share_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."app_shares"("share_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_share_items_app_id_idx" ON "app_share_items" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "app_share_items_share_id_idx" ON "app_share_items" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "app_shares_user_id_idx" ON "app_shares" USING btree ("user_id");
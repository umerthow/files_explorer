CREATE TABLE IF NOT EXISTS "files" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"folder_id" bigint NOT NULL,
	"name" text NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"parent_id" bigint,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"depth" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_folder_idx" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_name_lower_idx" ON "files" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "files_folder_name_uniq" ON "files" USING btree ("folder_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_parent_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_path_idx" ON "folders" USING btree ("path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_name_lower_idx" ON "folders" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "folders_parent_name_uniq" ON "folders" USING btree ("parent_id","name");
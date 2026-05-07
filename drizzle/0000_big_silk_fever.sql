CREATE TYPE "public"."connection_status" AS ENUM('pending', 'accepted', 'declined', 'blocked', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."medium_enum" AS ENUM('in-person', 'phone-call', 'video-call', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."subject_enum" AS ENUM('chumash', 'tanach', 'mishna', 'gemora', 'daf_yomi', 'chassidus', 'halacha', 'dirshu');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"initiator_tentacle_id" uuid,
	"recipient_tentacle_id" uuid,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_passcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"country_code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "synagogues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"region_id" integer,
	"country" text,
	"address" text,
	"postcode" text,
	"email" text,
	"tel" text,
	"rabbi_name" text,
	"rabbi_number" text,
	"rabbi_email" text,
	"nusach" text,
	"website" text,
	"address_lon" text,
	"address_lat" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentacles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"region_id" integer NOT NULL,
	"subject" "subject_enum" NOT NULL,
	"availability_local" text NOT NULL,
	"availability_utc" text NOT NULL,
	"medium" "medium_enum",
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"bio" text,
	"gender" text,
	"image_url" text,
	"image" text,
	"region_id" integer,
	"synagogue_id" integer,
	"postcode" text,
	"postcode_lat" text,
	"postcode_lon" text,
	"email_verified" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"detected_country" text,
	"detected_city" text,
	"requested_region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_initiator_tentacle_id_tentacles_id_fk" FOREIGN KEY ("initiator_tentacle_id") REFERENCES "public"."tentacles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_recipient_tentacle_id_tentacles_id_fk" FOREIGN KEY ("recipient_tentacle_id") REFERENCES "public"."tentacles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synagogues" ADD CONSTRAINT "synagogues_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentacles" ADD CONSTRAINT "tentacles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentacles" ADD CONSTRAINT "tentacles_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_synagogue_id_synagogues_id_fk" FOREIGN KEY ("synagogue_id") REFERENCES "public"."synagogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connections_recipient_idx" ON "connections" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE INDEX "connections_initiator_idx" ON "connections" USING btree ("initiator_id","status");--> statement-breakpoint
CREATE INDEX "email_passcodes_email_idx" ON "email_passcodes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_passcodes_code_idx" ON "email_passcodes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "messages_connection_idx" ON "messages" USING btree ("connection_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "regions_country_idx" ON "regions" USING btree ("country_code") WHERE "regions"."active" = true;--> statement-breakpoint
CREATE INDEX "synagogues_region_idx" ON "synagogues" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "synagogues_name_idx" ON "synagogues" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tentacles_match_idx" ON "tentacles" USING btree ("region_id","subject","active");--> statement-breakpoint
CREATE INDEX "tentacles_user_idx" ON "tentacles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_region_idx" ON "users" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "waitlist_email_idx" ON "waitlist" USING btree ("email");
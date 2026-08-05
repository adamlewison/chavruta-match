import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  uuid,
  integer,
  pgEnum,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Enums ──────────────────────────────────────────

export const subjectEnum = pgEnum("subject_enum", [
  "chumash",
  "tanach",
  "mishna",
  "gemora",
  "daf_yomi",
  "chassidus",
  "halacha",
  "dirshu",
]);

export const mediumEnum = pgEnum("medium_enum", [
  "in-person",
  "phone-call",
  "video-call",
  "flexible",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "accepted",
  "declined",
  "blocked",
  "cancelled",
]);

// ─── Regions ────────────────────────────────────────

export const regions = pgTable(
  "regions",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").unique().notNull(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    countryCode: text("country_code").notNull(),
    // boundary stored as geometry but managed via raw SQL (PostGIS)
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("regions_country_idx")
      .on(table.countryCode)
      .where(sql`${table.active} = true`),
  ],
);

// ─── Synagogues ─────────────────────────────────────

export const synagogues = pgTable(
  "synagogues",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nickname: text("nickname"),
    description: text("description"),
    regionId: integer("region_id").references(() => regions.id),
    country: text("country"),
    address: text("address"),
    postcode: text("postcode"),
    email: text("email"),
    tel: text("tel"),
    rabbiName: text("rabbi_name"),
    rabbiNumber: text("rabbi_number"),
    rabbiEmail: text("rabbi_email"),
    nusach: text("nusach"),
    website: text("website"),
    addressLon: text("address_lon"),
    addressLat: text("address_lat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("synagogues_region_idx").on(table.regionId),
    index("synagogues_name_idx").on(table.name),
  ],
);

// ─── Auth.js tables ─────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").unique().notNull(),
    name: text("name").notNull().default(""),
    bio: text("bio"),
    gender: text("gender"),
    imageUrl: text("image_url"),
    image: text("image"),
    regionId: integer("region_id").references(() => regions.id),
    synagogueId: integer("synagogue_id").references(() => synagogues.id),
    postcode: text("postcode"),
    postcodeLat: text("postcode_lat"),
    postcodeLon: text("postcode_lon"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("users_region_idx").on(table.regionId)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const emailPasscodes = pgTable(
  "email_passcodes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_passcodes_email_idx").on(table.email),
    index("email_passcodes_code_idx").on(table.code),
  ],
);

// ─── Tentacles ──────────────────────────────────────

export const tentacles = pgTable(
  "tentacles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id),
    subject: subjectEnum("subject").notNull(),
    availabilityLocal: text("availability_local").notNull(), // 336-char string of 0s and 1s
    availabilityUtc: text("availability_utc").notNull(),
    medium: mediumEnum("medium"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tentacles_match_idx").on(
      table.regionId,
      table.subject,
      table.active,
    ),
    index("tentacles_user_idx").on(table.userId),
  ],
);

// ─── Connections ────────────────────────────────────

export const connections = pgTable(
  "connections",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    initiatorId: uuid("initiator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    initiatorTentacleId: uuid("initiator_tentacle_id").references(
      () => tentacles.id,
      { onDelete: "set null" },
    ),
    recipientTentacleId: uuid("recipient_tentacle_id").references(
      () => tentacles.id,
      { onDelete: "set null" },
    ),
    status: connectionStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    index("connections_recipient_idx").on(table.recipientId, table.status),
    index("connections_initiator_idx").on(table.initiatorId, table.status),
  ],
);

// ─── Messages ───────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_connection_idx").on(table.connectionId, table.createdAt),
    index("messages_sender_idx").on(table.senderId),
  ],
);

// ─── Waitlist ───────────────────────────────────────

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    detectedCountry: text("detected_country"),
    detectedCity: text("detected_city"),
    requestedRegion: text("requested_region"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("waitlist_email_idx").on(table.email)],
);

// ─── Type exports ───────────────────────────────────

export type Region = typeof regions.$inferSelect;
export type Synagogue = typeof synagogues.$inferSelect;
export type User = typeof users.$inferSelect;
export type Tentacle = typeof tentacles.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type WaitlistEntry = typeof waitlist.$inferSelect;

export const SUBJECTS = [
  "chumash",
  "tanach",
  "mishna",
  "gemora",
  "daf_yomi",
  "chassidus",
  "halacha",
  "dirshu",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  chumash: "Chumash",
  tanach: "Tanach",
  mishna: "Mishna",
  gemora: "Gemora",
  daf_yomi: "Daf Yomi",
  chassidus: "Chassidus",
  halacha: "Halacha",
  dirshu: "Dirshu",
};

export const MEDIUMS = [
  "in-person",
  "phone-call",
  "video-call",
  "flexible",
] as const;
export type Medium = (typeof MEDIUMS)[number];

export const MEDIUM_LABELS: Record<Medium, string> = {
  "in-person": "In Person",
  "phone-call": "Phone Call",
  "video-call": "Video Call",
  flexible: "Flexible",
};

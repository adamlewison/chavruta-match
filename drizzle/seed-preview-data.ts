import type { Medium, Subject } from "@/lib/db/schema";
import { emptyBitmap, setBit, slotIndex } from "@/lib/availability";

/**
 * The fixed demo dataset that `seed-preview.ts` loads into a preview database.
 *
 * Every identifier is hard-coded so the dataset is byte-identical on every run, which
 * is what lets the seeder be re-run as a no-op. Kept apart from the seeding logic so
 * that adding demo rows never means touching the insertion code.
 *
 * The shape is deliberate, not arbitrary: `getMatches` in `lib/queries.ts` only returns
 * candidates in the same region and subject who are *not* already connected, so every
 * subject below carries at least two users with genuinely overlapping availability and
 * no connection between them. Seeding one user per subject would leave every matches
 * screen empty and make the preview useless for review.
 */

/** Fake accounts use the reserved `.test` TLD so no seeded address can receive mail. */
export const DEMO_EMAIL_DOMAIN = "@vruta.test";

export type DemoTentacle = {
  id: string;
  subject: Subject;
  medium: Medium;
  notes: string;
  availability: string;
};

export type DemoUser = {
  id: string;
  name: string;
  gender: "male" | "female";
  bio: string;
  postcode: string;
  lat: string;
  lon: string;
  /** Index into the seeded synagogue list, so demo users spread across shuls. */
  synagogueIndex: number;
  tentacles: DemoTentacle[];
};

/**
 * Builds a weekly availability bitmap from whole-hour ranges.
 *
 * @param ranges - `[day, startHour, endHour)` triples, day 0 = Sunday, hours 0–24.
 * @returns A 336-character bitmap in the tentacle's local timezone.
 */
function availability(ranges: [day: number, from: number, to: number][]): string {
  let bitmap = emptyBitmap();
  for (const [day, from, to] of ranges) {
    for (let halfHour = from * 2; halfHour < to * 2; halfHour++) {
      bitmap = setBit(bitmap, slotIndex(day, halfHour), true);
    }
  }
  return bitmap;
}

/** Mon–Fri 20:00–22:00. The most common shape, so several users share it. */
const WEEKDAY_EVENINGS = availability([
  [1, 20, 22],
  [2, 20, 22],
  [3, 20, 22],
  [4, 20, 22],
  [5, 20, 22],
]);

/** Mon–Fri 06:00–08:00, for the before-work Daf Yomi crowd. */
const EARLY_MORNINGS = availability([
  [1, 6, 8],
  [2, 6, 8],
  [3, 6, 8],
  [4, 6, 8],
  [5, 6, 8],
]);

/** Sunday 10:00–13:00. */
const SUNDAY_MORNING = availability([[0, 10, 13]]);

/** Shabbos afternoon, 14:00–17:00. */
const SHABBOS_AFTERNOON = availability([[6, 14, 17]]);

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const t = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const DEMO_USERS: DemoUser[] = [
  {
    id: u(1), name: "Ari Demo", gender: "male", synagogueIndex: 0,
    bio: "Looking for a steady Gemora chavruta a few evenings a week.",
    postcode: "NW11 8AA", lat: "51.5745", lon: "-0.1966",
    tentacles: [
      { id: t(1), subject: "gemora", medium: "in-person", notes: "Currently in Bava Metzia, happy to start something new.", availability: WEEKDAY_EVENINGS },
    ],
  },
  {
    id: u(2), name: "Binyomin Demo", gender: "male", synagogueIndex: 1,
    bio: "Daf Yomi every morning before work, rain or shine.",
    postcode: "N16 5AA", lat: "51.5615", lon: "-0.0757",
    tentacles: [
      { id: t(2), subject: "daf_yomi", medium: "phone-call", notes: "6:15am works best for me.", availability: EARLY_MORNINGS },
      { id: t(3), subject: "halacha", medium: "flexible", notes: "Working through hilchos Shabbos slowly.", availability: SUNDAY_MORNING },
    ],
  },
  {
    id: u(3), name: "Chaya Demo", gender: "female", synagogueIndex: 2,
    bio: "Chumash with meforshim — prefer video so I can share a screen.",
    postcode: "NW4 2AA", lat: "51.5833", lon: "-0.2258",
    tentacles: [
      { id: t(4), subject: "chumash", medium: "video-call", notes: "Parsha of the week, one hour.", availability: SUNDAY_MORNING },
    ],
  },
  {
    id: u(4), name: "Dovid Demo", gender: "male", synagogueIndex: 3,
    bio: "New to learning b'chavrusa, patient partner appreciated.",
    postcode: "HA8 7AA", lat: "51.6136", lon: "-0.2750",
    tentacles: [
      { id: t(5), subject: "mishna", medium: "in-person", notes: "Starting Seder Moed from the beginning.", availability: WEEKDAY_EVENINGS },
    ],
  },
  {
    id: u(5), name: "Esther Demo", gender: "female", synagogueIndex: 4,
    bio: "Chassidus on Shabbos afternoons, and Tanach midweek.",
    postcode: "E5 9AA", lat: "51.5561", lon: "-0.0553",
    tentacles: [
      { id: t(6), subject: "chassidus", medium: "in-person", notes: "Tanya, chapter a week.", availability: SHABBOS_AFTERNOON },
      { id: t(7), subject: "tanach", medium: "video-call", notes: "Neviim Rishonim.", availability: availability([[2, 20, 22], [4, 20, 22]]) },
    ],
  },
  {
    id: u(6), name: "Faigy Demo", gender: "female", synagogueIndex: 5,
    bio: "Dirshu cycle, looking for someone on the same schedule.",
    postcode: "NW2 6AA", lat: "51.5586", lon: "-0.2137",
    tentacles: [
      { id: t(8), subject: "dirshu", medium: "flexible", notes: "Testing at the end of each month.", availability: availability([[0, 20, 22], [1, 20, 22], [2, 20, 22]]) },
    ],
  },
  {
    id: u(7), name: "Gershon Demo", gender: "male", synagogueIndex: 6,
    bio: "Evening Gemora, north London, can travel a few stops.",
    postcode: "N3 1AA", lat: "51.6003", lon: "-0.1925",
    tentacles: [
      { id: t(9), subject: "gemora", medium: "in-person", notes: "Happy to be the one who travels.", availability: WEEKDAY_EVENINGS },
    ],
  },
  {
    id: u(8), name: "Hindy Demo", gender: "female", synagogueIndex: 7,
    bio: "Halacha l'maaseh, practical and to the point.",
    postcode: "HA7 4AA", lat: "51.6194", lon: "-0.3134",
    tentacles: [
      { id: t(10), subject: "halacha", medium: "phone-call", notes: "Kitzur, twenty minutes a day.", availability: availability([[0, 11, 13], [1, 13, 14], [3, 13, 14]]) },
    ],
  },
  {
    id: u(9), name: "Yitzchok Demo", gender: "male", synagogueIndex: 8,
    bio: "Been learning the same masechta for a year, ready for a partner.",
    postcode: "NW11 9AA", lat: "51.5760", lon: "-0.1990",
    tentacles: [
      { id: t(11), subject: "gemora", medium: "in-person", notes: "Bava Metzia, perek two.", availability: WEEKDAY_EVENINGS },
    ],
  },
  {
    id: u(10), name: "Moshe Demo", gender: "male", synagogueIndex: 9,
    bio: "Three evenings a week is realistic for me, more is not.",
    postcode: "N16 6AA", lat: "51.5630", lon: "-0.0740",
    tentacles: [
      { id: t(12), subject: "gemora", medium: "video-call", notes: "Prefer video midweek, in person on Sundays.", availability: availability([[1, 20, 22], [3, 20, 22], [4, 20, 22]]) },
    ],
  },
  {
    id: u(11), name: "Shmuel Demo", gender: "male", synagogueIndex: 10,
    bio: "Daf Yomi before shacharis. Consistency matters more than speed.",
    postcode: "NW2 7AA", lat: "51.5600", lon: "-0.2150",
    tentacles: [
      { id: t(13), subject: "daf_yomi", medium: "phone-call", notes: "On the phone at 6:30 sharp.", availability: EARLY_MORNINGS },
    ],
  },
  {
    id: u(12), name: "Rivka Demo", gender: "female", synagogueIndex: 11,
    bio: "Chumash on Sundays, Neviim when I can fit it in.",
    postcode: "N3 2AA", lat: "51.6010", lon: "-0.1940",
    tentacles: [
      { id: t(14), subject: "chumash", medium: "video-call", notes: "Rashi and Ramban, slowly.", availability: SUNDAY_MORNING },
      { id: t(15), subject: "tanach", medium: "video-call", notes: "Shoftim at the moment.", availability: availability([[2, 20, 22]]) },
    ],
  },
  {
    id: u(13), name: "Yaakov Demo", gender: "male", synagogueIndex: 12,
    bio: "Mishna b'iyun, one mishna at a time.",
    postcode: "HA8 8AA", lat: "51.6150", lon: "-0.2730",
    tentacles: [
      { id: t(16), subject: "mishna", medium: "in-person", notes: "Happy to start from Berachos again.", availability: WEEKDAY_EVENINGS },
    ],
  },
  {
    id: u(14), name: "Malka Demo", gender: "female", synagogueIndex: 13,
    bio: "Chassidus Shabbos afternoon, Dirshu in the evenings.",
    postcode: "E5 8AA", lat: "51.5575", lon: "-0.0570",
    tentacles: [
      { id: t(17), subject: "chassidus", medium: "in-person", notes: "Likutei Torah on the parsha.", availability: SHABBOS_AFTERNOON },
      { id: t(18), subject: "dirshu", medium: "flexible", notes: "Same cycle, happy to test together.", availability: availability([[0, 20, 22], [2, 20, 22]]) },
    ],
  },
  {
    id: u(15), name: "Leah Demo", gender: "female", synagogueIndex: 14,
    bio: "Sunday morning halacha, then the rest of the week is family time.",
    postcode: "NW4 3AA", lat: "51.5820", lon: "-0.2270",
    tentacles: [
      { id: t(19), subject: "halacha", medium: "in-person", notes: "Hilchos Shabbos, same as everyone.", availability: SUNDAY_MORNING },
    ],
  },
];

/**
 * Demo connections between seeded users, one per status worth looking at in a preview.
 * `respondedAt` is set for anything past `pending` so the UI renders a real timeline.
 *
 * Only `accepted` and `blocked` remove a user from someone's matches, so the accepted
 * pair below is chosen to leave both sides with other Gemora candidates.
 */
export const DEMO_CONNECTIONS = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    initiatorId: u(1),
    recipientId: u(7),
    initiatorTentacleId: t(1),
    recipientTentacleId: t(9),
    status: "accepted" as const,
    message: "Saw we both learn Gemora in the evenings — want to try a week?",
    respondedAt: new Date("2026-01-14T19:30:00Z"),
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    initiatorId: u(4),
    recipientId: u(13),
    initiatorTentacleId: t(5),
    recipientTentacleId: t(16),
    status: "pending" as const,
    message: "Would you want to start Seder Moed together?",
    respondedAt: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    initiatorId: u(5),
    recipientId: u(12),
    initiatorTentacleId: t(7),
    recipientTentacleId: t(15),
    status: "declined" as const,
    message: "Are you open to Tanach on Tuesdays?",
    respondedAt: new Date("2026-01-16T09:00:00Z"),
  },
];

/** Messages on the accepted connection, so the messages screen is not empty. */
export const DEMO_MESSAGES = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    connectionId: DEMO_CONNECTIONS[0].id,
    senderId: u(1),
    content: "Great — Tuesday 8pm at the shul beis medrash?",
    createdAt: new Date("2026-01-14T19:45:00Z"),
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    connectionId: DEMO_CONNECTIONS[0].id,
    senderId: u(7),
    content: "Works for me. I'll bring a spare Gemora.",
    createdAt: new Date("2026-01-14T20:02:00Z"),
  },
];

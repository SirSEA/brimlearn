import { ENV } from "./_core/env";
import { getFirestoreDb } from "./_core/firebase";
import * as db from "./db";
import { jitsiRoomUrl } from "@shared/session";
import type { CreateAssignmentInput } from "@shared/assignment";
import type { SchemeWeek } from "@shared/scheme";

/**
 * Seeds a small amount of believable sample content so the app is a working
 * demo the moment it boots — before an admin/tutor has uploaded anything:
 * lesson videos, a worksheet, weekly live sessions, assignments, and a mini
 * scheme of work. Every write is guarded by "only seed if the collection is
 * empty", so teacher uploads and re-runs are never clobbered.
 *
 * Live demo sessions are the exception: the sample rooms (hostBy
 * "sample-seed") are refreshed on every boot so there is always one session
 * happening right now and a few upcoming, all running in the app's embedded
 * Jitsi room.
 */

const SAMPLE_VIDEOS = [
  {
    title: "Multiply by 10, 100 and 1,000 · lesson video",
    category: "recording" as const,
    youtubeId: "d0V_w6PBM9A",
    subject: "Mathematics",
    week: "1",
  },
  {
    title: "Fractions: build the whole",
    category: "recording" as const,
    youtubeId: "rz4ARYf_4vA",
    subject: "Mathematics",
    week: "2",
  },
  {
    title: "Perimeter vs area · visual lab",
    category: "material" as const,
    youtubeId: "rVx-wjfrSmA",
    subject: "Mathematics",
    week: "4",
  },
];

const SAMPLE_WORKSHEET_NOTE = `BrimLearn sample worksheet — Multiplying by 10, 100 and 1,000.

1. 4 x 10 = __
2. 12 x 100 = __
3. 7 x 1,000 = __
4. A tray holds 8 eggs. How many eggs in 10 trays?
5. The market sells bags of 100 oranges. How many oranges in 6 bags?

Replace this file from the tutor "Resources" tab once the real worksheet is ready.

Level: Core · JSS1 Mathematics · First term`;

async function collectionEmpty(collection: string): Promise<boolean> {
  const snap = await getFirestoreDb().collection(collection).limit(1).get();
  return snap.empty;
}

function isoOffset(minutesFromNow: number, durationMinutes = 45): { startsAt: string; endsAt: string } {
  const start = new Date(Date.now() + minutesFromNow * 60_000);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

const DEMO_SESSION_OFFSETS = [
  { title: "Multiplication in the market · live", subject: "Mathematics", offset: -8 },
  { title: "Comprehension circle", subject: "English Studies", offset: 60 },
  { title: "States of matter lab demo", subject: "Basic Science", offset: 3 * 60 },
  { title: "Literacy coaching · small group", subject: "English Studies", offset: 2 * 24 * 60 },
];

async function seedLiveSessions(): Promise<void> {
  for (const session of DEMO_SESSION_OFFSETS) {
    const { startsAt, endsAt } = isoOffset(session.offset, 45);
    await db.createLiveSession(
      {
        title: session.title,
        description: "Sample live session — re-schedule from the tutor Class calendar once real classes are set.",
        subject: session.subject,
        subjectId: session.subject === "Mathematics" ? "maths" : "english",
        grade: "JSS1",
        term: "First term",
        week: "1",
        platform: "jitsi",
        startsAt,
        endsAt,
        hostBy: "sample-seed",
        hostName: "Ms. Sola",
      },
      undefined
    );
  }
}

/** Re-rolls the demo room times and points them at the embedded room. Keeps
 *  one session "live now" and the rest upcoming on every boot. */
async function refreshDemoLiveSessions(): Promise<void> {
  const snap = await getFirestoreDb()
    .collection("liveSessions")
    .where("hostBy", "==", "sample-seed")
    .get();

  let index = 0;
  for (const doc of snap.docs) {
    const window = DEMO_SESSION_OFFSETS[index % DEMO_SESSION_OFFSETS.length];
    index += 1;
    const { startsAt, endsAt } = isoOffset(window.offset, 45);
    await doc.ref.update({
      platform: "jitsi",
      meetingUrl: jitsiRoomUrl(doc.id),
      startsAt,
      endsAt,
      updatedAt: new Date(),
    });
  }
}

export async function seedSampleContent(): Promise<{ seeded: boolean; skipped: boolean }> {
  if (!ENV.firebaseConfigured) {
    return { seeded: false, skipped: true };
  }

  const result = { seeded: false, skipped: false };

  if (await collectionEmpty("resources")) {
    for (const video of SAMPLE_VIDEOS) {
      await db.createResource({
        kind: "video",
        category: video.category,
        title: video.title,
        description: "Sample lesson recording — replaced when your teacher uploads the real one.",
        youtubeId: video.youtubeId,
        grade: "JSS1",
        subjectId: "maths",
        subject: video.subject,
        term: "First term",
        week: video.week,
        createdBy: "sample-seed",
        createdByName: "Ms. Sola",
      });
    }
    await db.createResource({
      kind: "file",
      category: "worksheet",
      title: "Multiplying by 10s worksheet · sample",
      description: "Print-friendly sample worksheet (replace from the tutor Resources tab).",
      fileName: "multiply-by-10s-sample.txt",
      mimeType: "text/plain",
      subject: "Mathematics",
      grade: "JSS1",
      subjectId: "maths",
      term: "First term",
      week: "1",
      dataBase64: Buffer.from(SAMPLE_WORKSHEET_NOTE, "utf8").toString("base64"),
      createdBy: "sample-seed",
      createdByName: "Ms. Sola",
    });
    console.log("[Seed] Sample resources created.");
  }

  if (await collectionEmpty("liveSessions")) {
    await seedLiveSessions();
    console.log("[Seed] Sample live sessions created.");
  }

  // Always re-state the demo rooms: live/upcoming times + embedded room link.
  await refreshDemoLiveSessions();

  if (await collectionEmpty("assignments")) {
    const sampleAssignments: Array<CreateAssignmentInput & { createdByName: string }> = [
      {
        type: "Quiz",
        title: "Fractions check-in",
        subject: "Mathematics",
        audience: "Whole class",
        audienceKey: "class",
        difficulty: "Easy",
        due: "Due Wed 6pm",
        createdByName: "Ms. Sola",
        questions: [
          {
            question: "Which fraction names four parts out of ten?",
            options: ["4/10", "10/4", "1/4", "4/6"],
            answer: 0,
            explanation: "The top number counts the parts you have (4) and the bottom counts the total parts (10).",
          },
          {
            question: "A pizza is cut into 8 equal slices and you eat 3. What fraction did you eat?",
            options: ["3/8", "8/3", "3/5", "1/8"],
            answer: 0,
            explanation: "You ate 3 of the 8 equal slices, so the fraction is 3/8.",
          },
          {
            question: "Which of these equals one half?",
            options: ["5/10", "2/5", "3/5", "1/4"],
            answer: 0,
            explanation: "5 out of 10 is the same value as 1 out of 2, so 5/10 = 1/2.",
          },
        ],
      },
      {
        type: "Lesson",
        title: "Perimeter vs area · visual lab",
        subject: "Mathematics",
        audience: "Group (3)",
        audienceKey: "group",
        difficulty: "Medium",
        due: "Due Thu 9am",
        createdByName: "Ms. Sola",
      },
      {
        type: "Practice",
        title: "10s practice set",
        subject: "Mathematics",
        audience: "Whole class",
        audienceKey: "class",
        difficulty: "Easy",
        due: null,
        createdByName: "Ms. Sola",
      },
    ];
    for (const assignment of sampleAssignments) {
      const { createdByName, ...input } = assignment;
      await db.createAssignment({
        ...input,
        createdBy: "sample-seed",
        createdByName,
      });
    }
    console.log("[Seed] Sample assignments created.");
  }

  if (await collectionEmpty("siteContent")) {
    await db.getSiteContent();
    console.log("[Seed] Landing site content created.");
  }

  if (await collectionEmpty("schemes")) {
    const weeks: SchemeWeek[] = Array.from({ length: 7 }, (_, index) => ({
      week: `Week ${index + 1}`,
      topic:
        index === 0
          ? "Counting and place value up to 10,000"
          : index === 1
            ? "Multiplying by 10, 100 and 1,000"
            : index === 2
              ? "Comparing and ordering whole numbers"
              : index === 3
                ? "Factors and multiples"
                : index === 4
                  ? "Fractions: meaning and equivalence (mid-term)"
                  : index === 5
                    ? "Adding and subtracting fractions"
                    : "Revision and term assessment",
      content:
        index === 1
          ? "Learners multiply whole numbers by 10, 100 and 1,000 using place value and scaling up a known fact."
          : "Weekly objective from the NERDC scheme of work for JSS1 Mathematics.",
    }));
    await db.createSchemes([
      {
        id: "", // assigned by db
        grade: "JSS1",
        subjectId: "maths",
        subject: "Mathematics",
        term: "First term",
        weeks,
        sourceFile: "sample-nerdc-maths-jss1.txt",
        currentWeek: "Week 1",
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    console.log("[Seed] Sample scheme of work created.");
  }

  result.seeded = true;
  return result;
}
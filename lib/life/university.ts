/**
 * University life: every student studies a course from 100 level to 400 level. Each day's report
 * card is a result on the Nigerian 5-point scale (A = 5 … F = 0) that counts towards a CGPA.
 * Passing days (E or better) moves a student up a level; after 400 level they graduate with a
 * degree class, and then work at the Office Complex in town in a job that fits their course.
 */
import type { LifeProfile } from "./types";

export type CourseKey = "csc" | "acc" | "mcm" | "eco" | "mcb" | "bus";

export type Career = {
  /** Where the job is and what it's called at each rank, from first job to the top. */
  employer: string;
  titles: [string, string, string, string];
  /** Pay for one shift as a trainee with a Second Class Lower. */
  basePay: number;
};

export type Course = {
  key: CourseKey;
  name: string;
  code: string;
  faculty: string;
  emoji: string;
  /** Two lectures a day: first and second lecture, for each level. */
  lectures: Record<Level, [string, string]>;
  career: Career;
};

export const LEVELS = [100, 200, 300, 400] as const;
export type Level = (typeof LEVELS)[number];

/** Passed days (grade E or better) needed to move up a level. */
export const DAYS_PER_LEVEL = 3;
/** A gift from family on graduation day. */
export const GRADUATION_GIFT = 5000;
/** Work shifts a graduate can do each day. */
export const WORK_SHIFTS_PER_DAY = 3;

export const courses: Record<CourseKey, Course> = {
  csc: {
    key: "csc",
    name: "Computer Science",
    code: "CSC",
    faculty: "Faculty of Science",
    emoji: "💻",
    lectures: {
      100: ["Introduction to Computing", "Introduction to Programming"],
      200: ["Data Structures", "Computer Architecture"],
      300: ["Operating Systems", "Database Systems"],
      400: ["Artificial Intelligence", "Final Year Project"],
    },
    career: { employer: "Tech Hub", titles: ["Graduate Trainee Developer", "Software Developer", "Senior Software Developer", "Engineering Lead"], basePay: 1800 },
  },
  acc: {
    key: "acc",
    name: "Accounting",
    code: "ACC",
    faculty: "Faculty of Management Sciences",
    emoji: "📊",
    lectures: {
      100: ["Principles of Accounting I", "Principles of Accounting II"],
      200: ["Cost Accounting", "Business Law"],
      300: ["Financial Reporting", "Taxation"],
      400: ["Auditing", "Final Year Project"],
    },
    career: { employer: "Accounting Firm", titles: ["Audit Trainee", "Accountant", "Senior Accountant", "Finance Manager"], basePay: 1700 },
  },
  mcm: {
    key: "mcm",
    name: "Mass Communication",
    code: "MCM",
    faculty: "Faculty of Arts",
    emoji: "🎙️",
    lectures: {
      100: ["Introduction to Mass Communication", "Writing for the Media"],
      200: ["News Reporting", "Broadcasting"],
      300: ["Public Relations", "Media Law and Ethics"],
      400: ["Investigative Journalism", "Final Year Project"],
    },
    career: { employer: "TV & Radio Station", titles: ["Junior Reporter", "Reporter", "Senior Correspondent", "News Editor"], basePay: 1500 },
  },
  eco: {
    key: "eco",
    name: "Economics",
    code: "ECO",
    faculty: "Faculty of Social Sciences",
    emoji: "📈",
    lectures: {
      100: ["Principles of Economics I", "Principles of Economics II"],
      200: ["Microeconomics", "Macroeconomics"],
      300: ["Statistics for Economists", "The Nigerian Economy"],
      400: ["Development Economics", "Final Year Project"],
    },
    career: { employer: "Research Institute", titles: ["Research Trainee", "Economic Analyst", "Senior Analyst", "Chief Economist"], basePay: 1700 },
  },
  mcb: {
    key: "mcb",
    name: "Microbiology",
    code: "MCB",
    faculty: "Faculty of Science",
    emoji: "🔬",
    lectures: {
      100: ["General Biology", "Introductory Microbiology"],
      200: ["Microbial Genetics", "Virology"],
      300: ["Immunology", "Food Microbiology"],
      400: ["Public Health Microbiology", "Final Year Project"],
    },
    career: { employer: "Hospital Laboratory", titles: ["Lab Intern", "Medical Lab Scientist", "Senior Lab Scientist", "Lab Director"], basePay: 1600 },
  },
  bus: {
    key: "bus",
    name: "Business Administration",
    code: "BUS",
    faculty: "Faculty of Management Sciences",
    emoji: "💼",
    lectures: {
      100: ["Introduction to Business", "Principles of Management"],
      200: ["Marketing", "Business Communication"],
      300: ["Human Resource Management", "Entrepreneurship"],
      400: ["Strategic Management", "Final Year Project"],
    },
    career: { employer: "Consumer Goods Company", titles: ["Management Trainee", "Marketing Executive", "Brand Manager", "General Manager"], basePay: 1600 },
  },
};

export const COURSE_KEYS = Object.keys(courses) as CourseKey[];

export function isCourseKey(v: unknown): v is CourseKey {
  return typeof v === "string" && v in courses;
}

export type DegreeClass = "First Class" | "Second Class Upper" | "Second Class Lower" | "Third Class" | "Pass";

export type DayResult = { dayIndex: number; level: Level; grade: string; gp: number };

export type Uni = {
  course: CourseKey;
  level: Level;
  /** Days passed (E or better) at the current level. */
  passedDays: number;
  /** All days' grade points so far, for the CGPA. */
  totalPoints: number;
  daysCounted: number;
  /** The latest results, newest first. */
  results: DayResult[];
  graduated?: { cgpa: number; degree: DegreeClass; at: number };
  /** Work shifts done since graduating. */
  shifts?: number;
};

const RESULTS_KEPT = 12;

/** Nigerian 5-point scale. */
export function gradePoint(grade: string): number {
  return { A: 5, B: 4, C: 3, D: 2, E: 1 }[grade] ?? 0;
}

export function cgpa(uni: Pick<Uni, "totalPoints" | "daysCounted">): number {
  return uni.daysCounted === 0 ? 0 : Math.round((uni.totalPoints / uni.daysCounted) * 100) / 100;
}

export function degreeClass(value: number): DegreeClass {
  if (value >= 4.5) return "First Class";
  if (value >= 3.5) return "Second Class Upper";
  if (value >= 2.4) return "Second Class Lower";
  if (value >= 1.5) return "Third Class";
  return "Pass";
}

/** "2:1" style short names for small badges. */
export const DEGREE_SHORT: Record<DegreeClass, string> = {
  "First Class": "1st Class",
  "Second Class Upper": "2:1",
  "Second Class Lower": "2:2",
  "Third Class": "3rd Class",
  Pass: "Pass",
};

export function newUni(course: CourseKey): Uni {
  return { course, level: 100, passedDays: 0, totalPoints: 0, daysCounted: 0, results: [] };
}

/** Picks a course for a student who doesn't have one yet (they start in 100 level). */
export function chooseCourse(profile: LifeProfile, course: CourseKey): { ok: true } | { ok: false; reason: string } {
  if (profile.uni) return { ok: false, reason: `You already study ${courses[profile.uni.course].name}.` };
  if (!isCourseKey(course)) return { ok: false, reason: "Pick a course." };
  profile.uni = newUni(course);
  return { ok: true };
}

export type UniEvent =
  | { kind: "level_up"; level: Level; course: CourseKey }
  | { kind: "graduated"; course: CourseKey; cgpa: number; degree: DegreeClass; gift: number }
  | { kind: "job_promotion"; title: string; pay: number };

/** Records a day's result. A passed day moves the student towards the next level or graduation. */
export function recordResult(uni: Uni, grade: string, dayIndex: number, now: number): UniEvent[] {
  if (uni.graduated) return [];
  const gp = gradePoint(grade);
  uni.totalPoints += gp;
  uni.daysCounted += 1;
  uni.results = [{ dayIndex, level: uni.level, grade, gp }, ...uni.results].slice(0, RESULTS_KEPT);
  if (gp < 1) return [];
  uni.passedDays += 1;
  if (uni.passedDays < DAYS_PER_LEVEL) return [];
  uni.passedDays = 0;
  if (uni.level < 400) {
    uni.level = (uni.level + 100) as Level;
    return [{ kind: "level_up", level: uni.level, course: uni.course }];
  }
  const value = cgpa(uni);
  uni.graduated = { cgpa: value, degree: degreeClass(value), at: now };
  uni.shifts = 0;
  return [{ kind: "graduated", course: uni.course, cgpa: value, degree: uni.graduated.degree, gift: GRADUATION_GIFT }];
}

/** Today's lecture, e.g. "CSC 201 · Data Structures". */
export function lectureFor(uni: Pick<Uni, "course" | "level"> | undefined, periodKey: string): string | null {
  if (!uni) return null;
  const course = courses[uni.course];
  const second = periodKey === "lesson2";
  const title = course.lectures[uni.level][second ? 1 : 0];
  // CSC 101, CSC 102 … and the final year project is always 499.
  const number = title === "Final Year Project" ? 99 : second ? 2 : 1;
  return `${course.code} ${uni.level / 100}${String(number).padStart(2, "0")} · ${title}`;
}

// ---------------------------------------------------------------------------
// Working life
// ---------------------------------------------------------------------------

/** Shifts needed to reach each rank. */
export const RANK_SHIFTS = [0, 5, 15, 30] as const;
const RANK_PAY = [1, 1.4, 1.9, 2.6];
const DEGREE_PAY: Record<DegreeClass, number> = {
  "First Class": 1.3,
  "Second Class Upper": 1.15,
  "Second Class Lower": 1,
  "Third Class": 0.9,
  Pass: 0.8,
};

export function careerRank(shifts: number): number {
  let rank = 0;
  for (let i = 0; i < RANK_SHIFTS.length; i++) if (shifts >= RANK_SHIFTS[i]) rank = i;
  return rank;
}

export type Job = { title: string; employer: string; pay: number; rank: number; shifts: number; nextAt: number | null; nextTitle: string | null };

/** A graduate's job: title, pay per shift and how far to the next promotion. */
export function jobFor(uni: Uni | undefined): Job | null {
  if (!uni?.graduated) return null;
  const { career } = courses[uni.course];
  const shifts = uni.shifts ?? 0;
  const rank = careerRank(shifts);
  return {
    title: career.titles[rank],
    employer: career.employer,
    pay: Math.round((career.basePay * RANK_PAY[rank] * DEGREE_PAY[uni.graduated.degree]) / 50) * 50,
    rank,
    shifts,
    nextAt: RANK_SHIFTS[rank + 1] ?? null,
    nextTitle: career.titles[rank + 1] ?? null,
  };
}

/** After a work shift: one more shift on the record, and maybe a promotion. */
export function recordShift(uni: Uni): UniEvent[] {
  const before = careerRank(uni.shifts ?? 0);
  uni.shifts = (uni.shifts ?? 0) + 1;
  const job = jobFor(uni);
  return job && job.rank > before ? [{ kind: "job_promotion", title: job.title, pay: job.pay }] : [];
}

/** What classmates see: course, level and CGPA (or degree and job). Kept inside profile.stats. */
export type UniSummary = { course: CourseKey; level: Level; cgpa: number; degree?: DegreeClass; job?: string };

export function uniSummary(uni: Uni | undefined): UniSummary | undefined {
  if (!uni) return undefined;
  return { course: uni.course, level: uni.level, cgpa: uni.graduated?.cgpa ?? cgpa(uni), degree: uni.graduated?.degree, job: jobFor(uni)?.title };
}

/** "200L" or "Graduate". */
export function standing(uni: Pick<UniSummary, "level" | "degree"> | undefined): string {
  if (!uni) return "New student";
  return uni.degree ? "Graduate" : `${uni.level}L`;
}

/** Sorts students for the university leaderboard: graduates first, then by level, then CGPA. */
export function uniRankValue(uni: UniSummary | undefined): number {
  if (!uni) return 0;
  return (uni.degree ? 500 : uni.level) * 10 + uni.cgpa;
}

/** Repairs a saved university record (older saves, or one sent by a classmate's device). */
export function sanitizeUni(raw: unknown): Uni | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<Uni>;
  if (!isCourseKey(r.course)) return undefined;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const level = (LEVELS as readonly number[]).includes(r.level as number) ? (r.level as Level) : 100;
  const results = Array.isArray(r.results)
    ? r.results
        .filter((d): d is DayResult => !!d && typeof d === "object" && typeof d.grade === "string")
        .map((d) => ({ dayIndex: num(d.dayIndex), level: (LEVELS as readonly number[]).includes(d.level) ? d.level : level, grade: d.grade.slice(0, 1), gp: gradePoint(d.grade.slice(0, 1)) }))
        .slice(0, RESULTS_KEPT)
    : [];
  const g = r.graduated;
  const graduated =
    g && typeof g === "object" && typeof g.cgpa === "number" ? { cgpa: Math.min(5, num(g.cgpa)), degree: degreeClass(Math.min(5, num(g.cgpa))), at: num(g.at) } : undefined;
  return {
    course: r.course,
    level,
    passedDays: Math.min(DAYS_PER_LEVEL - 1, num(r.passedDays)),
    totalPoints: num(r.totalPoints),
    daysCounted: num(r.daysCounted),
    results,
    graduated,
    shifts: graduated ? num(r.shifts) : undefined,
  };
}

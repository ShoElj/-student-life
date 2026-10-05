"use client";

import { useState } from "react";
import { getLifeClient } from "@/lib/life/client";
import { formatMoney } from "@/lib/life/money";
import { cgpa, COURSE_KEYS, courses, DAYS_PER_LEVEL, DEGREE_SHORT, lectureFor, LEVELS, type CourseKey, type UniSummary } from "@/lib/life/university";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";

/** "CSC · 200L" or "CSC · Graduate (2:1)" for lists of classmates. */
export function standingLabel(uni: UniSummary | undefined): string {
  if (!uni) return "Picking a course";
  const code = courses[uni.course].code;
  return uni.degree ? `${code} · Graduate (${DEGREE_SHORT[uni.degree]})` : `${code} · ${uni.level}L`;
}

/** Shown until the student picks a course (new students, and everyone from before the university update). */
export function CoursePicker() {
  const needsCourse = useLifeStore((s) => s.hud !== null && s.hud.uni === null);
  const [picked, setPicked] = useState<CourseKey | null>(null);
  if (!needsCourse) return null;
  const course = picked ? courses[picked] : null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="course-title">
      <div className="animate-pop w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <p className="text-center text-5xl" aria-hidden>
          🎓
        </p>
        <h2 id="course-title" className="mt-1 text-center text-2xl font-black text-brand">
          Choose your course
        </h2>
        <p className="mb-3 text-center text-sm text-ink/70">
          You start in <b>100 Level</b>. Pass {DAYS_PER_LEVEL} days at each level to move up, graduate after 400 Level, then start your career in town.
        </p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Courses">
          {COURSE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={picked === k}
              onClick={() => setPicked(k)}
              className={cn("flex min-h-16 items-center gap-2 rounded-2xl border-[3px] p-2 text-left active:scale-95", picked === k ? "border-brand bg-sky" : "border-ink/10 bg-white")}
            >
              <span className="text-2xl" aria-hidden>
                {courses[k].emoji}
              </span>
              <span className="min-w-0 hyphens-auto text-[13px] font-extrabold leading-tight break-words text-ink" lang="en">
                {courses[k].name}
              </span>
            </button>
          ))}
        </div>
        {course && (
          <div className="mt-3 rounded-2xl bg-ink/5 p-3 text-sm text-ink/80">
            <p className="font-bold text-ink">
              {course.faculty} · {course.code}
            </p>
            <p>
              100 Level: {course.lectures[100][0]}, {course.lectures[100][1]}
            </p>
            <p>
              Career after graduating: <b>{course.career.titles[0]}</b> → {course.career.titles[3]}
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={!picked}
          onClick={() => picked && getLifeClient()?.chooseCourse(picked)}
          className="mt-4 min-h-12 w-full rounded-2xl bg-brand text-lg font-bold text-white shadow-[0_4px_0_0_var(--color-brand-dark)] disabled:opacity-40"
        >
          {course ? `Study ${course.name}` : "Pick a course"}
        </button>
      </div>
    </div>
  );
}

/** My course, level, results and CGPA, or my degree and job after graduating. */
export function StudiesSheet() {
  const uni = useLifeStore((s) => s.hud?.uni ?? null);
  const job = useLifeStore((s) => s.hud?.job ?? null);
  if (!uni) return <p className="text-base text-ink/70">Pick a course to start university.</p>;
  const course = courses[uni.course];
  const value = uni.graduated?.cgpa ?? cgpa(uni);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-sky p-3">
        <span className="text-5xl" aria-hidden>
          {uni.graduated ? "🎓" : course.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-black text-ink">{course.name}</p>
          <p className="text-sm text-ink/70">
            {course.faculty} · {uni.graduated ? `Graduated, ${uni.graduated.degree}` : `${uni.level} Level`}
          </p>
        </div>
      </div>

      {/* 100L → 400L → Graduate */}
      <ol className="grid grid-cols-5 gap-1" aria-label="Levels">
        {[...LEVELS, 500].map((l) => {
          const done = uni.graduated ? true : l < uni.level;
          const now = !uni.graduated && l === uni.level;
          return (
            <li key={l} className={cn("rounded-xl px-1 py-2 text-center text-xs font-black", done ? "bg-leaf text-white" : now ? "bg-sun text-ink" : "bg-ink/5 text-ink/40")}>
              {l === 500 ? "🎓 Grad" : `${l}L`}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-sun/30 p-3">
          <p className="text-xs font-bold text-ink/60">CGPA (out of 5)</p>
          <p className="text-3xl font-black text-brand">{uni.daysCounted === 0 && !uni.graduated ? "–" : value.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-leaf/15 p-3">
          <p className="text-xs font-bold text-ink/60">{uni.graduated ? "Degree" : `Days passed in ${uni.level}L`}</p>
          <p className="text-2xl font-black text-leaf-dark">{uni.graduated ? DEGREE_SHORT[uni.graduated.degree] : `${uni.passedDays}/${DAYS_PER_LEVEL}`}</p>
        </div>
      </div>

      {job ? (
        <div className="rounded-2xl border-[3px] border-brand/20 p-3">
          <p className="text-xs font-bold text-ink/60">Your job · Office Complex, in town</p>
          <p className="text-lg font-black text-ink">
            👔 {job.title} <span className="text-sm font-bold text-ink/60">at the {job.employer}</span>
          </p>
          <p className="text-sm text-ink/70">
            {formatMoney(job.pay)} a shift · {job.shifts} shift{job.shifts === 1 ? "" : "s"} worked
          </p>
          {job.nextAt !== null && job.nextTitle && (
            <p className="mt-1 text-sm font-bold text-brand">
              Next promotion: {job.nextTitle} after {job.nextAt - job.shifts} more shift{job.nextAt - job.shifts === 1 ? "" : "s"}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-ink/5 p-3 text-sm text-ink/80">
          <p className="mb-1 font-bold text-ink">Today&apos;s lectures</p>
          <p>📘 {lectureFor(uni, "lesson1")}</p>
          <p>📘 {lectureFor(uni, "lesson2")}</p>
          <p className="mt-2 text-xs text-ink/60">
            Each day&apos;s report card is your result: A = 5, B = 4, C = 3, D = 2, E = 1, F = 0. Pass (E or better) {DAYS_PER_LEVEL} days to move up. Graduate
            with First Class (4.5+), Second Class Upper (3.5+), Second Class Lower (2.4+), Third Class (1.5+) or Pass. A better degree means better pay.
          </p>
        </div>
      )}

      {uni.results.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold text-ink/60">Recent results</p>
          <ul className="flex flex-wrap gap-1.5">
            {uni.results.map((r, i) => (
              <li
                key={`${r.dayIndex}-${i}`}
                className={cn("rounded-xl px-2.5 py-1 text-sm font-black", r.gp >= 4 ? "bg-leaf/20 text-leaf-dark" : r.gp >= 1 ? "bg-sun/40 text-ink" : "bg-danger/10 text-danger")}
                title={`${r.level}L`}
              >
                {r.grade}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The day's result on the report card: level, grade point, CGPA and progress to the next level. */
export function ReportUni({ uni }: { uni: { course: CourseKey; level: number; gp: number; cgpa: number; passedDays: number; needed: number } }) {
  return (
    <div className="col-span-2 rounded-2xl bg-sky p-3 text-left">
      <p className="text-xs font-bold text-ink/60">
        {courses[uni.course].name} · {uni.level} Level
      </p>
      <p className="text-base font-black text-brand">
        Grade point {uni.gp} · CGPA {uni.cgpa.toFixed(2)}
      </p>
      <p className="text-xs font-bold text-ink/60">
        {uni.passedDays === 0 && uni.gp >= 1 ? "Level complete!" : `${uni.passedDays}/${uni.needed} days passed at this level`}
      </p>
    </div>
  );
}

/** A full-screen moment: a new level, graduation, a promotion. */
export function CelebrationCard() {
  const c = useLifeStore((s) => s.celebration);
  const report = useLifeStore((s) => s.report);
  // Let the report card show first; the celebration follows when it's closed.
  if (!c || report) return null;
  const close = () => useLifeStore.getState().patch({ celebration: null });
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
      <div className="animate-pop w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl">
        <p className="text-6xl" aria-hidden>
          {c.emoji}
        </p>
        <h2 id="celebration-title" className="mt-1 text-2xl font-black text-brand">
          {c.title}
        </h2>
        <p className="mt-1 text-base text-ink/70">{c.text}</p>
        {c.lines && c.lines.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 rounded-2xl bg-sky p-3 text-left text-sm font-bold text-ink">
            {c.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={close}
          className="mt-4 min-h-12 w-full rounded-2xl bg-brand text-lg font-bold text-white shadow-[0_4px_0_0_var(--color-brand-dark)]"
        >
          Amazing!
        </button>
      </div>
    </div>
  );
}

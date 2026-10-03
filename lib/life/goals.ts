import type { CounterKey } from "./types";

export type GoalDef = {
  id: string;
  text: string;
  /** Daily counter that tracks progress, or "gradePoints". */
  counter: CounterKey | "gradePoints";
  target: number;
  reward: number;
};

export const goalDefs: GoalDef[] = [
  { id: "lessons2", text: "Attend 2 lessons", counter: "lessons", target: 2, reward: 400 },
  { id: "study2", text: "Study in the library twice", counter: "study", target: 2, reward: 300 },
  { id: "meal", text: "Eat a proper meal", counter: "meals", target: 1, reward: 200 },
  { id: "football", text: "Take a penalty shootout", counter: "football", target: 1, reward: 200 },
  { id: "sports2", text: "Play 2 sports matches", counter: "sports", target: 2, reward: 300 },
  { id: "hi3", text: "Say hi to 3 classmates", counter: "greetings", target: 3, reward: 300 },
  { id: "help", text: "Help a classmate with homework", counter: "helped", target: 1, reward: 400 },
  { id: "assembly", text: "Attend morning assembly", counter: "assembly", target: 1, reward: 300 },
  { id: "rest", text: "Take a rest in the common room", counter: "rest", target: 1, reward: 200 },
  { id: "gradeB", text: "Reach a B for today", counter: "gradePoints", target: 50, reward: 500 },
  { id: "work", text: "Work a part-time job", counter: "shifts", target: 1, reward: 200 },
  { id: "save", text: "Put some money in savings", counter: "saved", target: 1, reward: 200 },
  { id: "games", text: "Play a game in the Common Room", counter: "games", target: 1, reward: 200 },
  { id: "friends", text: "Do 2 things with classmates", counter: "friendActs", target: 2, reward: 300 },
];

export const GOALS_PER_DAY = 3;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Each student gets their own 3 goals per day, the same on every device. */
export function pickGoals(dayIndex: number, studentId: string): GoalDef[] {
  const ranked = [...goalDefs].sort((a, b) => hash(`${dayIndex}:${studentId}:${a.id}`) - hash(`${dayIndex}:${studentId}:${b.id}`));
  return ranked.slice(0, GOALS_PER_DAY);
}

export function getGoal(id: string): GoalDef | undefined {
  return goalDefs.find((g) => g.id === id);
}

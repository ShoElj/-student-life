import type { Metadata } from "next";

const title = "Student Life — a Nigerian university life game";
const description =
  "Start a university with your friends: pick a course, study from 100 Level to 400 Level, graduate and start your career. Earn and save Naira, play football and ten-ten, eat jollof and suya at the Food Court, buy your dream home and top the weekly leaderboard. Free, in the browser.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", url: "/life", siteName: "School Breaktime Battle" },
  twitter: { card: "summary_large_image", title, description },
};

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

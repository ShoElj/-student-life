import type { Metadata } from "next";

const title = "Student Life — a Nigerian school life game";
const description =
  "Start a school with your friends: go to class, earn and save Naira, play football and ten-ten, eat jollof and suya at the Food Court, buy your dream home and top the weekly leaderboard. Free, in the browser.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", url: "/life", siteName: "School Breaktime Battle" },
  twitter: { card: "summary_large_image", title, description },
};

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

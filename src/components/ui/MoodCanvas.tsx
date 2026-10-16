import type { ReactNode } from "react";

const canvases = {
  dreams: {
    image: "/moods/dreams-sky.jpg",
    wash: "linear-gradient(180deg, rgb(219 234 254 / 0.2), rgb(248 250 252 / 0.48) 38%, rgb(250 249 246 / 0.78))",
  },
  goals: {
    image: "/moods/goals-mountain.jpg",
    wash: "linear-gradient(180deg, rgb(224 231 255 / 0.22), rgb(250 249 246 / 0.52) 42%, rgb(250 249 246 / 0.8))",
  },
  journal: {
    image: "/moods/journal-desk.jpg",
    wash: "linear-gradient(180deg, rgb(250 246 239 / 0.38), rgb(250 249 246 / 0.7) 36%, rgb(250 249 246 / 0.86))",
  },
  habits: {
    image: "/moods/habits-nature.jpg",
    wash: "linear-gradient(180deg, rgb(220 239 224 / 0.22), rgb(250 249 246 / 0.58) 38%, rgb(250 249 246 / 0.82))",
  },
  experiences: {
    image: "/moods/experiences-travel.jpg",
    wash: "linear-gradient(180deg, rgb(250 244 232 / 0.26), rgb(250 249 246 / 0.58) 40%, rgb(250 249 246 / 0.82))",
  },
  lessons: {
    image: "/moods/lessons-books.jpg",
    wash: "linear-gradient(180deg, rgb(250 246 239 / 0.48), rgb(250 249 246 / 0.76) 40%, rgb(250 249 246 / 0.9))",
  },
  letters: {
    image: "/moods/letters-paper.jpg",
    wash: "linear-gradient(180deg, rgb(250 244 232 / 0.32), rgb(250 249 246 / 0.64) 40%, rgb(250 249 246 / 0.86))",
  },
  foundation: {
    image: "/moods/goals-mountain.jpg",
    wash: "linear-gradient(180deg, rgb(224 231 255 / 0.34), rgb(250 249 246 / 0.72) 38%, rgb(250 249 246 / 0.9))",
  },
  reviews: {
    image: "/moods/lessons-books.jpg",
    wash: "linear-gradient(180deg, rgb(250 246 239 / 0.58), rgb(250 249 246 / 0.78) 38%, rgb(250 249 246 / 0.92))",
  },
  couple: {
    image: "/moods/letters-paper.jpg",
    wash: "linear-gradient(180deg, rgb(250 244 232 / 0.48), rgb(250 249 246 / 0.76) 38%, rgb(250 249 246 / 0.92))",
  },
} as const;

export function MoodCanvas({
  mood,
  children,
}: {
  mood: keyof typeof canvases;
  children: ReactNode;
}) {
  const canvas = canvases[mood];

  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundColor: "#faf9f6",
        backgroundImage: `${canvas.wash}, url("${canvas.image}")`,
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {children}
    </div>
  );
}

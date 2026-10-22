import { prisma } from "@/lib/prisma";
import { calendarDateOnly } from "@/lib/dates";

/**
 * Move incomplete todos from past calendar days onto `forDate` (usually today).
 * Keeps title, times, reminders, goal links. Completed todos stay on their day.
 */
export async function rolloverIncompleteTodos(
  userId: string,
  forDate: Date = calendarDateOnly(),
): Promise<number> {
  const result = await prisma.todo.updateMany({
    where: {
      userId,
      completed: false,
      date: { lt: forDate },
    },
    data: {
      date: forDate,
    },
  });
  return result.count;
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as getEntries,
  POST as createEntry,
} from "@/app/api/entries/route";
import {
  DELETE as deleteEntry,
  GET as getEntry,
  PATCH as updateEntry,
} from "@/app/api/entries/[entryId]/route";
import { GET as getGoals, POST as createGoal } from "@/app/api/goals/route";
import {
  DELETE as deleteGoal,
  GET as getGoal,
  PATCH as updateGoal,
} from "@/app/api/goals/[goalId]/route";
import { canAccessSharedResource } from "@/lib/couple-access";
import { Visibility } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getCurrentDbUser: vi.fn(),
  prisma: {
    entry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    couple: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentDbUser: mocks.getCurrentDbUser,
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

const activeCouple = {
  id: "couple-a-b",
  partnerAId: "user-a",
  partnerBId: "user-b",
  status: "ACTIVE",
};

const entryRows = [
  {
    id: "entry-a-private",
    userId: "user-a",
    coupleId: null,
    visibility: "PRIVATE",
    content: "A private",
    createdAt: new Date("2026-09-27T10:00:00Z"),
  },
  {
    id: "entry-b-private",
    userId: "user-b",
    coupleId: null,
    visibility: "PRIVATE",
    content: "B private",
    createdAt: new Date("2026-09-27T11:00:00Z"),
  },
  {
    id: "entry-b-shared",
    userId: "user-b",
    coupleId: activeCouple.id,
    visibility: "SHARED_WITH_PARTNER",
    content: "B shared",
    createdAt: new Date("2026-09-27T12:00:00Z"),
  },
  {
    id: "entry-c-shared",
    userId: "user-c",
    coupleId: "another-couple",
    visibility: "SHARED_WITH_PARTNER",
    content: "C shared",
    createdAt: new Date("2026-09-27T13:00:00Z"),
  },
];

const goalRows = [
  {
    id: "goal-a-private",
    userId: "user-a",
    coupleId: null,
    visibility: "PRIVATE",
    title: "A goal",
    status: "ACTIVE",
  },
  {
    id: "goal-b-private",
    userId: "user-b",
    coupleId: null,
    visibility: "PRIVATE",
    title: "B private goal",
    status: "ACTIVE",
    actions: [],
  },
  {
    id: "goal-b-shared",
    userId: "user-b",
    coupleId: activeCouple.id,
    visibility: "SHARED_WITH_PARTNER",
    title: "B shared goal",
    status: "ACTIVE",
    actions: [],
  },
];

function request(path: string, body: unknown, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function matchesEntryWhere(
  row: (typeof entryRows)[number],
  where: Record<string, any>,
): boolean {
  if (!where) return true;
  if (where.OR && Array.isArray(where.OR)) {
    return where.OR.some((clause: Record<string, any>) =>
      matchesEntryWhere(row, clause),
    );
  }
  if (where.AND && Array.isArray(where.AND)) {
    return where.AND.every((clause: Record<string, any>) =>
      matchesEntryWhere(row, clause),
    );
  }
  if (typeof where.userId === "string") {
    if (row.userId !== where.userId) return false;
  } else if (where.userId && typeof where.userId === "object" && "not" in where.userId) {
    if (row.userId === where.userId.not) return false;
  }
  if (where.coupleId !== undefined && row.coupleId !== where.coupleId) return false;
  if (where.visibility !== undefined && row.visibility !== where.visibility) return false;
  if (where.id === "__none__") return false;
  return true;
}

function matchesGoalWhere(
  row: (typeof goalRows)[number],
  where: Record<string, any>,
): boolean {
  if (!where) return true;
  if (where.OR && Array.isArray(where.OR)) {
    return where.OR.some((clause: Record<string, any>) =>
      matchesGoalWhere(row, clause),
    );
  }
  if (typeof where.userId === "string") {
    if (row.userId !== where.userId) return false;
  } else if (where.userId && typeof where.userId === "object" && "not" in where.userId) {
    if (row.userId === where.userId.not) return false;
  }
  if (where.coupleId !== undefined && row.coupleId !== where.coupleId) return false;
  if (where.visibility !== undefined && row.visibility !== where.visibility) return false;
  if (where.id !== undefined && row.id !== where.id) return false;
  return true;
}

describe("entry privacy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentDbUser.mockResolvedValue({
      id: "user-a",
      email: "a@example.test",
    });
    mocks.prisma.couple.findFirst.mockImplementation(
      async ({ where }: { where: Record<string, any> }) => {
        const member = where.OR?.some(
          (clause: Record<string, string>) =>
            clause.partnerAId === "user-a" || clause.partnerBId === "user-a",
        );
        return where.id === activeCouple.id &&
          member &&
          where.status === "ACTIVE"
          ? activeCouple
          : where.id === undefined && member && where.status === "ACTIVE"
            ? activeCouple
            : null;
      },
    );
    mocks.prisma.entry.findMany.mockImplementation(
      async ({ where }: { where: Record<string, any> }) =>
        entryRows.filter((row) => matchesEntryWhere(row, where)),
    );
    mocks.prisma.entry.count.mockImplementation(
      async ({ where }: { where: Record<string, any> }) =>
        entryRows.filter((row) => matchesEntryWhere(row, where)).length,
    );
    mocks.prisma.entry.findFirst.mockImplementation(
      async ({ where }: { where: Record<string, any> }) =>
        entryRows.find(
          (row) =>
            row.id === where.id &&
            (where.userId
              ? row.userId === where.userId
              : row.visibility === where.visibility),
        ) ?? null,
    );
    mocks.prisma.entry.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => data,
    );
    mocks.prisma.entry.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.entry.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("returns a user's private entries but not another user's private entries", async () => {
    const response = await getEntries(
      new NextRequest("http://localhost/api/entries"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries.map((entry: { id: string }) => entry.id)).toContain(
      "entry-a-private",
    );
    expect(body.entries.map((entry: { id: string }) => entry.id)).not.toContain(
      "entry-b-private",
    );
  });

  it("shows only entries explicitly shared with the user's active couple", async () => {
    const response = await getEntries(
      new NextRequest("http://localhost/api/entries"),
    );
    const body = await response.json();
    const ids = body.entries.map((entry: { id: string }) => entry.id);

    expect(ids).toContain("entry-b-shared");
    expect(ids).not.toContain("entry-c-shared");
    expect(ids).not.toContain("entry-b-private");
  });

  it("does not let a partner read a private entry by ID", async () => {
    const response = await getEntry(
      new NextRequest("http://localhost/api/entries/entry-b-private"),
      { params: Promise.resolve({ entryId: "entry-b-private" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.couple.findFirst).not.toHaveBeenCalled();
  });

  it("allows an active couple member to read an explicitly shared entry", async () => {
    const response = await getEntry(
      new NextRequest("http://localhost/api/entries/entry-b-shared"),
      { params: Promise.resolve({ entryId: "entry-b-shared" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).entry.id).toBe("entry-b-shared");
    expect(mocks.prisma.couple.findFirst).toHaveBeenCalledWith({
      where: {
        id: activeCouple.id,
        status: "ACTIVE",
        OR: [{ partnerAId: "user-a" }, { partnerBId: "user-a" }],
      },
      select: { id: true },
    });
  });

  it("requires explicit sharing, active status, and membership in the resource's couple", async () => {
    expect(
      await canAccessSharedResource("user-a", {
        coupleId: activeCouple.id,
        visibility: Visibility.PRIVATE,
      }),
    ).toBe(false);
    expect(
      await canAccessSharedResource("user-c", {
        coupleId: activeCouple.id,
        visibility: Visibility.SHARED_WITH_PARTNER,
      }),
    ).toBe(false);
    expect(
      await canAccessSharedResource("user-a", {
        coupleId: "another-couple",
        visibility: Visibility.SHARED_WITH_PARTNER,
      }),
    ).toBe(false);
    expect(
      await canAccessSharedResource("user-a", {
        coupleId: activeCouple.id,
        visibility: Visibility.SHARED_WITH_PARTNER,
      }),
    ).toBe(true);
  });

  it("rejects client-supplied ownerId and coupleId instead of using them for authorization", async () => {
    const response = await createEntry(
      request("/api/entries", {
        content: "Attempted spoof",
        userId: "user-b",
        coupleId: "another-couple",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.entry.create).not.toHaveBeenCalled();
  });

  it("writes entry ownership and shared couple from the authenticated user and active relationship", async () => {
    const response = await createEntry(
      request("/api/entries", {
        content: "Explicitly shared",
        visibility: "SHARED_WITH_PARTNER",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.entry).toMatchObject({
      userId: "user-a",
      coupleId: activeCouple.id,
      visibility: "SHARED_WITH_PARTNER",
    });
    expect(mocks.prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-a",
          coupleId: activeCouple.id,
        }),
      }),
    );
  });

  it("does not allow a partner to modify or delete another user's entry", async () => {
    const patch = await updateEntry(
      request("/api/entries/entry-b-private", { content: "Changed" }, "PATCH"),
      { params: Promise.resolve({ entryId: "entry-b-private" }) },
    );
    const deletion = await deleteEntry(
      new NextRequest("http://localhost/api/entries/entry-b-private", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ entryId: "entry-b-private" }) },
    );

    expect(patch.status).toBe(404);
    expect(deletion.status).toBe(404);
    expect(mocks.prisma.entry.updateMany).not.toHaveBeenCalled();
    expect(mocks.prisma.entry.deleteMany).toHaveBeenCalledWith({
      where: { id: "entry-b-private", userId: "user-a" },
    });
  });
});

describe("goal privacy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentDbUser.mockResolvedValue({
      id: "user-a",
      email: "a@example.test",
    });
    mocks.prisma.couple.findFirst.mockResolvedValue(activeCouple);
    mocks.prisma.goal.findMany.mockImplementation(
      async ({ where }: { where: Record<string, any> }) =>
        goalRows.filter((row) => matchesGoalWhere(row, where)),
    );
    mocks.prisma.goal.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => data,
    );
    mocks.prisma.goal.findFirst.mockImplementation(
      async ({ where }: { where: { id: string; userId: string } }) =>
        goalRows.find(
          (goal) => goal.id === where.id && goal.userId === where.userId,
        ) ?? null,
    );
    mocks.prisma.goal.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("returns a user's goals and excludes another user's private goals", async () => {
    const response = await getGoals();
    const body = await response.json();
    const ids = body.goals.map((goal: { id: string }) => goal.id);

    expect(ids).toContain("goal-a-private");
    expect(ids).not.toContain("goal-b-private");
    expect(ids).not.toContain("goal-b-shared");
  });

  it("allows the owner to read their goal and denies another user, even for a shared goal", async () => {
    const ownGoal = await getGoal(
      new NextRequest("http://localhost/api/goals/goal-a-private"),
      { params: Promise.resolve({ goalId: "goal-a-private" }) },
    );
    expect(ownGoal.status).toBe(200);
    expect((await ownGoal.json()).goal.id).toBe("goal-a-private");

    const anotherUsersGoal = await getGoal(
      new NextRequest("http://localhost/api/goals/goal-b-shared"),
      { params: Promise.resolve({ goalId: "goal-b-shared" }) },
    );
    expect(anotherUsersGoal.status).toBe(404);
    expect(mocks.prisma.goal.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "goal-b-shared", userId: "user-a" },
      }),
    );
  });

  it("does not allow another user to update or delete a goal", async () => {
    const updateResponse = await updateGoal(
      request("/api/goals/goal-b-private", { currentValue: 10 }, "PATCH"),
      { params: Promise.resolve({ goalId: "goal-b-private" }) },
    );
    const deleteResponse = await deleteGoal(
      new NextRequest("http://localhost/api/goals/goal-b-private", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ goalId: "goal-b-private" }) },
    );

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(mocks.prisma.goal.update).not.toHaveBeenCalled();
    expect(mocks.prisma.goal.deleteMany).toHaveBeenCalledWith({
      where: { id: "goal-b-private", userId: "user-a" },
    });
  });

  it("rejects client-supplied goal ownership and couple fields", async () => {
    const response = await createGoal(
      request("/api/goals", {
        title: "Spoofed",
        area: "PERSONAL",
        type: "YES_NO",
        userId: "user-b",
        coupleId: "another-couple",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.goal.create).not.toHaveBeenCalled();
  });

  it("binds new goals to the authenticated owner and server-selected couple", async () => {
    const response = await createGoal(
      request("/api/goals", {
        title: "Shared goal",
        area: "PERSONAL",
        type: "YES_NO",
        visibility: "SHARED_WITH_PARTNER",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.goal).toMatchObject({
      userId: "user-a",
      coupleId: activeCouple.id,
    });
  });

  it("rejects ownership fields when updating a goal", async () => {
    const response = await updateGoal(
      request(
        "/api/goals/goal-a-private",
        { userId: "user-b", status: "COMPLETED" },
        "PATCH",
      ),
      { params: Promise.resolve({ goalId: "goal-a-private" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.goal.findFirst).not.toHaveBeenCalled();
  });
});

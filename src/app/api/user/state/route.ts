import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function safeParseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET() {
  const user = await getActiveServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let state = await prisma.userLearningState.findUnique({
    where: { userId: user.id },
  });

  if (!state) {
    state = await prisma.userLearningState.create({
      data: { userId: user.id },
    });
  }

  const rawProgress = safeParseJson<Record<string, unknown>>(
    state.progressJson,
    {}
  );
  const normalizedProgress =
    rawProgress &&
    typeof rawProgress === "object" &&
    "visited" in rawProgress &&
    typeof rawProgress.visited === "object"
      ? (rawProgress as { visited: Record<string, number>; last: string | null })
      : {
          visited: (rawProgress ?? {}) as Record<string, number>,
          last: safeParseJson<{ path?: string } | null>(
            state.lastLessonJson,
            null
          )?.path ?? null,
        };

  const reviewCards = safeParseJson<Record<string, unknown>>(
    state.reviewCardsJson,
    {}
  );

  return NextResponse.json({
    progress: normalizedProgress,
    review: reviewCards,
    reviewCards,
    interviewStatus: safeParseJson<Record<string, string>>(
      state.interviewStatusJson,
      {}
    ),
    lastLesson: safeParseJson<Record<string, unknown> | null>(
      state.lastLessonJson,
      null
    ),
    playgroundState: safeParseJson<Record<string, unknown>>(
      state.playgroundStateJson,
      {}
    ),
    updatedAt: state.updatedAt.toISOString(),
  });
}

export async function PUT(request: Request) {
  const user = await getActiveServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const current =
    (await prisma.userLearningState.findUnique({
      where: { userId: user.id },
    })) ??
    (await prisma.userLearningState.create({
      data: { userId: user.id },
    }));

  const rawExistingProgress = safeParseJson<Record<string, unknown>>(
    current.progressJson,
    {}
  );
  const existingVisited: Record<string, number> =
    rawExistingProgress &&
    typeof rawExistingProgress === "object" &&
    "visited" in rawExistingProgress &&
    typeof rawExistingProgress.visited === "object" &&
    rawExistingProgress.visited !== null
      ? (rawExistingProgress.visited as Record<string, number>)
      : ((rawExistingProgress ?? {}) as Record<string, number>);
  const existingLast: string | null =
    rawExistingProgress &&
    typeof rawExistingProgress === "object" &&
    "last" in rawExistingProgress &&
    typeof rawExistingProgress.last === "string"
      ? rawExistingProgress.last
      : null;

  const existingReviewCards = safeParseJson<
    Record<string, Record<string, unknown>>
  >(current.reviewCardsJson, {});
  const existingInterview = safeParseJson<Record<string, string>>(
    current.interviewStatusJson,
    {}
  );
  const existingLastLesson = safeParseJson<Record<string, unknown> | null>(
    current.lastLessonJson,
    null
  );
  const existingPlayground = safeParseJson<Record<string, unknown>>(
    current.playgroundStateJson,
    {}
  );

  let mergedVisited: Record<string, number> = { ...existingVisited };
  let mergedLast: string | null = existingLast;

  if (body.progress && typeof body.progress === "object") {
    const incomingVisited: Record<string, number> =
      "visited" in body.progress &&
      typeof body.progress.visited === "object" &&
      body.progress.visited !== null
        ? (body.progress.visited as Record<string, number>)
        : (body.progress as Record<string, number>);
    if (body.replaceProgress) {
      mergedVisited = { ...incomingVisited };
      mergedLast =
        typeof body.progress.last === "string" ? body.progress.last : null;
    } else {
      for (const [k, v] of Object.entries(incomingVisited)) {
        if (typeof v === "number") {
          mergedVisited[k] = Math.max(mergedVisited[k] ?? 0, v);
        }
      }
      if (typeof body.progress.last === "string") {
        mergedLast = body.progress.last;
      }
    }
  }

  const incomingReviewSource = body.reviewCards ?? body.review;
  let mergedReviewCards = existingReviewCards;
  if (
    body.replaceReviewCards &&
    incomingReviewSource &&
    typeof incomingReviewSource === "object"
  ) {
    mergedReviewCards = incomingReviewSource;
  } else if (incomingReviewSource && typeof incomingReviewSource === "object") {
    mergedReviewCards = { ...existingReviewCards };
    for (const [k, v] of Object.entries(
      incomingReviewSource as Record<string, Record<string, unknown>>
    )) {
      if (v && typeof v === "object") {
        const prev = existingReviewCards[k];
        const prevTs =
          typeof prev?.at === "number"
            ? prev.at
            : typeof prev?.last === "number"
            ? prev.last
            : 0;
        const nextTs =
          typeof v.at === "number"
            ? v.at
            : typeof v.last === "number"
            ? v.last
            : Date.now();
        if (!prev || nextTs >= prevTs) {
          mergedReviewCards[k] = v;
        }
      }
    }
  }

  let mergedInterview = existingInterview;
  if (
    body.replaceInterviewStatus &&
    body.interviewStatus &&
    typeof body.interviewStatus === "object"
  ) {
    mergedInterview = body.interviewStatus;
  } else if (body.interviewStatus && typeof body.interviewStatus === "object") {
    mergedInterview = {
      ...existingInterview,
      ...(body.interviewStatus as Record<string, string>),
    };
  }

  let mergedLastLesson = existingLastLesson;
  if (body.lastLesson !== undefined) {
    if (body.lastLesson === null) {
      mergedLastLesson = null;
    } else if (typeof body.lastLesson === "object") {
      mergedLastLesson = body.lastLesson;
    }
  }

  const mergedPlayground =
    body.playgroundState && typeof body.playgroundState === "object"
      ? { ...existingPlayground, ...body.playgroundState }
      : existingPlayground;

  const mergedProgressPayload = {
    visited: mergedVisited,
    last: mergedLast,
  };

  const updated = await prisma.userLearningState.update({
    where: { userId: user.id },
    data: {
      progressJson: JSON.stringify(mergedProgressPayload),
      reviewCardsJson: JSON.stringify(mergedReviewCards),
      interviewStatusJson: JSON.stringify(mergedInterview),
      lastLessonJson: JSON.stringify(mergedLastLesson),
      playgroundStateJson: JSON.stringify(mergedPlayground),
    },
  });

  return NextResponse.json({
    progress: mergedProgressPayload,
    review: mergedReviewCards,
    reviewCards: mergedReviewCards,
    interviewStatus: mergedInterview,
    lastLesson: mergedLastLesson,
    playgroundState: mergedPlayground,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

import { z } from "zod";

export const TimeframeSchema = z.enum(["today", "week", "month", "custom", "long_term"]);
export const CategorySchema = z.enum(["work", "health", "personal", "learning", "creative", "finance", "home", "other"]);
export const EnergySchema = z.enum(["light", "focused", "deep"]);

export const PlanRequestSchema = z.object({
  goalText: z.string().trim().min(2).max(400),
  timeframe: TimeframeSchema.optional(),
  deadline: z.number().int().positive().optional(),
  clarificationAnswer: z.string().max(80).optional(),
  now: z.number().int().positive(),
});
export type PlanRequestInput = z.infer<typeof PlanRequestSchema>;

/** What the model must return. Mirrors @sprint/core PlanDraft minus server-owned fields. */
export const ModelPlanSchema = z.object({
  title: z.string().min(2).max(60),
  objective: z.string().min(2).max(160),
  category: CategorySchema,
  explanation: z.string().min(10).max(320),
  milestones: z
    .array(
      z.object({
        title: z.string().min(2).max(40),
        sprints: z
          .array(
            z.object({
              title: z.string().min(3).max(80),
              detail: z.string().max(160).optional(),
              durationMin: z.number().int().min(5).max(90),
              energy: EnergySchema,
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .min(2)
    .max(7),
  clarification: z
    .object({
      question: z.string().min(5).max(120),
      options: z
        .array(z.object({ label: z.string().min(1).max(30), value: z.string().min(1).max(30) }))
        .min(2)
        .max(4),
    })
    .optional(),
});
export type ModelPlan = z.infer<typeof ModelPlanSchema>;

export const ReflectRequestSchema = z.object({
  sprintsCompleted: z.number().int().min(0),
  focusedMinutes: z.number().int().min(0),
  missions: z.array(z.object({ title: z.string().max(80), progress: z.number().min(0).max(1), completed: z.boolean() })).max(20),
  activeDays: z.number().int().min(0).max(7),
  now: z.number().int().positive(),
});

export const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(400),
});

export const ImageRequestSchema = z.object({
  missionTitle: z.string().trim().min(1).max(80),
  objective: z.string().trim().min(1).max(200),
  category: CategorySchema,
});

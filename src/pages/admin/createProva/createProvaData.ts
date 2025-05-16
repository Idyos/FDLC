import { PenyaInfo, ProvaType, provaTypes, WinDirection } from "@/interfaces/interfaces";
import { z } from "zod";

export interface ParticipatingPenya {
  penya: {penyaId: string; name: string};
  participates: boolean;
}

export const fieldStepMap: Record<keyof CreateChallenge, number> = {
  name: 0,
  description: 0,
  location: 0,
  startDate: 0,
  endDate: 0,
  challengeType: 1,
  winDirection: 1,
  penyes: 1,
  pointsRange: 2,
};

export const createChallengeSchema = z.object({
  name: z
    .string({
      required_error: "El nom és obligatori",
      invalid_type_error: "El nom ha de ser una cadena de text",
    })
    .min(5, "El nom ha de tenir almenys 2 caràcters"),

  description: z
    .string({
      required_error: "La descripció és obligatòria",
      invalid_type_error: "La descripció ha de ser una cadena de text",
    })
    .optional(),

  location: z
    .object({
      lat: z.union([z.number(), z.null()]),
      lng: z.union([z.number(), z.null()]),
      name: z.union([z.string(), z.null()]),
    })
    .optional(),


  startDate: z.date({
      required_error: "La data d'inici és obligatòria",
      invalid_type_error: "La data d'inici ha de ser una cadena de text",
      }),
  endDate: z.date().optional(),

  challengeType: z.enum(provaTypes, {
    required_error: "El tipus de prova és obligatori",
    invalid_type_error: "Tipus de prova no vàlid",
  }),

  winDirection: z.enum(["ASC", "DESC"], {
    required_error: "La direcció de guany és obligatòria",
    invalid_type_error: "Direcció de guany no vàlida",
  }),

  penyes: z
  .array(
    z.object({
      penya: z.object({
        id: z.string(),
        name: z.string(),
      }),
      participates: z.boolean(),
    })
  )
  .optional(),

  pointsRange: z
    .array(
      z.object({
        from: z
          .number()
          .min(1, "La posició inicial ha de ser un número positiu"),
        to: z.number().min(1, "La posició final ha de ser un número positiu"),
        points: z.number().min(0, "Els punts han de ser un número positiu"),
      })
    )
    .refine((data) => {
      const sorted = [...data].sort((a, b) => a.from - b.from);
      return data.length === new Set(sorted.map((item) => item.from)).size;
    }, "Les posicions inicials no poden repetir-se"),
}).superRefine((data, ctx) => {
  const tiposQueRequierenWinDirection: ProvaType[] = ["Punts", "Temps"];
  const direccionsValides: WinDirection[] = ["ASC", "DESC"];

  if (tiposQueRequierenWinDirection.includes(data.challengeType)) {
    if (!data.winDirection || !direccionsValides.includes(data.winDirection)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["winDirection"],
        message: "Has d'especificar una forma de guanyar",
      });
    }
  }
});


export type CreateChallenge = z.infer<typeof createChallengeSchema>;

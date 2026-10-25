import z from "zod";

export const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,50}@[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^\d{10,15}$/;

export const upiId = (message = "Invalid UPI ID") =>
  z.string().trim().regex(UPI_REGEX, { message });

export const generateLinkSchema = z
  .object({
    pa: upiId(),
    am: z.union([z.string(), z.number()]),
    pn: z.string().optional(),
    tn: z.string().optional(),
    ct: z.enum(["email", "whatsapp"]),
    ci: z.string().min(1, "Contact info is required"),
    ra: upiId().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ct === "whatsapp") {
      // Validate that `ci` is a valid phone number format for WhatsApp
      if (!PHONE_REGEX.test(data.ci)) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid phone number for WhatsApp",
          path: ["ci"],
        });
      }
    } else if (data.ct === "email") {
      // Validate that `ci` is a valid email address
      if (!z.email().safeParse(data.ci).success) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid email address",
          path: ["ci"],
        });
      }
    }
  });

export const verifyLinkSchema = generateLinkSchema.extend({
  sig: z.string().min(1, "Signature is required"),
});

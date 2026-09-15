"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { StaffRole } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(StaffRole),
});

export type CreateStaffState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof createStaffSchema>, string[]>>;
};

export async function createStaffUser(_prevState: CreateStaffState, formData: FormData): Promise<CreateStaffState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to manage staff." };
  }

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  let created;
  try {
    created = await prisma.staffUser.create({
      data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A staff account with this email already exists." };
    }
    throw error;
  }

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "StaffUser", entityId: created.id, changes: { email: created.email, role: created.role } });

  revalidatePath("/admin/staff");
  return {};
}

const updateStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name."),
  role: z.enum(StaffRole),
  active: z.boolean(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
});

export type UpdateStaffState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof updateStaffSchema>, string[]>>;
};

export async function updateStaffUser(id: string, _prevState: UpdateStaffState, formData: FormData): Promise<UpdateStaffState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to manage staff." };
  }

  const parsed = updateStaffSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    active: formData.get("active") === "on",
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (id === staffUser.id && !parsed.data.active) {
    return { error: "You cannot deactivate your own account." };
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  const updated = await prisma.staffUser.update({
    where: { id },
    data: { ...rest, ...(passwordHash ? { passwordHash } : {}) },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "StaffUser", entityId: updated.id, changes: { role: updated.role, active: updated.active } });

  revalidatePath("/admin/staff");
  return {};
}

export async function getStaffUsers() {
  await requireStaffRole(["ADMINISTRATOR"]);
  return prisma.staffUser.findMany({ orderBy: { createdAt: "asc" } });
}

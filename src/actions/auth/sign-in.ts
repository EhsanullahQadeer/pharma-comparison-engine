"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type SignInState = { error?: string };

export async function staffSignIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }
  return {};
}

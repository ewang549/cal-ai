"use server";

import { signIn, signOut } from "@/auth";

/**
 * Server actions for auth flows. Living in a dedicated "use server" file
 * means client components can import them too — inline server actions
 * (the `() => { "use server"; ... }` pattern) are only allowed inside
 * server components.
 */

export async function signInWithGoogleAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

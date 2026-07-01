"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root page — acts as an auth-aware gate.
 *
 * Server-side redirect is gone because localStorage is browser-only.
 * This component mounts, checks for a stored JWT, and routes immediately.
 * The flash is invisible in practice because it's a same-tick redirect.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const role = localStorage.getItem("role");

    if (!token) {
      // No token at all → go to login
      router.replace("/login");
      return;
    }

    // Token exists → route to the right dashboard based on stored role
    if (role === "ADMIN") {
      router.replace("/dashboard"); // TODO: swap for "/fleet-dashboard" when built
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  // Render nothing — the useEffect fires before the user sees anything
  return null;
}

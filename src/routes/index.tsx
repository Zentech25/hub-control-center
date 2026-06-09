import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      throw redirect({ to: getSession() ? "/dashboard" : "/login" });
    }
  },
  component: () => null,
});

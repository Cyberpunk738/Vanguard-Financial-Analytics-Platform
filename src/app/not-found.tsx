import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/shared/Brand";
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <Brand />
      <span className="section-pill">404 / A small detour</span>
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
        Let’s get you back on track.
      </h1>
      <p className="text-muted-foreground max-w-md">
        This page could not be found. Your next financial insight starts at
        home.
      </p>
      <a href="/" className="button button-lime">
        <ArrowLeft size={18} />
        Back to Vanguard
      </a>
    </main>
  );
}

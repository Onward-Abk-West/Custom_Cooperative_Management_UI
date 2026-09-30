"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { getUmbrella } from "@/lib/api/umbrella";
import { createSociety } from "@/lib/api/societies";

/**
 * POST /api/v1/developer-superadmin/societies — Developer Superadmin
 * only per the backend's [Authorize]. There's exactly one umbrella in
 * this domain model (DeveloperSuperadminUmbrellasController.GET has no
 * id parameter — it returns "the" umbrella), so this fetches it once
 * to get the umbrellaId a new society is created under, rather than
 * asking the person filling this form to know or paste that GUID.
 */
export default function NewSocietyPage() {
  const router = useRouter();
  const [umbrellaId, setUmbrellaId] = useState<string | null>(null);
  const [umbrellaError, setUmbrellaError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUmbrella()
      .then((response) => {
        if (!response.success || !response.data) {
          setUmbrellaError(
            response.message ||
              "The umbrella has not been provisioned yet — a society can't be created without one."
          );
          return;
        }
        setUmbrellaId(response.data.id);
      })
      .catch((err) => {
        setUmbrellaError(
          err instanceof ApiError ? err.message || "The umbrella could not be loaded." : "Could not reach the server."
        );
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!umbrellaId) return;
    if (!name.trim()) {
      setError("Enter a society name.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await createSociety(umbrellaId, name.trim());
      if (!response.success || !response.data) {
        setError(response.message || "The society could not be created.");
        return;
      }
      router.push(`/societies/${response.data.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "The society could not be created." : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link href="/societies" className="text-sm font-medium text-brand-gold-dark hover:underline">
          ← All societies
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-bold text-brand-ink">New society</h1>
      </div>

      {umbrellaError ? (
        <p role="alert" className="text-sm text-red-600">
          {umbrellaError}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-brand-line bg-surface-card p-5">
          <Input
            id="society-name"
            label="Society name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Abeokuta Central Cooperative"
            disabled={!umbrellaId}
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || !umbrellaId}>
            {submitting ? "Creating…" : umbrellaId ? "Create society" : "Loading umbrella…"}
          </Button>
        </form>
      )}
    </div>
  );
}

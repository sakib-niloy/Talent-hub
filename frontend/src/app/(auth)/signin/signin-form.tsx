"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, useSignin } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/api/client";
import { safeNext } from "@/lib/format";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export function SigninForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const oauthError = params.get("error") === "oauth";
  const router = useRouter();
  const { user } = useMe();
  const signin = useSignin();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const onSubmit = form.handleSubmit((values) => signin.mutate(values, { onSuccess: () => router.replace(next) }));

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-4xl tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to like, comment, follow and share your work.</p>
      </div>

      {oauthError ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Google sign-in didn&apos;t work. Please try again or use your email and password.
        </p>
      ) : null}

      <GoogleButton next={next} />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
            {...form.register("email")}
          />
          <p id="email-error" className="text-xs text-destructive">
            {errors.email?.message}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby="password-error"
            {...form.register("password")}
          />
          <p id="password-error" className="text-xs text-destructive">
            {errors.password?.message}
          </p>
        </div>

        {signin.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(signin.error)}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={signin.isPending}>
          {signin.isPending ? <Loader2 className="animate-spin" /> : null} Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to TalentHub?{" "}
        <Link href={`/signup${next !== "/feed" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

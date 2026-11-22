"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, useSignup } from "@/hooks/use-auth";
import { ApiError, errorMessage } from "@/lib/api/client";
import { safeNext } from "@/lib/format";

const schema = z
  .object({
    name: z.string().trim().min(1, "Tell us your name").max(100, "Name must be at most 100 characters"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters").max(128, "Password must be at most 128 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
type Values = z.infer<typeof schema>;
type Field = keyof Values;

export function SignupForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const { user } = useMe();
  const signup = useSignup();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const onSubmit = form.handleSubmit(({ name, email, password }) =>
    signup.mutate(
      { name, email, password },
      {
        onSuccess: (u) => {
          toast.success(`Welcome to TalentHub, ${u.name.split(" ")[0]}!`);
          router.replace(next);
        },
        onError: (e) => {
          // Map server field errors onto the form when provided.
          if (e instanceof ApiError && e.errors?.length) {
            for (const fe of e.errors) {
              if (["name", "email", "password"].includes(fe.path)) form.setError(fe.path as Field, { message: fe.message });
            }
          }
        },
      },
    ),
  );

  const field = (id: Field, label: string, type: string, autoComplete: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!errors[id]}
        aria-describedby={`${id}-error`}
        {...form.register(id)}
      />
      <p id={`${id}-error`} className="text-xs text-destructive">
        {errors[id]?.message}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-4xl tracking-tight">Join TalentHub</h1>
        <p className="text-sm text-muted-foreground">Share your photos, music and videos with a community that cares.</p>
      </div>

      <GoogleButton next={next} />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field("name", "Name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("confirm", "Confirm password", "password", "new-password")}

        {signup.isError && !(signup.error instanceof ApiError && signup.error.errors?.length) ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(signup.error)}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full bg-brand text-white hover:opacity-90" disabled={signup.isPending}>
          {signup.isPending ? <Loader2 className="animate-spin" /> : null} Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/signin${next !== "/feed" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

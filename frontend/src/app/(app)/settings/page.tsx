"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { RequireAuth } from "@/components/require-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useUpdateMe } from "@/hooks/use-social";
import { errorMessage } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/api/types";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  bio: z.string().trim().max(300, "Bio must be at most 300 characters"),
});
type Values = z.infer<typeof schema>;

function SettingsForm({ user }: { user: CurrentUser }) {
  const update = useUpdateMe();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, bio: user.bio ?? "" },
  });
  const { errors, isDirty } = form.formState;
  const bioLength = useWatch({ control: form.control, name: "bio" })?.length ?? 0;

  const onSubmit = form.handleSubmit((values) =>
    update.mutateAsync(values).then(
      (u) => {
        form.reset({ name: u.name, bio: u.bio ?? "" });
        toast.success("Profile updated");
      },
      (e) => toast.error(errorMessage(e)),
    ),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-heading text-4xl tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage how you appear on TalentHub.</p>
      </header>

      <form onSubmit={onSubmit} className="surface space-y-5 p-5" noValidate>
        <div className="flex items-center gap-4">
          <UserAvatar user={user} className="size-16 text-lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">@{user.handle}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <Link href={`/u/${user.handle}`} className="text-sm text-primary hover:underline">
              View public profile
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby="name-error" {...form.register("name")} />
          <p id="name-error" className="text-xs text-destructive">
            {errors.name?.message}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{bioLength}/300</span>
          </div>
          <Textarea
            id="bio"
            rows={4}
            placeholder="Photographer, producer, filmmaker… tell people what you make."
            aria-invalid={!!errors.bio}
            aria-describedby="bio-error"
            {...form.register("bio")}
          />
          <p id="bio-error" className="text-xs text-destructive">
            {errors.bio?.message}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={!isDirty || update.isPending} onClick={() => form.reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {update.isPending ? <Loader2 className="animate-spin" /> : null} Save changes
          </Button>
        </div>
      </form>

      <section className="surface flex items-center justify-between p-5" aria-labelledby="appearance">
        <div>
          <h2 id="appearance" className="font-semibold">
            Appearance
          </h2>
          <p className="text-sm text-muted-foreground">Light, dark, or follow your system.</p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return <RequireAuth>{(user) => <SettingsForm user={user} />}</RequireAuth>;
}

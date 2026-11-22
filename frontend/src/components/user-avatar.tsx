import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicUser } from "@/lib/api/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-indigo-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-fuchsia-500 to-rose-500",
  "from-emerald-500 to-sky-500",
  "from-amber-500 to-rose-500",
  "from-violet-500 to-cyan-500",
];

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<PublicUser, "id" | "name" | "avatarUrl">;
  className?: string;
}) {
  const gradient = GRADIENTS[Math.abs(user.id) % GRADIENTS.length];
  return (
    <Avatar className={cn("size-9", className)}>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
      <AvatarFallback className={cn("bg-gradient-to-br font-semibold text-white", gradient)}>
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

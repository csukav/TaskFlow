import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { getInitials } from "@/lib/utils";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user!.id)
    .limit(1);
  const member = memberRows?.[0] ?? null;

  const { data: members } = await supabase
    .from("workspace_members")
    .select("*, profile:profiles!workspace_members_user_id_fkey(*)")
    .eq("workspace_id", member?.workspace_id ?? "")
    .order("created_at");

  const isOwnerOrAdmin = member?.role === "owner" || member?.role === "admin";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-muted-foreground">
          Manage members of your workspace
        </p>
      </div>

      {isOwnerOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
            <CardDescription>
              Send an invitation to join your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm workspaceId={member?.workspace_id ?? ""} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members?.length ?? 0} member(s) in this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {members?.map((m) => {
            const name = m.profile?.full_name ?? m.profile?.email ?? "Unknown";
            return (
              <div
                key={m.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.profile?.email}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={m.role === "owner" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {m.role}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

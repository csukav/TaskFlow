import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectBoard } from "@/components/project/project-board";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const { data: members } = await supabase
    .from("project_members")
    .select("*, profile:profiles!project_members_user_id_fkey(*)")
    .eq("project_id", id);

  return (
    <ProjectBoard
      project={project}
      initialTasks={tasks ?? []}
      members={members ?? []}
      currentUserId={user!.id}
    />
  );
}

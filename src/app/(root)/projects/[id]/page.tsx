import { ProjectView } from "@/components/project/project-view";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return <ProjectView projectId={id} />;
}

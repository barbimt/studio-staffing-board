import type { CapacityProject } from "@/server/capacity/calculate-capacity";

export function ProjectList({ projects }: { projects: CapacityProject[] }) {
  if (projects.length === 0) {
    return <span className="text-muted-foreground">No projects</span>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {projects.map((project) => (
        <li key={project.id}>
          <span className="bg-muted text-foreground inline-flex rounded-md px-2 py-0.5">
            {project.name} · {project.allocationPercentage}%
          </span>
        </li>
      ))}
    </ul>
  );
}

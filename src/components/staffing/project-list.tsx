import { Badge } from "@/components/ui/badge";
import { projectAccentColor } from "@/lib/project-accent";
import type { CapacityProject } from "@/server/capacity/calculate-capacity";

export function ProjectList({ projects }: { projects: CapacityProject[] }) {
  if (projects.length === 0) {
    return <span className="text-muted-foreground">No projects</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {projects.map((project) => (
        <li key={project.id}>
          <Badge variant="outline" className="font-normal">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: projectAccentColor(project.id),
              }}
              aria-hidden="true"
            />
            {project.name} {project.allocationPercentage}%
          </Badge>
        </li>
      ))}
    </ul>
  );
}

import { Badge } from "@/components/ui/badge";
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
                backgroundColor: `oklch(0.55 0.14 ${(project.id * 137.508) % 360})`,
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

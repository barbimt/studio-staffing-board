import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import type { CapacityProject } from "@/server/capacity/calculate-capacity";

const GOLDEN_ANGLE = 137.508;

function projectDotStyle(projectId: number): CSSProperties {
  const hue = (projectId * GOLDEN_ANGLE) % 360;

  return {
    backgroundColor: `oklch(0.55 0.14 ${hue})`,
  };
}

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
              style={projectDotStyle(project.id)}
              aria-hidden="true"
            />
            {project.name} {project.allocationPercentage}%
          </Badge>
        </li>
      ))}
    </ul>
  );
}

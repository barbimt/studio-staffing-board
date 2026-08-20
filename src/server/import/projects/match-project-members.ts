import {
  normalizePersonName,
  ProjectsImportError,
  type ImportedProject,
} from "./projects.schema";

export type CanonicalPerson = {
  id: number;
  firstName: string;
  lastName: string;
};

export type ResolvedAssignment = {
  personId: number;
  allocationPercentage: number;
};

export type ResolvedProject = Omit<ImportedProject, "assignments"> & {
  assignments: ResolvedAssignment[];
};

function canonicalFullName(person: CanonicalPerson): string {
  return normalizePersonName(`${person.firstName} ${person.lastName}`);
}

function peopleByNormalizedName(
  people: CanonicalPerson[],
): Map<string, CanonicalPerson[]> {
  const lookup = new Map<string, CanonicalPerson[]>();

  for (const person of people) {
    const key = canonicalFullName(person);
    const matches = lookup.get(key) ?? [];
    matches.push(person);
    lookup.set(key, matches);
  }

  return lookup;
}

export function matchProjectMembers(
  projects: ImportedProject[],
  people: CanonicalPerson[],
): ResolvedProject[] {
  const lookup = peopleByNormalizedName(people);
  const errors: string[] = [];
  const resolved: ResolvedProject[] = [];

  for (const project of projects) {
    const assignments: ResolvedAssignment[] = [];

    for (const assignment of project.assignments) {
      const matches =
        lookup.get(normalizePersonName(assignment.personName)) ?? [];

      if (matches.length === 0) {
        errors.push(
          `Project "${project.name}": team member "${assignment.personName}" could not be matched to a canonical person`,
        );
        continue;
      }

      if (matches.length > 1) {
        errors.push(
          `Project "${project.name}": team member "${assignment.personName}" matches multiple canonical people`,
        );
        continue;
      }

      const [person] = matches;
      assignments.push({
        personId: person.id,
        allocationPercentage: assignment.allocationPercentage,
      });
    }

    resolved.push({
      name: project.name,
      status: project.status,
      client: project.client,
      platform: project.platform,
      startDate: project.startDate,
      endDate: project.endDate,
      assignments,
    });
  }

  if (errors.length > 0) {
    throw new ProjectsImportError(errors);
  }

  return resolved;
}

export function projectAccentColor(projectId: number): string {
  return `oklch(0.55 0.14 ${(projectId * 137.508) % 360})`;
}

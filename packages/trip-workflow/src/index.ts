export function calculateTaskProgress(totalTasks: number, completedTasks: number): number {
  if (totalTasks <= 0) {
    return 0;
  }
  return Math.round((completedTasks / totalTasks) * 100);
}

export function isExecutableTask(status: string): boolean {
  return status === 'pending' || status === 'in_progress';
}

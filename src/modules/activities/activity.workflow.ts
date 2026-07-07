/**
 * Ve fázi 1 zapisují timeline přímo služby (deal.service, project.service) přes activityService.writeTimeline
 * — activityService je jediný zapisovač. Samostatné projekční subscribery (event → timeline) nejsou potřeba.
 * Až přibudou externí zdroje (email sync, Git, webhooky, fáze 3), přidají se sem subscribery na integration eventy.
 */
export function registerActivityWorkflows(): void {
  // zatím prázdné — timeline se plní přímo ve službách
}

/**
 * Port pro kalendář (fáze 3). Meetingy → TimelineEvent(meeting_held) + příprava na account review.
 * google-calendar.adapter je placeholder.
 */
export interface CalendarEvent {
  externalId: string;
  title: string;
  startAt: string;
  endAt: string;
  attendees: string[];   // emaily → párování na Contact
}

export interface CalendarPort {
  listUpcoming(userId: string, days: number): Promise<CalendarEvent[]>;
  watch?(cb: (e: CalendarEvent) => Promise<void>): Promise<void>;
}

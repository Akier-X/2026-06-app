export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string; // ISO date
  reminderTime?: string; // HH:MM format, undefined = no reminder
  archived?: boolean; // true = hidden from today tab
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string; // ISO date
}

export type MoodValue = 1 | 2 | 3 | 4 | 5;

export interface UserProfile {
  name: string;
  goal: string;
  onboardingDone: boolean;
  moodReminderTime?: string; // HH:MM, undefined = disabled
  weeklyNotificationEnabled?: boolean;
  weeklyNotificationTime?: string; // HH:MM, Sunday notification time
}

export interface CoachContext {
  name: string;
  goal: string;
  habitSummary: string;
  moodSummary: string;
}

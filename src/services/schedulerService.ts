// Scheduler Service for Campaign Management
import { Campaign } from '../types';

class SchedulerService {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private repeatTasks: Map<string, NodeJS.Timeout> = new Map();

  // Schedule a single campaign
  scheduleCampaign(campaign: Campaign, callback: () => void): void {
    const now = new Date();
    const scheduledTime = new Date(campaign.scheduledDate);
    
    if (scheduledTime <= now) {
      // If time has passed, execute immediately
      callback();
      return;
    }

    const delay = scheduledTime.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      callback();
      this.scheduledTasks.delete(campaign.id);
    }, delay);

    this.scheduledTasks.set(campaign.id, timeoutId);
  }

  // Schedule a repeating campaign
  scheduleRepeatingCampaign(
    campaign: Campaign, 
    repeatType: 'daily' | 'weekly' | 'custom',
    repeatInterval: number,
    repeatDays: number[],
    callback: () => void,
    repeatEndDate?: Date
  ): void {
    const scheduleNext = () => {
      const now = new Date();
      let nextRun = new Date(campaign.scheduledDate);

      switch (repeatType) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + repeatInterval);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + (repeatInterval * 7));
          break;
        case 'custom':
          // Find next matching day
          const currentDay = nextRun.getDay();
          const sortedDays = repeatDays.sort((a, b) => a - b);
          let nextDay = sortedDays.find(day => day > currentDay);
          
          if (!nextDay) {
            // Next week
            nextDay = sortedDays[0];
            nextRun.setDate(nextRun.getDate() + (7 - currentDay + nextDay));
          } else {
            nextRun.setDate(nextRun.getDate() + (nextDay - currentDay));
          }
          break;
      }

      // Check if we should stop repeating
      if (repeatEndDate && nextRun > repeatEndDate) {
        this.repeatTasks.delete(campaign.id);
        return;
      }

      const delay = nextRun.getTime() - now.getTime();
      
      const timeoutId = setTimeout(() => {
        callback();
        // Schedule the next occurrence
        scheduleNext();
      }, delay);

      this.repeatTasks.set(campaign.id, timeoutId);
    };

    scheduleNext();
  }

  // Cancel a scheduled campaign
  cancelCampaign(campaignId: string): void {
    const scheduledTask = this.scheduledTasks.get(campaignId);
    if (scheduledTask) {
      clearTimeout(scheduledTask);
      this.scheduledTasks.delete(campaignId);
    }

    const repeatTask = this.repeatTasks.get(campaignId);
    if (repeatTask) {
      clearTimeout(repeatTask);
      this.repeatTasks.delete(campaignId);
    }
  }

  // Get all scheduled campaigns
  getScheduledCampaigns(): string[] {
    return Array.from(this.scheduledTasks.keys());
  }

  // Get all repeating campaigns
  getRepeatingCampaigns(): string[] {
    return Array.from(this.repeatTasks.keys());
  }

  // Clear all scheduled tasks
  clearAll(): void {
    this.scheduledTasks.forEach(timeout => clearTimeout(timeout));
    this.repeatTasks.forEach(timeout => clearTimeout(timeout));
    this.scheduledTasks.clear();
    this.repeatTasks.clear();
  }

  // Get time until next execution
  getTimeUntilNext(campaignId: string): number | null {
    const scheduledTask = this.scheduledTasks.get(campaignId);
    if (scheduledTask) {
      // This is a simplified version - in reality you'd need to track the actual scheduled time
      return 0; // Placeholder
    }
    return null;
  }

  // Validate schedule data
  validateSchedule(scheduledDate: string, scheduledTime: string): { valid: boolean; error?: string } {
    const now = new Date();
    const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduled <= now) {
      return { valid: false, error: 'תאריך השליחה חייב להיות בעתיד' };
    }

    if (scheduled.getTime() - now.getTime() > 30 * 24 * 60 * 60 * 1000) { // 30 days
      return { valid: false, error: 'לא ניתן לתזמן הודעות יותר מ-30 יום מראש' };
    }

    return { valid: true };
  }

  // Get suggested times based on event date
  getSuggestedTimes(eventDate: Date): Array<{ label: string; value: string; description: string }> {
    const suggestions = [
      {
        label: 'שבוע לפני האירוע',
        value: this.getDateString(new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000), '10:00'),
        description: 'תזכורת שבועית'
      },
      {
        label: '3 ימים לפני האירוע',
        value: this.getDateString(new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000), '14:00'),
        description: 'תזכורת קצרה'
      },
      {
        label: 'יום לפני האירוע',
        value: this.getDateString(new Date(eventDate.getTime() - 24 * 60 * 60 * 1000), '18:00'),
        description: 'תזכורת אחרונה'
      },
      {
        label: 'יום האירוע',
        value: this.getDateString(eventDate, '09:00'),
        description: 'הודעת בוקר'
      }
    ];

    return suggestions.filter(suggestion => {
      const suggestedDate = new Date(suggestion.value);
      return suggestedDate > new Date();
    });
  }

  private getDateString(date: Date, time: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T${time}`;
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;

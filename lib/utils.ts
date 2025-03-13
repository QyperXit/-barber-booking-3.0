import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(date: Date | string | number | undefined): string {
  if (date === undefined) return 'No date';
  
  let dateObj: Date;
  try {
    if (typeof date === 'string') {
      // Handle numeric strings
      if (!isNaN(Number(date))) {
        dateObj = new Date(Number(date));
      } else {
        dateObj = new Date(date);
      }
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", e, date);
    return 'Invalid date';
  }
}

// Format date for storage - ensures consistent date format for database
export function formatDateForStorage(date: Date | string | number): string {
  let dateObj: Date;
  
  try {
    if (typeof date === 'string') {
      // Handle numeric strings
      if (!isNaN(Number(date))) {
        dateObj = new Date(Number(date));
      } else {
        dateObj = new Date(date);
      }
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    // Return ISO date string (YYYY-MM-DD)
    return dateObj.toISOString().split('T')[0];
  } catch (e) {
    console.error("Error formatting date for storage:", e, date);
    return new Date().toISOString().split('T')[0]; // Default to today as fallback
  }
}

// Parse any possible date format to Date object
export function parseAnyDate(dateValue: string | number | Date): Date {
  try {
    if (typeof dateValue === 'string') {
      // Check if it's a timestamp string
      if (!isNaN(Number(dateValue))) {
        return new Date(Number(dateValue));
      }
      return new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    return dateValue;
  } catch (e) {
    console.error("Error parsing date:", e, dateValue);
    return new Date(); // Default to now
  }
}

// Helper function to safely format a slot's date and time for display
export function formatSlotDateTime(date: string | number | undefined, minutes: number | undefined): string {
  try {
    let dateStr = 'No date';
    if (date !== undefined) {
      try {
        if (typeof date === 'string' && !isNaN(Number(date))) {
          dateStr = formatDate(new Date(Number(date)));
        } else if (typeof date === 'number') {
          dateStr = formatDate(new Date(date));
        } else {
          dateStr = formatDate(new Date(date));
        }
      } catch (e) {
        console.error("Error formatting slot date:", e, date);
        dateStr = 'Invalid date';
      }
    }
    
    const timeStr = formatTime(minutes);
    return `${dateStr} at ${timeStr}`;
  } catch (e) {
    console.error("Error formatting slot date and time:", e);
    return "Invalid date/time";
  }
}

export function formatTime(minutes: number | undefined): string {
  if (minutes === undefined) return 'No time';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
} 
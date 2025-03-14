import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { formatDate, formatTime } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';

interface AvailabilityProps {
  barberId: Id<"barbers">;
}

const timeSlots = [
  { label: '9:00 AM', value: 9 * 60 },
  { label: '9:30 AM', value: 9 * 60 + 30 },
  { label: '10:00 AM', value: 10 * 60 },
  { label: '10:30 AM', value: 10 * 60 + 30 },
  { label: '11:00 AM', value: 11 * 60 },
  { label: '11:30 AM', value: 11 * 60 + 30 },
  { label: '12:00 PM', value: 12 * 60 },
  { label: '12:30 PM', value: 12 * 60 + 30 },
  { label: '1:00 PM', value: 13 * 60 },
  { label: '1:30 PM', value: 13 * 60 + 30 },
  { label: '2:00 PM', value: 14 * 60 },
  { label: '2:30 PM', value: 14 * 60 + 30 },
  { label: '3:00 PM', value: 15 * 60 },
  { label: '3:30 PM', value: 15 * 60 + 30 },
  { label: '4:00 PM', value: 16 * 60 },
  { label: '4:30 PM', value: 16 * 60 + 30 },
  { label: '5:00 PM', value: 17 * 60 },
  { label: '5:30 PM', value: 17 * 60 + 30 }
];

const weekdays = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Helper function to get the next occurrence of a specific day
const getNextDayOccurrence = (dayName: string): Date => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const dayIndex = days.indexOf(dayName);
  const todayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let daysUntilNext = dayIndex - todayIndex;
  
  // If it's today or in the past, add 7 days to go to next week
  // EXCEPT if it's today - we want to include today
  if (daysUntilNext < 0) {
    daysUntilNext += 7; // Wrap around to next week
  }
  // If it's today (daysUntilNext == 0), keep it as today
  
  const nextOccurrence = new Date(today);
  nextOccurrence.setDate(today.getDate() + daysUntilNext);
  return nextOccurrence;
};

// Format a date as "DD/MM" (e.g., "15/07")
const formatDayDate = (date: Date): string => {
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export function Availability({ barberId }: AvailabilityProps) {
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedSlots, setSelectedSlots] = useState<{[key: string]: number[]}>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  });
  
  // Get existing templates
  const templates = useQuery(api.availabilityTemplates.getByBarber, { barberId });
  
  // Save template mutation
  const saveTemplate = useMutation(api.availabilityTemplates.saveTemplate);
  
  // Save templates mutation
  const saveTemplates = useMutation(api.availabilityTemplates.saveTemplates);
  
  // Run cleanup mutation
  const cleanupSlots = useMutation(api.slots.cleanupUnusedSlots);

  // Load existing templates
  useEffect(() => {
    if (templates) {
      const newSelectedSlots = { ...selectedSlots };
      
      templates.forEach(template => {
        newSelectedSlots[template.dayOfWeek] = template.startTimes;
      });
      
      setSelectedSlots(newSelectedSlots);
    }
  }, [templates]);

  const handleSlotToggle = (time: number) => {
    setSelectedSlots(prev => {
      const currentDaySlots = [...(prev[selectedDay] || [])];
      
      if (currentDaySlots.includes(time)) {
        // Remove the slot
        return {
          ...prev,
          [selectedDay]: currentDaySlots.filter(t => t !== time)
        };
      } else {
        // Add the slot
        return {
          ...prev,
          [selectedDay]: [...currentDaySlots, time].sort((a, b) => a - b)
        };
      }
    });
  };

  // New function to select all slots for the current day
  const selectAllSlots = () => {
    setSelectedSlots(prev => ({
      ...prev,
      [selectedDay]: timeSlots.map(slot => slot.value).sort((a, b) => a - b)
    }));
    
    toast({
      title: "All slots selected",
      description: `All time slots for ${selectedDay} have been selected.`,
    });
  };

  // New function to deselect all slots for the current day
  const deselectAllSlots = () => {
    setSelectedSlots(prev => ({
      ...prev,
      [selectedDay]: []
    }));
    
    toast({
      title: "All slots deselected",
      description: `All time slots for ${selectedDay} have been deselected.`,
    });
  };

  const saveCurrentDayTemplate = async () => {
    try {
      await saveTemplate({
        barberId,
        dayOfWeek: selectedDay,
        startTimes: selectedSlots[selectedDay]
      });

      toast({
        title: "Availability template saved",
        description: `Your availability for ${selectedDay} has been updated.`,
      });
      
      // Run the cleanup to remove any unused slots
      await cleanupSlots({ retentionDays: 30 });
    } catch (error) {
      console.error("Error saving availability template:", error);
      toast({
        title: "Error",
        description: "Failed to save your availability template. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Weekly Availability</CardTitle>
        <CardDescription>
          Set your working hours for each day of the week. These templates will be used to generate available slots when customers book appointments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {weekdays.map(day => {
              const nextDate = getNextDayOccurrence(day);
              const formattedDate = formatDayDate(nextDate);
              const isToday = new Date().getDate() === nextDate.getDate() && 
                              new Date().getMonth() === nextDate.getMonth() &&
                              new Date().getFullYear() === nextDate.getFullYear();
              
              return (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "outline"}
                  onClick={() => setSelectedDay(day)}
                  className={`whitespace-nowrap ${isToday ? "border-green-500" : ""}`}
                >
                  {day} <span className="ml-1 text-xs opacity-80">{formattedDate}{isToday ? " (Today)" : ""}</span>
                </Button>
              );
            })}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            <Button 
              variant="default"
              onClick={selectAllSlots}
              className="text-sm bg-green-600 hover:bg-green-700"
            >
              Select All Slots
            </Button>
            <Button 
              variant="outline" 
              onClick={deselectAllSlots}
              className="text-sm border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              Clear All Slots
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
            {timeSlots.map(slot => (
              <Button
                key={slot.value}
                variant={selectedSlots[selectedDay]?.includes(slot.value) ? "default" : "outline"}
                onClick={() => handleSlotToggle(slot.value)}
                className="text-sm"
              >
                {slot.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={saveCurrentDayTemplate}>
          Save {selectedDay}
        </Button>
      </CardFooter>
    </Card>
  );
} 
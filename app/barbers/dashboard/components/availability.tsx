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
  { label: '5:30 PM', value: 17 * 60 + 30 },
  { label: '6:00 PM', value: 18 * 60 },
  { label: '6:30 PM', value: 18 * 60 + 30 },
  { label: '7:00 PM', value: 19 * 60 },
  { label: '7:30 PM', value: 19 * 60 + 30 },
  { label: '8:00 PM', value: 20 * 60 }
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

// Format a date as YYYY-MM-DD
const formatDatabaseDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  
  // Track booked slots for each day
  const [bookedSlots, setBookedSlots] = useState<{[key: string]: number[]}>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  });
  
  // Calculate date for the selected day
  const selectedDate = getNextDayOccurrence(selectedDay);
  const formattedSelectedDate = formatDatabaseDate(selectedDate);
  
  // Get existing templates
  const templates = useQuery(api.availabilityTemplates.getByBarber, { barberId });
  
  // Get existing slots for the selected day
  const slots = useQuery(api.slots.getByBarberAndDate, { 
    barberId, 
    date: formattedSelectedDate 
  });
  
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
  
  // Load booked slots for the selected day
  useEffect(() => {
    if (slots && selectedDay) {
      // Log the slots for debugging
      console.log(`Got ${slots.length} slots for ${selectedDay}:`, slots);
      
      // Filter for booked slots
      const bookedTimesForSelectedDay = slots
        .filter(slot => {
          const isBooked = slot.isBooked;
          if (isBooked) {
            console.log(`Found booked slot for ${formatTime(slot.startTime)}`);
          }
          return isBooked;
        })
        .map(slot => slot.startTime);
      
      console.log(`Found ${bookedTimesForSelectedDay.length} booked slots for ${selectedDay}`);
      
      setBookedSlots(prev => ({
        ...prev,
        [selectedDay]: bookedTimesForSelectedDay
      }));
      
      // Make sure booked slots are also in the selected slots
      setSelectedSlots(prev => {
        const currentDaySlots = [...(prev[selectedDay] || [])];
        
        // Add any booked slots that aren't already selected
        let updatedSlots = [...currentDaySlots];
        
        bookedTimesForSelectedDay.forEach(time => {
          if (!updatedSlots.includes(time)) {
            updatedSlots.push(time);
          }
        });
        
        // Sort the slots
        updatedSlots.sort((a, b) => a - b);
        
        return {
          ...prev,
          [selectedDay]: updatedSlots
        };
      });
    }
  }, [slots, selectedDay]);

  const handleSlotToggle = (time: number) => {
    // Don't allow toggling of booked slots
    if (bookedSlots[selectedDay]?.includes(time)) {
      toast({
        title: "Slot is booked",
        description: "You cannot remove a time slot that has an active booking.",
        variant: "destructive",
      });
      return;
    }
    
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
    // Preserve booked slots when deselecting
    const bookedSlotsForDay = bookedSlots[selectedDay] || [];
    
    console.log(`Clearing available slots for ${selectedDay} but preserving ${bookedSlotsForDay.length} booked slots`);
    
    if (bookedSlotsForDay.length > 0) {
      bookedSlotsForDay.forEach(time => {
        console.log(`Preserving booked slot at ${formatTime(time)}`);
      });
    }
    
    setSelectedSlots(prev => ({
      ...prev,
      [selectedDay]: bookedSlotsForDay
    }));
    
    toast({
      title: "Available slots cleared",
      description: bookedSlotsForDay.length > 0 
        ? `Available time slots for ${selectedDay} have been cleared. ${bookedSlotsForDay.length} booked slots are preserved.`
        : `Available time slots for ${selectedDay} have been cleared.`,
    });
  };

  const saveCurrentDayTemplate = async () => {
    try {
      // Ensure all booked slots are included in the template
      const bookedSlotsForDay = bookedSlots[selectedDay] || [];
      let timesToSave = [...selectedSlots[selectedDay]];
      
      // Add any booked slots that might be missing
      bookedSlotsForDay.forEach(time => {
        if (!timesToSave.includes(time)) {
          console.log(`Adding missing booked slot for ${formatTime(time)} to template`);
          timesToSave.push(time);
        }
      });
      
      // Sort times
      timesToSave.sort((a, b) => a - b);
      
      console.log(`Saving template for ${selectedDay} with ${timesToSave.length} slots (including ${bookedSlotsForDay.length} booked slots)`);
      
      // First save the template
      await saveTemplate({
        barberId,
        dayOfWeek: selectedDay,
        startTimes: timesToSave
      });

      // Update our local state to reflect what was actually saved
      setSelectedSlots(prev => ({
        ...prev,
        [selectedDay]: timesToSave
      }));

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

  // Check if a slot is booked
  const isSlotBooked = (time: number) => {
    return bookedSlots[selectedDay]?.includes(time) || false;
  };

  // Format time from minutes (e.g., 570) to "9:30 AM"
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMins = mins.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMins} ${ampm}`;
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
              
              // Show the number of booked slots for each day
              const bookedCount = bookedSlots[day]?.length || 0;
              
              return (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "outline"}
                  onClick={() => setSelectedDay(day)}
                  className={`whitespace-nowrap ${isToday ? "border-green-500" : ""}`}
                >
                  {day} 
                  <span className="ml-1 text-xs opacity-80">
                    {formattedDate}{isToday ? " (Today)" : ""}
                    {bookedCount > 0 && ` • ${bookedCount} booked`}
                  </span>
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
              Clear Available Slots
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
            {timeSlots.map(slot => {
              const isBooked = isSlotBooked(slot.value);
              const isSelected = selectedSlots[selectedDay]?.includes(slot.value);
              
              return (
                <Button
                  key={slot.value}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleSlotToggle(slot.value)}
                  className={`text-sm ${isBooked ? "bg-amber-100 border-amber-500 text-amber-700 hover:bg-amber-200 hover:text-amber-800" : ""}`}
                  disabled={isBooked}
                >
                  {slot.label}
                  {isBooked && <span className="ml-1 text-xs">(Booked)</span>}
                </Button>
              );
            })}
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Note: Slots marked as <span className="text-amber-700">(Booked)</span> already have customer appointments and cannot be removed from your availability.</p>
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
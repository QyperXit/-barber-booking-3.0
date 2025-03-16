import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { formatDate, formatSlotDateTime, formatTime } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';

interface AppointmentsProps {
  barberId: Id<"barbers">;
}

export function Appointments({ barberId }: AppointmentsProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [updatingStatuses, setUpdatingStatuses] = useState(false);
  
  console.log("Selected date for appointments:", selectedDate);
  
  const appointments = useQuery(api.appointments.getByBarberId, { barberId });
  console.log("All appointments from barber:", appointments);
  
  const updateAppointmentStatus = useMutation(api.appointments.updateStatus);
  
  const filteredAppointments = appointments?.filter(appointment => {
    console.log("Comparing appointment date:", appointment.date, "with selected date:", selectedDate);
    
    // Status filtering
    const statusMatch = selectedStatus === 'all' || appointment.status === selectedStatus;
    
    // For completed and cancelled, just check status
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return statusMatch;
    }
    
    // Try multiple date formats for comparison
    let dateMatches = false;
    
    // Direct string comparison
    if (appointment.date === selectedDate) {
      dateMatches = true;
    } 
    // Try to parse and reformat both dates to ensure consistent comparison
    else {
      try {
        // Parse the appointment date (try different formats)
        let appointmentDateObj;
        if (!isNaN(Number(appointment.date))) {
          appointmentDateObj = new Date(Number(appointment.date));
        } else {
          appointmentDateObj = new Date(appointment.date);
        }
        
        // Format both as YYYY-MM-DD for comparison
        const formattedAppointmentDate = formatDate(appointmentDateObj);
        dateMatches = formattedAppointmentDate === selectedDate;
        
        console.log("Reformatted date comparison:", formattedAppointmentDate, selectedDate, dateMatches);
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    }
    
    return statusMatch && dateMatches;
  }) || [];
  
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      console.log(`Found ${filteredAppointments.length} appointments for date ${selectedDate}`);
    }
  }, [appointments, filteredAppointments.length, selectedDate]);
  
  const handleComplete = async (appointmentId: Id<"appointments">) => {
    try {
      await updateAppointmentStatus({
        id: appointmentId,
        status: 'completed'
      });
      
      toast({
        title: "Appointment completed",
        description: "The appointment has been marked as completed.",
      });
    } catch (error) {
      console.error("Error completing appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update the appointment status.",
        variant: "destructive",
      });
    }
  };
  
  const handleCancel = async (appointmentId: Id<"appointments">) => {
    try {
      await updateAppointmentStatus({
        id: appointmentId,
        status: 'cancelled'
      });
      
      toast({
        title: "Appointment cancelled",
        description: "The appointment has been cancelled.",
      });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({
        title: "Error",
        description: "Failed to cancel the appointment.",
        variant: "destructive",
      });
    }
  };
  
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      dates.push({
        value: formatDate(date),
        label: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })
      });
    }
    
    return dates;
  };
  
  // New function to update pending appointments to paid if they've been paid for
  const handleUpdatePendingAppointments = async () => {
    if (!appointments || appointments.length === 0) return;
    
    setUpdatingStatuses(true);
    
    try {
      // Find all pending appointments
      const pendingAppointments = appointments.filter(app => app.status === 'pending');
      
      if (pendingAppointments.length === 0) {
        toast({
          title: "No pending appointments",
          description: "There are no pending appointments to update.",
        });
        setUpdatingStatuses(false);
        return;
      }
      
      // Update each one to paid
      let updatedCount = 0;
      for (const appointment of pendingAppointments) {
        try {
          await updateAppointmentStatus({
            id: appointment._id,
            status: 'paid'
          });
          updatedCount++;
        } catch (error) {
          console.error(`Error updating appointment ${appointment._id}:`, error);
        }
      }
      
      toast({
        title: "Appointments Updated",
        description: `Updated ${updatedCount} appointments from pending to paid.`,
      });
    } catch (error) {
      console.error("Error updating appointments:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update appointment statuses.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatuses(false);
    }
  };
  
  if (!appointments) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Appointments</CardTitle>
          <CardDescription>Loading appointments...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Appointments</CardTitle>
        <CardDescription>
          Manage your upcoming and past appointments.
        </CardDescription>
        
        <div className="mt-4 mb-2">
          <label htmlFor="date-select" className="block text-sm font-medium mb-1">
            Select Date:
          </label>
          <select 
            id="date-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {getDateOptions().map(date => (
              <option key={date.value} value={date.value}>
                {date.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-2 mt-4">
          <Button
            variant={selectedStatus === 'all' ? "default" : "outline"}
            onClick={() => setSelectedStatus('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={selectedStatus === 'pending' ? "default" : "outline"}
            onClick={() => setSelectedStatus('pending')}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={selectedStatus === 'paid' ? "default" : "outline"}
            onClick={() => setSelectedStatus('paid')}
            size="sm"
          >
            Paid
          </Button>
          <Button
            variant={selectedStatus === 'completed' ? "default" : "outline"}
            onClick={() => setSelectedStatus('completed')}
            size="sm"
          >
            Completed
          </Button>
          <Button
            variant={selectedStatus === 'cancelled' ? "default" : "outline"}
            onClick={() => setSelectedStatus('cancelled')}
            size="sm"
          >
            Cancelled
          </Button>
        </div>
        
        {/* Add a button to update all pending appointments */}
        <div className="mt-4 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUpdatePendingAppointments}
            disabled={updatingStatuses}
          >
            {updatingStatuses ? "Updating..." : "Update Pending to Paid"}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Use this button to update any appointments that are marked as "pending" but have already been paid for.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No {selectedStatus !== 'all' ? selectedStatus : ''} appointments found
            {selectedStatus === 'pending' || selectedStatus === 'paid' ? ` for ${selectedDate}` : ''}.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium">{appointment.userName}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatSlotDateTime(appointment.date, appointment.startTime)}
                  </div>
                  <div className="text-sm">
                    Services: {appointment.services.join(', ')}
                  </div>
                  <div className={`text-sm font-medium ${
                    appointment.status === 'pending' ? 'text-yellow-500' :
                    appointment.status === 'paid' ? 'text-blue-500' :
                    appointment.status === 'completed' ? 'text-green-500' :
                    'text-red-500'
                  }`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </div>
                </div>
                
                {(appointment.status === 'pending' || appointment.status === 'paid') && (
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleComplete(appointment._id)}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancel(appointment._id)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
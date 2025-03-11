'use client';

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export default function CleanupPage() {
  const barbers = useQuery(api.barbers.get);
  const cleanupDuplicates = useMutation(api.barbers.cleanupDuplicates);
  const [result, setResult] = useState<{ message?: string, count?: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const handleCleanup = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await cleanupDuplicates();
      setResult(result);
    } catch (error) {
      console.error("Cleanup failed:", error);
      setResult({ message: "Error: " + String(error) });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Database Cleanup</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Barbers ({barbers?.length || 0})</h2>
        <ul className="list-disc pl-5">
          {barbers?.map((barber) => (
            <li key={barber._id}>{barber.name} ({barber._id})</li>
          ))}
        </ul>
      </div>
      
      <Button 
        onClick={handleCleanup} 
        disabled={isLoading}
        className="mb-4"
      >
        {isLoading ? "Cleaning up..." : "Remove Duplicate Barbers"}
      </Button>
      
      {result.message && (
        <div className="p-4 border rounded-md mt-4 bg-gray-50">
          <p>{result.message}</p>
          {result.count !== undefined && <p>Removed: {result.count} duplicates</p>}
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState } from 'react';

interface RecurringTripToggleProps {
  onRecurringChange: (isRecurring: boolean, days: string[], daysOfMonth: number[], startDate?: string, endDate?: string) => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function RecurringTripToggle({ onRecurringChange }: RecurringTripToggleProps) {
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState<number[]>([]);
  const [endDate, setEndDate] = useState('');
  const [startDate, setStartDate] = useState('');

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(newDays);
    onRecurringChange(isRecurring, newDays, selectedDaysOfMonth, startDate || undefined, endDate || undefined);
  };

  const toggleDayOfMonth = (day: number) => {
    const newDays = selectedDaysOfMonth.includes(day)
      ? selectedDaysOfMonth.filter(d => d !== day)
      : [...selectedDaysOfMonth, day];
    
    setSelectedDaysOfMonth(newDays);
    onRecurringChange(isRecurring, selectedDays, newDays, startDate || undefined, endDate || undefined);
  };

  const handleRecurringToggle = (checked: boolean) => {
    setIsRecurring(checked);
    onRecurringChange(checked, selectedDays, selectedDaysOfMonth, startDate || undefined, endDate || undefined);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    onRecurringChange(isRecurring, selectedDays, selectedDaysOfMonth, value || undefined, endDate || undefined);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    onRecurringChange(isRecurring, selectedDays, selectedDaysOfMonth, startDate || undefined, value || undefined);
  };

  return (
    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recurring Trip</h3>
        <label htmlFor="isRecurring" className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="isRecurring"
            name="isRecurring"
            checked={isRecurring}
            onChange={(e) => handleRecurringToggle(e.target.checked)}
            className="mr-2 rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-foreground">This is a recurring work trip</span>
        </label>
      </div>

      {isRecurring && (
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium mb-2 text-foreground">
              Repeat on days of week: *
            </span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${selectedDays.includes(day)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2 text-foreground">
              Repeat on days of month:
            </span>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDayOfMonth(day)}
                  className={`w-8 h-8 rounded text-sm transition-colors ${selectedDaysOfMonth.includes(day)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select specific days of the month (optional)
            </p>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium mb-1 text-foreground">
              Recurrence Start Date *
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full p-2 border rounded bg-background text-foreground border-input"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              First occurrence of the recurring trip
            </p>
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium mb-1 text-foreground">
              Recurrence End Date (optional)
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full p-2 border rounded bg-background text-foreground border-input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank for ongoing recurrence
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

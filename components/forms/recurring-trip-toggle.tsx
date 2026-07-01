'use client';

import { useState } from 'react';

interface RecurringTripToggleProps {
  onRecurringChange: (isRecurring: boolean, days: string[], endDate?: string) => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function RecurringTripToggle({ onRecurringChange }: RecurringTripToggleProps) {
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [endDate, setEndDate] = useState('');

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(newDays);
    onRecurringChange(isRecurring, newDays, endDate || undefined);
  };

  const handleRecurringToggle = (checked: boolean) => {
    setIsRecurring(checked);
    onRecurringChange(checked, selectedDays, endDate || undefined);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    onRecurringChange(isRecurring, selectedDays, value || undefined);
  };

  return (
    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recurring Trip</h3>
        <label className="flex items-center">
          <input
            type="checkbox"
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
            <label className="block text-sm font-medium mb-2 text-foreground">
              Repeat on days: *
            </label>
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
            <label className="block text-sm font-medium mb-1 text-foreground">
              Recurrence End Date (optional)
            </label>
            <input
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

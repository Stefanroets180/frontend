'use client';

import { Download, Car, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FleetOdometerStatus {
  vehicleId: string;
  registration: string;
  make: string;
  model: string;
  currentOdometer: number | null;
  lastOdometerDate: string | null;
  assignmentId: string | null;
  assignedDriverName: string | null;
  assignedAt: string | null;
  handoffState: string | null;
}

interface Props {
  data: FleetOdometerStatus[];
  permissions?: Record<string, Record<string, boolean>>;
}

export function FleetOdometerStatusTable({ data, permissions }: Props) {
  const canView = permissions?.['FLEET_STATUS']?.['VIEW_FLEET_STATUS'];

  if (!canView) {
    return null;
  }

  const downloadCSV = () => {
    const headers = ['Registration', 'Make', 'Model', 'Current Odometer', 'Last Odometer Date', 'Assigned Driver', 'Assigned Since', 'Handoff State'];
    const rows = data.map(item => [
      item.registration,
      item.make,
      item.model,
      item.currentOdometer?.toString() || 'N/A',
      item.lastOdometerDate || 'N/A',
      item.assignedDriverName || 'Unassigned',
      item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : 'N/A',
      item.handoffState || 'N/A'
    ]);

    const csvContent = []
      .concat([headers.join(',')])
      .concat(rows.map(row => row.join(',')))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fleet-odometer-status-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getHandoffStateBadge = (state: string | null) => {
    if (!state) return null;
    
    const stateStyles: Record<string, string> = {
      PENDING_HANDOFF_INITIATED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      AWAITING_OLD_DRIVER_CONDITION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      AWAITING_NEW_DRIVER_CONDITION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      AWAITING_MANAGER_APPROVAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      COMPLETE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    const style = stateStyles[state] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
        {state.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Fleet Odometer Status
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadCSV}
          disabled={data.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No vehicles found
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium py-3 px-2">Registration</th>
                  <th className="text-left font-medium py-3 px-2">Vehicle</th>
                  <th className="text-right font-medium py-3 px-2">Odometer</th>
                  <th className="text-left font-medium py-3 px-2">Last Updated</th>
                  <th className="text-left font-medium py-3 px-2">Assigned Driver</th>
                  <th className="text-left font-medium py-3 px-2">Assigned Since</th>
                  <th className="text-left font-medium py-3 px-2">Handoff State</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.vehicleId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{item.registration}</td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.make}</span>
                        <span className="text-muted-foreground text-xs">{item.model}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {item.currentOdometer ? item.currentOdometer.toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-2">
                      {item.lastOdometerDate ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(item.lastOdometerDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {item.assignedDriverName ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {item.assignedDriverName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-2">
                      {getHandoffStateBadge(item.handoffState)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

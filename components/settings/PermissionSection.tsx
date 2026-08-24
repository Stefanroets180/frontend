import { Switch } from '@/components/ui/switch';
import { useUpdatePermission } from '@/hooks/usePermissions';

interface Props {
  title: string;
  type: string;
  keys: { key: string; label: string }[];
  roles: string[];
  overrides: Record<string, Record<string, boolean>>;
}

const DEFAULTS: Record<string, Record<string, Set<string>>> = {
  EXPENSE_CATEGORY: {
    FUEL_LOG: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    MECHANIC_SERVICE: new Set(['MANAGER','ADMIN']),
    MAINTENANCE_TOPUP: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    TIRES: new Set(['MANAGER','ADMIN']),
    CAR_WASH: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    INSURANCE_PREMIUM: new Set(['MANAGER','ADMIN']),
    VEHICLE_TRACKING: new Set(['MANAGER','ADMIN']),
    ETOLL_SANRAL: new Set(['MANAGER','ADMIN']),
    LICENSE_RENEWAL: new Set(['MANAGER','ADMIN']),
    PERSONAL_LICENSE: new Set(['MANAGER','ADMIN']),
    ROADWORTHY: new Set(['MANAGER','ADMIN']),
    OTHER_FIXED: new Set(['MANAGER','ADMIN']),
    PARKING: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
  },
  VEHICLE_ASSIGNMENT: {
    ASSIGN_TO_DRIVER: new Set(['MANAGER','ADMIN']),
    ASSIGN_TO_MANAGER: new Set(['ADMIN']),
    RECLAIM_VEHICLE: new Set(['MANAGER','ADMIN']),
  },
  LOGBOOK: {
    VIEW_LOGBOOK: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    ADD_TRIP: new Set(['DRIVER','MANAGER','ADMIN']),
    EDIT_TRIP: new Set(['MANAGER','ADMIN']),
    DELETE_TRIP: new Set(['ADMIN']),
  },
  TAX_AUDIT: {
    ADD_OPENING_READING: new Set(['MANAGER','ADMIN']),
    ADD_CLOSING_READING: new Set(['MANAGER','ADMIN']),
    EDIT_READINGS: new Set(['ADMIN']),
    DELETE_READINGS: new Set(['ADMIN']),
  },
  EXPORT: {
    EXPORT_SARS_LOGBOOK: new Set(['ADMIN']),
    EXPORT_TRIPS: new Set(['MANAGER','ADMIN']),
    EXPORT_EMAIL: new Set(['ADMIN']),
  }
};

function isDefaultAllowed(type: string, key: string, role: string): boolean {
  return DEFAULTS[type]?.[key]?.has(role) ?? false;
}

export function PermissionSection({ title, type, keys, roles, overrides }: Props) {
  const update = useUpdatePermission();

  const isOverridden = (key: string, role: string) => overrides[key]?.[role] !== undefined;
  const getValue = (key: string, role: string) => overrides[key]?.[role] ?? isDefaultAllowed(type, key, role);

  return (
    <div className="border rounded-lg p-4 mb-4 bg-card">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Permission</th>
            {roles.map(r => <th key={r} className="text-center py-2 w-24">{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {keys.map(({ key, label }) => (
            <tr key={key} className="border-b last:border-0">
              <td className="py-2">
                {label}
                {roles.some(r => isOverridden(key, r)) && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Custom</span>
                )}
              </td>
              {roles.map(role => {
                const val = getValue(key, role);
                const over = isOverridden(key, role);
                return (
                  <td key={role} className="text-center py-2">
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={val}
                        onCheckedChange={(checked) => update.mutate({ type, key, role, allowed: checked })}
                        className={over ? "data-[state=checked]:bg-blue-600" : ""}
                      />
                      {over && <span className="text-[10px] text-blue-600">Custom</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

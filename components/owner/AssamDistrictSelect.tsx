'use client';

import { ASSAM_DISTRICTS, ASSAM_OTHER } from '@/lib/assamDistricts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface AssamDistrictSelectProps {
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
  onOtherChange: (value: string) => void;
}

export function AssamDistrictSelect({
  value,
  otherValue,
  onChange,
  onOtherChange,
}: AssamDistrictSelectProps) {
  const showOther = value === ASSAM_OTHER;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          City / District *
        </label>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Search city in Assam..." />
          </SelectTrigger>
          <SelectContent>
            {ASSAM_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
            <SelectItem value={ASSAM_OTHER}>{ASSAM_OTHER}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showOther && (
        <Input
          label="Specify district"
          type="text"
          placeholder="Enter your district name"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          required
        />
      )}
    </div>
  );
}

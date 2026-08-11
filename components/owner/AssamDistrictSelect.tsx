'use client';

import {
  AssamDistrictAutocomplete,
} from '@/components/shared/AssamDistrictAutocomplete';
import { Input } from '@/components/ui/input';
import { ASSAM_OTHER } from '@/lib/assamDistricts';

interface AssamDistrictSelectProps {
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
  onOtherChange: (value: string) => void;
}

/**
 * Legacy wrapper kept for callers that still use Other-specify flow.
 * New wizards should use AssamDistrictAutocomplete directly.
 */
export function AssamDistrictSelect({
  value,
  otherValue,
  onChange,
  onOtherChange,
}: AssamDistrictSelectProps) {
  const showOther = value === ASSAM_OTHER || value.startsWith('Other:');

  return (
    <div className="space-y-3">
      <AssamDistrictAutocomplete
        value={showOther ? '' : value}
        onChange={onChange}
        placeholder="Select district"
      />
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ItemsPerPageSelectorProps {
  value: number;
  onValueChange: (value: number) => void;
  options?: number[];
  disabled?: boolean;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];

export function ItemsPerPageSelector({ 
  value, 
  onValueChange, 
  options = DEFAULT_OPTIONS,
  disabled = false 
}: ItemsPerPageSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Itens por página:
      </span>
      <Select
        value={value.toString()}
        onValueChange={(val) => onValueChange(parseInt(val))}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
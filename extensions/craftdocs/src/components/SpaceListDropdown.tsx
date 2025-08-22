import { Icon, List } from "@raycast/api";
import { ensureSafeTitle } from "../utils/safety";

export interface SpaceOption {
  id: string;
  title: string;
  icon: Icon;
}

interface SpaceListDropdownProps {
  value: string;
  spaces: SpaceOption[];
  onSpaceChange: (newValue: string) => void;
  showAllOption?: boolean;
}

export function SpaceListDropdown({ value, spaces, onSpaceChange, showAllOption = false }: SpaceListDropdownProps) {
  return (
    <List.Dropdown value={value} tooltip="Select Space" onChange={onSpaceChange}>
      <List.Dropdown.Section title="Spaces">
        {showAllOption && <List.Dropdown.Item key="all" title="All Spaces" value="all" icon={Icon.Globe} />}
        {spaces.map((space) => (
          <List.Dropdown.Item
            key={space.id}
            title={ensureSafeTitle(space.title, [`Space ${space.id}`])}
            value={space.id}
            icon={space.icon}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

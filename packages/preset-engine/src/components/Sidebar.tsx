export interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "radius", label: "Radius" },
  { id: "spacing", label: "Spacing" },
  { id: "shadows", label: "Shadows" },
  { id: "breakpoints", label: "Breakpoints" },
];

const GALLERY_ITEMS: NavItem[] = [
  { id: "gallery:typography", label: "Typography" },
  { id: "gallery:buttons", label: "Buttons" },
  { id: "gallery:badges", label: "Badges" },
  { id: "gallery:alerts", label: "Alerts" },
  { id: "gallery:inputs", label: "Inputs" },
  { id: "gallery:input-otp", label: "Input OTP" },
  { id: "gallery:textarea", label: "Textarea" },
  { id: "gallery:checkbox", label: "Checkbox" },
  { id: "gallery:switch", label: "Switch" },
  { id: "gallery:radio-group", label: "Radio Group" },
  { id: "gallery:select", label: "Select" },
  { id: "gallery:toggle", label: "Toggle" },
  { id: "gallery:toggle-group", label: "Toggle Group" },
  { id: "gallery:progress", label: "Progress" },
  { id: "gallery:separator", label: "Separator" },
  { id: "gallery:cards", label: "Cards" },
  { id: "gallery:avatar", label: "Avatar" },
  { id: "gallery:skeleton", label: "Skeleton" },
  { id: "gallery:slider", label: "Slider" },
  { id: "gallery:table", label: "Table" },
  { id: "gallery:tabs", label: "Tabs" },
  { id: "gallery:breadcrumb", label: "Breadcrumb" },
  { id: "gallery:scroll-area", label: "Scroll Area" },
  { id: "gallery:sheet", label: "Sheet" },
  { id: "gallery:popover", label: "Popover" },
  { id: "gallery:tooltip", label: "Tooltip" },
  { id: "gallery:toast", label: "Toast" },
  { id: "gallery:command", label: "Command" },
  { id: "gallery:hover-card", label: "Hover Card" },
  { id: "gallery:alert-dialog", label: "Alert Dialog" },
  { id: "gallery:dialog", label: "Dialog" },
  { id: "gallery:accordion", label: "Accordion" },
  { id: "gallery:calendar", label: "Calendar" },
  { id: "gallery:pagination", label: "Pagination" },
  { id: "gallery:dropdown-menu", label: "Dropdown Menu" },
  { id: "gallery:context-menu", label: "Context Menu" },
  { id: "gallery:resizable", label: "Resizable" },
  { id: "gallery:form", label: "Form" },
  { id: "gallery:spinner", label: "Spinner" },
  { id: "gallery:sidebar", label: "Sidebar" },
  { id: "gallery:aspect-ratio", label: "Aspect Ratio" },
  { id: "gallery:drawer", label: "Drawer" },
  { id: "gallery:label", label: "Label" },
  { id: "gallery:collapsible", label: "Collapsible" },
  { id: "gallery:squircle", label: "Squircle" },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="preset-sidebar">
      <div className="preset-section-label">Design Tokens</div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className="preset-nav-item"
          data-active={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
      <div className="preset-section-label mt-4">Component Gallery</div>
      {GALLERY_ITEMS.map((item) => (
        <button
          key={item.id}
          className="preset-nav-item"
          data-active={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

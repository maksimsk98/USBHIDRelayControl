import { forwardRef } from 'react';
import {
  ControlledMenu, MenuItem, MenuDivider, SubMenu,
} from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';

/**
 * @param {{
 *   menuSchema: Array,
 *   menuState: { isOpen: boolean, anchorPoint: { x: number, y: number } },
 *   onClose: () => void
 * } & React.RefAttributes<HTMLElement>} props
 */
const JsonMenu = forwardRef(({
  menuSchema, menuState, onClose, context,
}, ref) => {
  const renderItems = (schema) => schema.map((item, index) => {
    if (item.type === 'item') {
      return (
        <MenuItem key={index} onClick={(e) => item.action(e, context)}>
          {item.label}
        </MenuItem>
      );
    }
    if (item.type === 'divider') {
      return <MenuDivider key={index} />;
    }
    if (item.type === 'submenu') {
      return (
        <SubMenu key={index} label={item.label}>
          {renderItems(item.children || [])}
        </SubMenu>
      );
    }
    return null;
  });

  return (
    <ControlledMenu
      ref={ref}
      anchorPoint={menuState.anchorPoint}
      state={menuState.isOpen ? 'open' : 'closed'}
      onClose={onClose}
    >
      {renderItems(menuSchema)}
    </ControlledMenu>
  );
});

export default JsonMenu;

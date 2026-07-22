import { useCallback } from 'react';
import CustomCheckboxGroup from './CustomCheckboxGroup';
import { CustomTraceSvg } from './CustomTraceSVG';

const defaultContainerStyle = {
  overflowX: 'auto',
  overflowY: 'auto',
  width: 'auto',
  height: '100%',
};

const noop = () => {};

function IndexedTraceList({
  items = [],
  onItemClick = noop,
  onCheckChange = noop,
  onItemContextMenu = noop,
  getItemStyle = noop,
  activeIndex,
  contextMenu,
  containerStyle = {},
}) {
  const actualContainerStyle = { ...defaultContainerStyle, ...containerStyle };

  const handleKeyDown = useCallback(
    (e) => {
      if (!items.length || activeIndex == null) return;

      let newIndex = activeIndex;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      }

      if (newIndex !== activeIndex) {
        // Trigger the same behavior as a click
        const newItem = items[newIndex];
        onItemClick(e, newIndex, newItem);
      }
    },
    [activeIndex, items, onItemClick]
  );

  return (
    <div
      style={actualContainerStyle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="border border-secondary-subtle rounded focus-flare"
    >
      <div
        className="p-1"
        style={{
          display: 'table',
          tableLayout: 'auto',
          width: '100%',
        }}
      >
        {items.map((item, itemIndex) => {
          const traceStyle = getItemStyle(itemIndex, item);

          return (
            <div
              key={itemIndex}
              style={{ display: 'table-row' }}
            >
              <div style={{ display: 'table-cell' }}>
                <CustomCheckboxGroup
                  onContextMenu={(e) => onItemContextMenu(e, item, itemIndex)}
                  onClick={(e) => onItemClick(e, itemIndex, item)}
                  label={(
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.letterIndex && (
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: '1.4rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: 'rgba(0, 0, 0, 0.08)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            letterSpacing: '0.5px',
                            color: '#333',
                            userSelect: 'none',
                          }}
                        >
                          {item.letterIndex}
                        </span>
                      )}
                      {item.isDisplayed && <CustomTraceSvg color={traceStyle.color} dash={traceStyle.dash} />}
                      {item.name}
                    </span>
                  )}
                  checked={item.isDisplayed}
                  onChange={(e) => onCheckChange(e, itemIndex)}
                  labelClassName={
                      activeIndex === itemIndex ? 'bg-primary-subtle' : ''
                  }
                  size="sm"
                  groupStyle={{
                    width: 'auto',
                  }}
                  labelStyle={{ flex: 1 }}
                  groupClassName="mb-1"
                />
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu}
    </div>
  );
}

export default IndexedTraceList;

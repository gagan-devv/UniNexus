import { FixedSizeList } from 'react-window';

/**
 * VirtualList component for efficiently rendering large lists using react-window
 * Only renders items visible in the viewport plus a buffer
 * 
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function to render each item (item, index) => JSX
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {number} overscanCount - Number of items to render outside viewport (default: 3)
 */
const VirtualList = ({ 
  items = [], 
  renderItem, 
  itemHeight = 100, 
  containerHeight = 600,
  overscanCount = 3 
}) => {
  // Row renderer for react-window
  const Row = ({ index, style }) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  };

  return (
    <FixedSizeList
      height={containerHeight}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      overscanCount={overscanCount}
      className="virtual-list-container"
    >
      {Row}
    </FixedSizeList>
  );
};

export default VirtualList;

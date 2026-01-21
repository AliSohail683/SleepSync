# Synchronized Scrolling Pattern

## Overview

This document explains the **Synchronized Scrolling** (also known as **Bi-directional Scroll Sync**) pattern implemented in the CategoryProductScreen component.

## What is Synchronized Scrolling?

Synchronized scrolling is a UX pattern where two scrollable lists are linked:
- **Horizontal scroll** of categories (15 categories)
- **Vertical scroll** of products (30 products per category)

The lists stay in sync:
1. **Click a category** → Automatically scrolls to that category's products
2. **Scroll products** → Automatically selects and scrolls the corresponding category horizontally

## Pattern Name

This pattern is commonly called:
- **Synchronized Scrolling**
- **Bi-directional Scroll Sync**
- **Category-Product Sync**
- **Linked Scrolling**

Commonly used in:
- E-commerce apps (category-based product listings)
- Food delivery apps (restaurant categories → menu items)
- Content apps (sections → articles)

## Implementation

### Files Created

1. **`src/screens/CategoryProductScreen.tsx`** - Main component with the UI
2. **`src/hooks/useSynchronizedScroll.ts`** - Reusable hook for the scroll logic

### Key Features

#### 1. Performance Optimizations (60fps)

```typescript
// FlatList Performance Props
scrollEventThrottle={16}        // 60fps (16ms = 60fps)
getItemLayout={getItemLayout}   // Pre-calculated layouts
removeClippedSubviews={true}    // Unmount off-screen views
maxToRenderPerBatch={10}        // Limit batch rendering
windowSize={10}                 // Control viewport window
initialNumToRender={10}        // Limit initial render
```

#### 2. Preventing Feedback Loops

The implementation uses flags to prevent infinite scroll loops:
- `isScrollingProducts` - Prevents category updates during product scroll
- `isScrollingCategories` - Prevents product updates during category scroll

#### 3. Scroll Event Handling

```typescript
// Product scroll handler
onScroll={handleProductScroll}           // Updates category on scroll
onScrollBeginDrag={handleProductScrollBegin}  // Sets flag
onScrollEndDrag={handleProductScrollEnd}     // Resets flag
onMomentumScrollEnd={handleProductScrollEnd}  // Resets flag
```

## Usage

### Basic Usage

```typescript
import { CategoryProductScreen } from './src/screens/CategoryProductScreen';

// In your navigation or component
<CategoryProductScreen onClose={() => navigation.goBack()} />
```

### Using the Hook Directly

If you want to implement this pattern in a custom component:

```typescript
import { useSynchronizedScroll } from './src/hooks/useSynchronizedScroll';

const MyComponent = () => {
  const {
    categoryListRef,
    productListRef,
    selectedCategoryIndex,
    handleCategoryPress,
    handleProductScroll,
    handleProductScrollBegin,
    handleProductScrollEnd,
  } = useSynchronizedScroll({
    categoryCount: 15,
    productsPerCategory: 30,
    productItemHeight: 100,
    headerHeight: 100,
  });

  // Use the refs and handlers in your FlatLists
  return (
    <>
      <FlatList
        ref={categoryListRef}
        // ... your category list props
      />
      <FlatList
        ref={productListRef}
        onScroll={handleProductScroll}
        onScrollBeginDrag={handleProductScrollBegin}
        onScrollEndDrag={handleProductScrollEnd}
        // ... your product list props
      />
    </>
  );
};
```

## Performance Tips

1. **Always use `getItemLayout`** - Critical for smooth scrolling
2. **Set `scrollEventThrottle={16}`** - Ensures 60fps scroll events
3. **Use `removeClippedSubviews`** - Reduces memory usage
4. **Limit `windowSize`** - Controls how many items are rendered
5. **Use `useCallback` and `useMemo`** - Prevents unnecessary re-renders
6. **Debounce scroll handlers** - Prevents excessive updates

## Customization

### Changing Item Heights

```typescript
const PRODUCT_ITEM_HEIGHT = 100;  // Change this
const CATEGORY_ITEM_HEIGHT = 50;  // Change this
```

### Changing Counts

```typescript
const CATEGORY_COUNT = 15;           // Change this
const PRODUCTS_PER_CATEGORY = 30;    // Change this
```

### Custom Styling

Modify the `styles` object in `CategoryProductScreen.tsx` to match your design system.

## Testing Performance

To verify 60fps performance:

1. Enable React Native Performance Monitor:
   ```javascript
   // In your app
   import { PerformanceMonitor } from 'react-native';
   ```

2. Use React DevTools Profiler
3. Monitor frame rate in device developer options
4. Check for dropped frames in logs

## Common Issues

### Issue: Scroll feels laggy
**Solution**: Ensure `getItemLayout` is implemented correctly and `scrollEventThrottle={16}` is set.

### Issue: Categories don't update when scrolling
**Solution**: Check that `handleProductScroll` is properly connected to `onScroll`.

### Issue: Infinite scroll loop
**Solution**: Ensure the scroll flags (`isScrollingProducts`, `isScrollingCategories`) are working correctly.

### Issue: ScrollToIndex fails
**Solution**: Use `onScrollToIndexFailed` handler to retry scrolling.

## Future Enhancements

Potential improvements:
- Add smooth scroll animations
- Implement sticky category headers
- Add search/filter functionality
- Support lazy loading for large datasets
- Add pull-to-refresh

/**
 * useSynchronizedScroll Hook
 * Manages synchronized scrolling between horizontal categories and vertical products
 * Optimized for 60fps performance
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, FlatList } from 'react-native';

interface UseSynchronizedScrollOptions {
  categoryCount: number;
  productsPerCategory: number;
  productItemHeight: number;
  headerHeight?: number;
}

interface UseSynchronizedScrollReturn {
  // Refs
  categoryListRef: React.RefObject<FlatList<any>>;
  productListRef: React.RefObject<FlatList<any>>;
  
  // State
  selectedCategoryIndex: number;
  isScrollingProducts: boolean;
  isScrollingCategories: boolean;
  
  // Handlers
  handleCategoryPress: (index: number) => void;
  handleProductScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleProductScrollBegin: () => void;
  handleProductScrollEnd: () => void;
  
  // Computed values
  categoryOffsets: number[];
}

export const useSynchronizedScroll = (
  options: UseSynchronizedScrollOptions
): UseSynchronizedScrollReturn => {
  const {
    categoryCount,
    productsPerCategory,
    productItemHeight,
    headerHeight = productItemHeight,
  } = options;

  // Refs
  const categoryListRef = useRef<FlatList<any>>(null);
  const productListRef = useRef<FlatList<any>>(null);

  // State
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [isScrollingProducts, setIsScrollingProducts] = useState(false);
  const [isScrollingCategories, setIsScrollingCategories] = useState(false);

  // Calculate offset for each category section in products list
  const categoryOffsets = useMemo(() => {
    const offsets: number[] = [];
    let currentOffset = 0;
    for (let i = 0; i < categoryCount; i++) {
      offsets.push(currentOffset);
      // Add header height + products height
      currentOffset += headerHeight + (productsPerCategory * productItemHeight);
    }
    return offsets;
  }, [categoryCount, productsPerCategory, productItemHeight, headerHeight]);

  // Handle category press - scroll to products
  const handleCategoryPress = useCallback(
    (index: number) => {
      if (isScrollingProducts) return;

      setSelectedCategoryIndex(index);
      setIsScrollingCategories(true);

      // Scroll category list to selected item
      categoryListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5, // Center the item
      });

      // Scroll products list to category section
      const targetOffset = categoryOffsets[index];
      productListRef.current?.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });

      // Reset flag after animation
      setTimeout(() => {
        setIsScrollingCategories(false);
      }, 300);
    },
    [categoryOffsets, isScrollingProducts]
  );

  // Handle product scroll - update selected category
  const handleProductScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isScrollingCategories || isScrollingProducts) return;

      const offsetY = event.nativeEvent.contentOffset.y;

      // Find which category section is currently visible
      let newCategoryIndex = 0;
      for (let i = categoryOffsets.length - 1; i >= 0; i--) {
        if (offsetY >= categoryOffsets[i] - headerHeight / 2) {
          newCategoryIndex = i;
          break;
        }
      }

      // Update selected category if changed
      if (newCategoryIndex !== selectedCategoryIndex) {
        setSelectedCategoryIndex(newCategoryIndex);
        setIsScrollingCategories(true);

        // Scroll category list to show selected category
        categoryListRef.current?.scrollToIndex({
          index: newCategoryIndex,
          animated: true,
          viewPosition: 0.5,
        });

        // Reset flag after animation
        setTimeout(() => {
          setIsScrollingCategories(false);
        }, 300);
      }
    },
    [
      categoryOffsets,
      selectedCategoryIndex,
      isScrollingCategories,
      isScrollingProducts,
      headerHeight,
    ]
  );

  // Handle scroll begin - set flag to prevent feedback loops
  const handleProductScrollBegin = useCallback(() => {
    setIsScrollingProducts(true);
  }, []);

  // Handle scroll end - reset flag
  const handleProductScrollEnd = useCallback(() => {
    // Use a small delay to ensure scroll events are processed
    setTimeout(() => {
      setIsScrollingProducts(false);
    }, 100);
  }, []);

  return {
    categoryListRef,
    productListRef,
    selectedCategoryIndex,
    isScrollingProducts,
    isScrollingCategories,
    handleCategoryPress,
    handleProductScroll,
    handleProductScrollBegin,
    handleProductScrollEnd,
    categoryOffsets,
  };
};

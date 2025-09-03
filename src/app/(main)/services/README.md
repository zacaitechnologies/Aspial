# Services Caching System

This directory implements a smart caching system for services and service tags to improve performance and user experience.

## How It Works

### Cache Duration
- **Default cache duration**: 5 minutes
- **Cache invalidation**: Automatic when switching tabs or after data modifications

### Components

#### 1. `useServicesCache` Hook
- Manages services data with caching
- Prevents unnecessary API calls when switching between tabs
- Provides `invalidateCache()` method for manual cache invalidation

#### 2. `useServiceTagsCache` Hook
- Manages service tags data with caching
- Similar functionality to services cache
- Independent cache lifecycle

#### 3. `ServicesCacheContext`
- Shared context that manages both caches
- Provides `invalidateAllCaches()` method for coordinated cache invalidation
- Ensures data consistency across components

### Cache Invalidation Strategy

#### Automatic Invalidation
- **Tab switching**: Cache is invalidated when switching to ensure fresh data
- **Data modifications**: Both caches are invalidated when services or tags are created/updated/deleted

#### Manual Invalidation
- Use `invalidateCache()` for individual cache invalidation
- Use `invalidateAllCaches()` for coordinated invalidation

### Benefits

1. **Performance**: No unnecessary API calls when switching between tabs
2. **User Experience**: Instant tab switching with cached data
3. **Data Consistency**: Automatic cache invalidation ensures fresh data after modifications
4. **Efficiency**: 5-minute cache duration balances freshness with performance

### Usage Example

```tsx
import { useServicesCacheContext } from "./contexts/ServicesCacheContext"

function MyComponent() {
  const { services, serviceTags, invalidateAllCaches } = useServicesCacheContext()
  
  // Access cached data
  const { services: servicesList, isLoading, onRefresh } = services
  const { tags, isLoading: tagsLoading } = serviceTags
  
  // Invalidate all caches when needed
  const handleDataUpdate = () => {
    invalidateAllCaches()
  }
}
```

## File Structure

```
services/
├── hooks/
│   ├── useServicesCache.ts      # Services caching hook
│   └── useServiceTagsCache.ts   # Service tags caching hook
├── contexts/
│   └── ServicesCacheContext.tsx # Shared cache context
├── components/
│   ├── ServicesList.tsx         # Services list with caching
│   └── ServiceTagManager.tsx    # Tags manager with caching
└── page.tsx                     # Main page with cache provider
```

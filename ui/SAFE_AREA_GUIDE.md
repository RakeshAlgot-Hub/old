# Safe Area Implementation Guide

## Quick Reference

### DO ✅

1. **Use CustomTabBar for tab navigation**
```typescript
<Tabs tabBar={(props) => <CustomTabBar {...props} />}>
```

2. **Let tab bar handle its own safe area**
```typescript
// In CustomTabBar.tsx
const bottomSpace = insets.bottom || 0;
paddingBottom: bottomSpace
```

3. **Use static padding in ScrollViews**
```typescript
scrollContent: {
  paddingBottom: spacing.xxxl, // Theme constant
}
```

4. **Wrap root with SafeAreaProvider**
```typescript
<SafeAreaProvider>
  <Stack>...</Stack>
</SafeAreaProvider>
```

5. **Use tabBarHideOnKeyboard**
```typescript
screenOptions={{
  tabBarHideOnKeyboard: true,
}}
```

### DON'T ❌

1. **Don't hardcode device-specific values**
```typescript
// BAD
paddingBottom: 34 // iPhone home indicator
height: 84 // 50 + 34
```

2. **Don't calculate tab height in screens**
```typescript
// BAD
{ paddingBottom: insets.bottom + 80 }
```

3. **Don't use absolute positioning for tab bar**
```typescript
// BAD
position: 'absolute',
bottom: 0,
```

4. **Don't manually add safe area to screens**
```typescript
// BAD
withTabBar && { paddingBottom: insets.bottom + 64 }
```

5. **Don't nest SafeAreaProviders**
```typescript
// BAD
<SafeAreaProvider>
  <SafeAreaProvider>...</SafeAreaProvider>
</SafeAreaProvider>
```

## Pattern Examples

### Creating a New Tab Screen

```typescript
import { ScrollView } from 'react-native';
import ScreenContainer from '@/components/ScreenContainer';
import { spacing } from '@/theme';

export default function NewTabScreen() {
  return (
    <ScreenContainer edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Content here */}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl, // Visual spacing only
  },
});
```

### Creating a Stack Screen (No Tabs)

```typescript
export default function DetailScreen() {
  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Content here */}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl, // Less padding (no tab bar)
  },
});
```

### Using Safe Area Insets When Needed

Only use `useSafeAreaInsets()` for specific UI elements, not for tab bar compensation:

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FullScreenModal() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      {/* Full screen content */}
    </View>
  );
}
```

## Common Scenarios

### Scenario 1: Content Hidden Behind Tab Bar
**Problem:** ScrollView content is cut off at the bottom
**Solution:** Ensure `scrollContent` has `paddingBottom: spacing.xxxl`

### Scenario 2: Extra White Space Below Tab Bar
**Problem:** Gap appears between tab bar and bottom of screen
**Solution:** Check that CustomTabBar is calculating height correctly:
```typescript
height: TAB_BAR_HEIGHT + bottomSpace
```

### Scenario 3: Tab Bar Too Tall
**Problem:** Tab bar takes up too much vertical space
**Solution:** Don't add padding in both tab bar AND screens. Only tab bar should have safe area padding.

### Scenario 4: Keyboard Overlaps Tab Bar
**Problem:** Keyboard appears over tab bar
**Solution:** Use `tabBarHideOnKeyboard: true` in tab navigator

### Scenario 5: Different Behavior on Android vs iOS
**Problem:** Layout looks different on each platform
**Solution:** Use `Platform.select()` only for visual styling (shadows), not for layout:
```typescript
...Platform.select({
  ios: shadows.md,
  android: { elevation: 8 },
})
```

## Device Safe Area Reference

| Device | Bottom Inset | Notes |
|--------|--------------|-------|
| iPhone 14/15 Pro | 34px | Home indicator |
| iPhone SE | 0px | Physical home button |
| Android (gestures) | Varies | System managed |
| Android (3-button) | 0px | Navigation buttons |
| iPad | 20px | Varies by model |

## Debugging Tips

1. **Check insets values:**
```typescript
const insets = useSafeAreaInsets();
console.log('Bottom inset:', insets.bottom);
```

2. **Visual debug borders:**
```typescript
borderWidth: 1,
borderColor: 'red',
```

3. **Check tab bar height:**
```typescript
onLayout={(e) => console.log('Tab bar height:', e.nativeEvent.layout.height)}
```

4. **Verify SafeAreaProvider:**
Ensure it wraps your navigation at the root level.

## Migration Checklist

When updating an existing screen:

- [ ] Remove `useSafeAreaInsets()` if only used for tab bar
- [ ] Remove dynamic `paddingBottom` calculations from ScrollView
- [ ] Add static `paddingBottom: spacing.xxxl` to `scrollContent` style
- [ ] Move `scrollContent` style to top of styles object
- [ ] Test on iPhone with home indicator
- [ ] Test on Android
- [ ] Test keyboard behavior

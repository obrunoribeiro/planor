// Navegação/Tab Bar — CONTEXTO.md §5: "Início · Gastos · Futuro · Planor IA". Flutuante, 16px
// das bordas e 28px do fim da tela (nota do componente no Figma, node 22:184). A aba Metas
// entra só na v2 — mesma nota.
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, gradients, Icon, type IconName, space, typography } from '@planor/ui';

// Deriva o tipo direto do próprio componente <Tabs>, em vez de importar BottomTabBarProps de
// @react-navigation/bottom-tabs — o expo-router reempacota esse tipo com uma versão ligeiramente
// diferente da lib, e importar separadamente causa incompatibilidade estrutural no typecheck.
type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type TabBarProps = Parameters<TabBarRenderer>[0];

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Início', icon: 'inicio' },
  { name: 'gastos', label: 'Gastos', icon: 'gastos' },
  { name: 'futuro', label: 'Futuro', icon: 'futuro' },
  { name: 'ia', label: 'IA', icon: 'ia' },
];

function CustomTabBar({ state, navigation }: TabBarProps) {
  return (
    <BlurView intensity={40} tint="dark" style={styles.bar}>
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (focused) {
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: true }}>
              <LinearGradient
                colors={gradients.botao.colors}
                start={gradients.botao.start}
                end={gradients.botao.end}
                style={styles.activeItem}
              >
                <Icon name={tab.icon} size={space[20]} color={colors.dark.text.onBrand} />
                <Text style={styles.activeLabel}>{tab.label}</Text>
              </LinearGradient>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            accessibilityLabel={tab.label}
            style={styles.inactiveItem}
          >
            <Icon name={tab.icon} size={22} color={colors.dark.text.secondary} />
          </Pressable>
        );
      })}
    </BlurView>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="gastos" options={{ title: 'Gastos' }} />
      <Tabs.Screen name="futuro" options={{ title: 'Futuro' }} />
      <Tabs.Screen name="ia" options={{ title: 'Planor IA' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    height: 48,
    paddingLeft: space[16],
    paddingRight: 18,
    borderRadius: 24,
  },
  activeLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.onBrand,
  },
  inactiveItem: {
    height: 48,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

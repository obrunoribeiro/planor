// Gastos · Transações — CONTEXTO.md §6.5: "lista agrupada por dia, com o saldo do dia; chips
// Todas, Saídas, Entradas e Parcelas; busca por nome ou por valor; filtros de tipo, contas,
// categorias e faixa de valor." "Buscas recentes" fica pra depois (ver PROGRESSO.md).
import { formatCentsWithSign, reaisToCents } from '@planor/shared';
import { Checkbox, Chip, colors, EmptyState, Icon, ScreenHeader, Sheet, Skeleton, space, TextField, typography } from '@planor/ui';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TransactionRow } from '@/features/gastos/TransactionRow';
import { dayGroupLabel } from '@/lib/format';
import { useAccountsQuery, useCategoriesQuery, useTransactionsQuery } from '@/lib/api/queries';
import type { TransactionListFilters, TransactionListItem } from '@/lib/api/types';

const TYPE_OPTIONS: { value: NonNullable<TransactionListFilters['type']>; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'saidas', label: 'Saídas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'parcelas', label: 'Parcelas' },
];

type ListRow = { kind: 'header'; dateKey: string; balanceCents: number } | { kind: 'transaction'; transaction: TransactionListItem };

function groupByDay(items: TransactionListItem[]): ListRow[] {
  const rows: ListRow[] = [];
  let currentDateKey: string | null = null;

  for (const transaction of items) {
    if (transaction.postedAtDateKey !== currentDateKey) {
      currentDateKey = transaction.postedAtDateKey;
      const balanceCents = items.filter((t) => t.postedAtDateKey === currentDateKey).reduce((sum, t) => sum + t.amountCents, 0);
      rows.push({ kind: 'header', dateKey: currentDateKey, balanceCents });
    }
    rows.push({ kind: 'transaction', transaction });
  }
  return rows;
}

export default function TransacoesScreen() {
  const [type, setType] = useState<NonNullable<TransactionListFilters['type']>>('todas');
  const [searchVisible, setSearchVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');

  const filters: TransactionListFilters = useMemo(() => {
    const min = minText.trim() ? reaisToCents(Number(minText.replace(',', '.'))) : undefined;
    const max = maxText.trim() ? reaisToCents(Number(maxText.replace(',', '.'))) : undefined;
    return {
      type,
      q: search.trim() || undefined,
      accountIds: accountIds.length ? accountIds : undefined,
      categoryIds: categoryIds.length ? categoryIds : undefined,
      minCents: Number.isFinite(min) ? min : undefined,
      maxCents: Number.isFinite(max) ? max : undefined,
    };
  }, [type, search, accountIds, categoryIds, minText, maxText]);

  const { data, isPending, isError, refetch } = useTransactionsQuery(filters);
  const { data: accounts } = useAccountsQuery();
  const { data: categories } = useCategoriesQuery();

  const rows = useMemo(() => groupByDay(data ?? []), [data]);
  const activeFilterCount = accountIds.length + categoryIds.length + (minText.trim() ? 1 : 0) + (maxText.trim() ? 1 : 0);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader title="Transações" onBack={() => router.back()} />

        <View style={styles.topRow}>
          <Pressable style={styles.iconButton} accessibilityLabel="Buscar" onPress={() => setSearchVisible((v) => !v)}>
            <Icon name="busca" size={20} color={colors.dark.text.primary} />
          </Pressable>
          <Pressable style={styles.iconButton} accessibilityLabel="Filtros" onPress={() => setFiltersVisible(true)}>
            <Icon name="filtro" size={20} color={colors.dark.text.primary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeLabel}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {searchVisible && (
          <TextField label="Buscar" value={search} onChangeText={setSearch} placeholder="Nome ou valor (ex.: 62,90)" autoFocus />
        )}

        <View style={styles.chips}>
          {TYPE_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} active={option.value === type} onPress={() => setType(option.value)} />
          ))}
        </View>

        {isPending ? (
          <View style={styles.skeletonList}>
            <Skeleton shape="bloco" width="100%" />
            <Skeleton shape="bloco" width="100%" />
            <Skeleton shape="bloco" width="100%" />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <EmptyState icon="aviso" title="Não deu pra carregar" text="Confira sua internet e tenta de novo." actionLabel="Tentar de novo" onAction={() => refetch()} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.centered}>
            <EmptyState
              icon="gastos"
              title={search.trim() ? 'Nada encontrado' : 'Nenhuma transação'}
              text={search.trim() ? 'Tenta buscar por outro nome ou valor.' : 'Ainda não tem transação nesse período com esses filtros.'}
            />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row, index) => (row.kind === 'header' ? `h-${row.dateKey}` : row.transaction.id) + index}
            contentContainerStyle={styles.list}
            renderItem={({ item: row }) =>
              row.kind === 'header' ? (
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{dayGroupLabel(row.dateKey)}</Text>
                  <Text style={styles.dayBalance}>{formatCentsWithSign(row.balanceCents)}</Text>
                </View>
              ) : (
                <TransactionRow
                  transaction={row.transaction}
                  onPress={() => router.push({ pathname: '/gastos/transacao/[id]', params: { id: row.transaction.id } })}
                />
              )
            }
          />
        )}
      </View>

      <Sheet visible={filtersVisible} title="Filtros" onClose={() => setFiltersVisible(false)}>
        <View style={styles.sheetContent}>
          {accounts && accounts.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.sheetLabel}>Contas</Text>
              {accounts.map((account) => (
                <Pressable
                  key={account.id}
                  style={styles.checkboxRow}
                  onPress={() =>
                    setAccountIds((prev) => (prev.includes(account.id) ? prev.filter((id) => id !== account.id) : [...prev, account.id]))
                  }
                >
                  <Checkbox checked={accountIds.includes(account.id)} accessibilityLabel={account.name} />
                  <Text style={styles.checkboxLabel}>{account.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {categories && categories.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.sheetLabel}>Categorias</Text>
              <View style={styles.sheetChips}>
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    active={categoryIds.includes(category.id)}
                    onPress={() =>
                      setCategoryIds((prev) => (prev.includes(category.id) ? prev.filter((id) => id !== category.id) : [...prev, category.id]))
                    }
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.filterGroup}>
            <Text style={styles.sheetLabel}>Faixa de valor</Text>
            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <TextField label="Mínimo" value={minText} onChangeText={setMinText} placeholder="0,00" keyboardType="decimal-pad" />
              </View>
              <View style={styles.rangeField}>
                <TextField label="Máximo" value={maxText} onChangeText={setMaxText} placeholder="1.000,00" keyboardType="decimal-pad" />
              </View>
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  content: { flex: 1, paddingTop: space[60], paddingHorizontal: space[24], gap: space[16] },
  topRow: { flexDirection: 'row', gap: space[8] },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.surface,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.brand,
  },
  filterBadgeLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    color: colors.dark.text.onBrand,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonList: { gap: space[12] },
  list: { paddingBottom: space[40], gap: space[2] },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space[16],
    paddingBottom: space[6],
  },
  dayLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  dayBalance: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  sheetContent: { gap: space[20] },
  filterGroup: { gap: space[10] },
  sheetLabel: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  checkboxLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    color: colors.dark.text.primary,
  },
  rangeRow: { flexDirection: 'row', gap: space[12] },
  rangeField: { flex: 1 },
});

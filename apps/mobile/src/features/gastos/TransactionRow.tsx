// Linha de transação — CONTEXTO.md §6.5 ("Transações: lista agrupada por dia").
import { formatCentsWithSign } from '@planor/shared';
import { colors, Icon, space, typography } from '@planor/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoryIcon } from './categoryIcons';
import type { TransactionListItem } from '@/lib/api/types';

export type TransactionRowProps = {
  transaction: TransactionListItem;
  onPress: () => void;
  /** Troca a linha de baixo (padrão: categoria). Ex.: data e hora, na tela da categoria. */
  subtitle?: string;
  /** Texto pequeno embaixo do valor (ex.: a conta, na tela da categoria — Figma 28:461). */
  amountCaption?: string | null;
};

export function TransactionRow({ transaction, onPress, subtitle, amountCaption }: TransactionRowProps) {
  const isIncome = transaction.amountCents >= 0;
  const title = transaction.merchantName ?? transaction.descriptionRaw;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconBox}>
        <Icon name={categoryIcon(transaction.categoryName ?? '')} size={18} color={colors.dark.text.primary} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle ?? transaction.categoryName ?? 'Sem categoria'}
          {transaction.isInstallment ? ' · Parcela' : ''}
          {transaction.isHidden ? ' · Oculta' : ''}
        </Text>
      </View>
      <View style={styles.amountBox}>
        <Text style={[styles.amount, isIncome ? styles.amountIncome : null]}>{formatCentsWithSign(transaction.amountCents)}</Text>
        {amountCaption ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {amountCaption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[10],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg.control,
  },
  texts: {
    flex: 1,
    gap: space[2],
  },
  title: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
    color: colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  amountBox: {
    alignItems: 'flex-end',
    gap: space[2],
    maxWidth: '40%',
  },
  amount: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.primary,
  },
  amountIncome: {
    color: colors.dark.text.success,
  },
});

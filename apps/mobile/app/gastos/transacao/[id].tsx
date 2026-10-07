// Gastos · Detalhe da transação — CONTEXTO.md §6.5. Escopo real agora: categoria (+ "aplicar a
// compras parecidas"), conta, fatura, tipo de gasto, nota, ocultar das análises. "Marcar como
// recorrente", contexto da IA, despesa da casa e dividir com amigos ficam de fora por enquanto
// (dependem de Fase 3/Fase 5 — ver PROGRESSO.md).
import { formatCentsWithSign } from '@planor/shared';
import { Button, colors, Dialog, EmptyState, ListItem, ScreenHeader, Skeleton, space, TextField, typography } from '@planor/ui';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MudarCategoriaSheet } from '@/features/gastos/MudarCategoriaSheet';
import { TipoDeGastoSheet } from '@/features/gastos/TipoDeGastoSheet';
import { dueDayMonthLabel } from '@/lib/format';
import { useTransactionQuery, useUpdateTransactionMutation } from '@/lib/api/queries';

const EXPENSE_KIND_LABEL: Record<string, string> = { fixed: 'Fixo', variable: 'Variável' };

export default function TransacaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isPending, isError, refetch } = useTransactionQuery(id);
  const { mutate: updateTransaction, isPending: isSaving } = useUpdateTransactionMutation(id);

  const [categoriaVisible, setCategoriaVisible] = useState(false);
  const [tipoVisible, setTipoVisible] = useState(false);
  const [hideConfirmVisible, setHideConfirmVisible] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (transaction) setNote(transaction.note ?? '');
  }, [transaction]);

  if (isPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Transação" onBack={() => router.back()} />
          <Skeleton shape="bloco" width="100%" />
          <Skeleton shape="bloco" width="100%" />
        </View>
      </View>
    );
  }

  if (isError || !transaction) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState icon="aviso" title="Não deu pra carregar" text="Confira sua internet e tenta de novo." actionLabel="Tentar de novo" onAction={() => refetch()} />
      </View>
    );
  }

  const isIncome = transaction.amountCents >= 0;
  const title = transaction.merchantName ?? transaction.descriptionRaw;
  const noteChanged = note !== (transaction.note ?? '');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Transação" onBack={() => router.back()} />

        <View style={styles.summary}>
          <Text style={styles.merchant}>{title}</Text>
          <Text style={[styles.amount, isIncome ? styles.amountIncome : null]}>{formatCentsWithSign(transaction.amountCents)}</Text>
          <Text style={styles.date}>{new Date(transaction.postedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
        </View>

        <View style={styles.group}>
          <ListItem icon="sacola" title="Categoria" value={transaction.categoryName ?? 'Sem categoria'} onPress={() => setCategoriaVisible(true)} />
          <ListItem icon="banco" title="Conta" value={transaction.accountName ?? '—'} showChevron={false} />
          {transaction.statement && (
            <ListItem
              icon="cadeado"
              title="Fatura"
              value={transaction.statement.dueDate ? dueDayMonthLabel(transaction.statement.dueDate.slice(0, 10)) : transaction.statement.period}
              showChevron={false}
            />
          )}
          <ListItem icon="gastos" title="Tipo de gasto" value={transaction.expenseKind ? EXPENSE_KIND_LABEL[transaction.expenseKind] : '—'} onPress={() => setTipoVisible(true)} last />
        </View>

        <View style={styles.noteSection}>
          <TextField label="Nota" value={note} onChangeText={setNote} placeholder="Ex.: dividida com o Rafa" />
          {noteChanged && (
            <Button
              label="Salvar nota"
              onPress={() => updateTransaction({ note: note.trim() || null })}
              loading={isSaving}
            />
          )}
        </View>

        <View style={styles.group}>
          <ListItem
            icon="olho"
            title={transaction.isHidden ? 'Oculta das análises' : 'Ocultar das análises'}
            showChevron={false}
            danger={transaction.isHidden}
            onPress={() => setHideConfirmVisible(true)}
            last
          />
        </View>
      </ScrollView>

      <MudarCategoriaSheet
        visible={categoriaVisible}
        onClose={() => setCategoriaVisible(false)}
        transactionId={transaction.id}
        currentCategoryId={transaction.categoryId}
        merchantName={transaction.merchantName}
        descriptionRaw={transaction.descriptionRaw}
      />
      <TipoDeGastoSheet visible={tipoVisible} onClose={() => setTipoVisible(false)} transactionId={transaction.id} currentKind={transaction.expenseKind} />

      <Dialog
        visible={hideConfirmVisible}
        tone="alerta"
        title={transaction.isHidden ? 'Mostrar nas análises?' : 'Ocultar das análises?'}
        text={
          transaction.isHidden
            ? 'Essa transação volta a contar nos totais, categorias e no plano.'
            : 'A transação continua no extrato, mas sai dos totais, das categorias e do plano. Útil pra transferências entre contas próprias.'
        }
        confirmLabel={transaction.isHidden ? 'Mostrar' : 'Ocultar'}
        cancelLabel="Cancelar"
        onConfirm={() => {
          updateTransaction({ isHidden: !transaction.isHidden });
          setHideConfirmVisible(false);
        }}
        onCancel={() => setHideConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg.default },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] },
  content: { paddingTop: space[60], paddingHorizontal: space[24], paddingBottom: space[40], gap: space[20] },
  summary: { alignItems: 'center', gap: space[4], paddingVertical: space[8] },
  merchant: {
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    color: colors.dark.text.secondary,
  },
  amount: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.32,
    color: colors.dark.text.primary,
  },
  amountIncome: { color: colors.dark.text.success },
  date: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    letterSpacing: typography.caption.letterSpacing,
    color: colors.dark.text.tertiary,
  },
  group: {
    paddingHorizontal: space[16],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.dark.border.default,
    backgroundColor: colors.dark.bg.surface,
  },
  noteSection: { gap: space[12] },
});

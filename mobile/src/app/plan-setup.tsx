import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  addDays,
  deviceTimezone,
  monthlyToPerPaycheck,
  paydayAfter,
  perPaycheckToWeekly,
  todayInTimezone,
  type PayFrequency,
} from "@vitals/shared";
import { NumberField } from "@/components/number-field";
import { useAppTheme } from "@/hooks/use-app-theme";
import { CARD_COLORS } from "@/lib/classify";
import { formatDay, money } from "@/lib/format";
import { useStore } from "@/lib/store";

// Payday plan setup, about a minute:
// 1. take-home pay and how often  2. next payday  3. rent  4. bills
// 5. what that leaves to spend each week, then save.
// Bills are asked per month (how people know them) and stored as each
// paycheck's share.

const FREQUENCIES: { value: PayFrequency; label: string; hint: string }[] = [
  { value: "biweekly", label: "Every 2 weeks", hint: "26 paychecks a year" },
  { value: "semimonthly", label: "Twice a month", hint: "The 15th and the last day" },
  { value: "monthly", label: "Once a month", hint: "12 paychecks a year" },
];

// One chip for every loan together (car, student, personal, credit cards,
// buy now pay later). It becomes a bill marked as debt, split later if wanted.
const LOANS = "Loans and credit cards";
const COMMON_BILLS = [
  "Phone", "Internet", "Electricity", "Car insurance", "Subscriptions", "Gym", LOANS,
];

const LAST_STEP = 5;

// The next semi-monthly payday on or after today: the 15th or the last day
// of the month. Starting from yesterday means today counts if it's a payday.
function nextSemimonthlyPayday(today: string): string {
  return paydayAfter(addDays(today, -1), "semimonthly");
}

export default function PlanSetup() {
  const theme = useAppTheme();
  const router = useRouter();
  const setPaySchedule = useStore((s) => s.setPaySchedule);
  const addPlanCard = useStore((s) => s.addPlanCard);

  const payTimezone = deviceTimezone();
  const today = todayInTimezone(payTimezone);

  const [step, setStep] = useState(1);
  const [pay, setPay] = useState(0);
  const [frequency, setFrequency] = useState<PayFrequency | null>(null);
  const [nextPayday, setNextPayday] = useState<string | null>(null);
  const [rent, setRent] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [billAmounts, setBillAmounts] = useState<Record<string, number>>({});
  const [useTotal, setUseTotal] = useState(false);
  const [billsTotal, setBillsTotal] = useState(0);
  const [loansTotal, setLoansTotal] = useState(0); // with "type my total": all loan payments, per month

  // Everything per paycheck, from what was typed per month.
  const freq: PayFrequency = frequency ?? "biweekly";
  const rentPerPaycheck = monthlyToPerPaycheck(rent, freq);
  const billsMonthly = useTotal
    ? billsTotal + loansTotal
    : picked.reduce((sum, name) => sum + (billAmounts[name] ?? 0), 0);
  const billsPerPaycheck = monthlyToPerPaycheck(billsMonthly, freq);
  const spendingPerPaycheck = pay - rentPerPaycheck - billsPerPaycheck;
  const spendingWeekly = perPaycheckToWeekly(spendingPerPaycheck, freq);

  // Dates to choose the next payday from. Semi-monthly needs no choice.
  const dayChoices: string[] = [];
  const daysToShow = frequency === "monthly" ? 31 : 14;
  for (let i = 0; i < daysToShow; i++) dayChoices.push(addDays(today, i));

  function chooseFrequency(value: PayFrequency) {
    setFrequency(value);
    setNextPayday(value === "semimonthly" ? nextSemimonthlyPayday(today) : null);
  }

  function toggleBill(name: string) {
    setPicked((current) => (current.includes(name) ? current.filter((n) => n !== name) : [...current, name]));
  }

  const canContinue =
    (step === 1 && pay > 0 && frequency !== null) ||
    (step === 2 && nextPayday !== null) ||
    step === 3 ||
    step === 4;

  function save() {
    if (!frequency || !nextPayday) return;
    setPaySchedule({ frequency, nextPayday, payTimezone, paycheckAmount: pay });

    let colorIndex = 0;
    const nextColor = () => CARD_COLORS[colorIndex++ % CARD_COLORS.length];

    if (rent > 0) {
      addPlanCard({ label: "Rent", kind: "bill", amountPerPaycheck: rentPerPaycheck, color: nextColor(), isHousing: true });
    }
    if (useTotal) {
      if (billsTotal > 0) {
        addPlanCard({ label: "Bills", kind: "bill", amountPerPaycheck: monthlyToPerPaycheck(billsTotal, frequency), color: nextColor() });
      }
      if (loansTotal > 0) {
        addPlanCard({ label: "Loan payments", kind: "bill", amountPerPaycheck: monthlyToPerPaycheck(loansTotal, frequency), color: nextColor(), isDebt: true });
      }
    } else {
      for (const name of picked) {
        const monthly = billAmounts[name] ?? 0;
        if (monthly <= 0) continue;
        addPlanCard({
          label: name === LOANS ? "Loan payments" : name,
          kind: "bill",
          amountPerPaycheck: monthlyToPerPaycheck(monthly, frequency),
          color: nextColor(),
          isDebt: name === LOANS,
        });
      }
    }
    router.back();
  }

  const chip = (selected: boolean) => [
    styles.chip,
    {
      borderColor: selected ? theme.brand : theme.border,
      backgroundColor: selected ? theme.brandSoft : theme.surface,
    },
  ];
  const chipText = (selected: boolean) => ({
    color: selected ? theme.brand : theme.text,
    fontWeight: selected ? ("700" as const) : ("500" as const),
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => (step === 1 ? router.back() : setStep(step - 1))} hitSlop={12}>
            <Text style={{ color: theme.brand, fontSize: 15, fontWeight: "600" }}>{step === 1 ? "Cancel" : "Back"}</Text>
          </Pressable>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            Step {step} of {LAST_STEP}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>What lands in your account?</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>Your take-home pay for one paycheck, after tax.</Text>
              <NumberField label="Take-home pay per paycheck" value={pay} onChange={setPay} />
              <Text style={[styles.label, { color: theme.textMuted }]}>How often are you paid?</Text>
              {FREQUENCIES.map((f) => (
                <Pressable key={f.value} onPress={() => chooseFrequency(f.value)} style={[styles.option, chip(frequency === f.value)]}>
                  <Text style={chipText(frequency === f.value)}>{f.label}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{f.hint}</Text>
                </Pressable>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>When is your next payday?</Text>
              {frequency === "semimonthly" && nextPayday ? (
                <Text style={[styles.sub, { color: theme.textMuted }]}>
                  Paid on the 15th and the last day of the month, so your next payday is{" "}
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{formatDay(nextPayday)}</Text>.
                </Text>
              ) : (
                <>
                  <Text style={[styles.sub, { color: theme.textMuted }]}>Pick the date. Reminders and your weekly number follow it.</Text>
                  <View style={styles.chipRow}>
                    {dayChoices.map((day) => (
                      <Pressable key={day} onPress={() => setNextPayday(day)} style={chip(nextPayday === day)}>
                        <Text style={chipText(nextPayday === day)}>{day === today ? "Today" : formatDay(day)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Rent or mortgage</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>Per month. Leave it empty if you don't pay rent.</Text>
              <NumberField
                label="Rent per month"
                value={rent}
                onChange={setRent}
                hint={rent > 0 ? `That's ${money(rentPerPaycheck)} from each paycheck.` : undefined}
              />
            </>
          )}

          {step === 4 && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Which bills do you pay?</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                Tap the ones you have, then add what each costs a month. Rough is fine.
              </Text>
              {useTotal ? (
                <>
                  <NumberField label="All your bills, per month" value={billsTotal} onChange={setBillsTotal} hint="Not counting loans. Those go below." />
                  <NumberField
                    label="Loan and credit card payments, per month"
                    value={loansTotal}
                    onChange={setLoansTotal}
                    hint="All of them together: car, student, personal, cards."
                  />
                </>
              ) : (
                <>
                  <View style={styles.chipRow}>
                    {COMMON_BILLS.map((name) => (
                      <Pressable key={name} onPress={() => toggleBill(name)} style={chip(picked.includes(name))}>
                        <Text style={chipText(picked.includes(name))}>{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {picked.map((name) => (
                    <NumberField
                      key={name}
                      label={`${name} per month`}
                      value={billAmounts[name] ?? 0}
                      onChange={(value) => setBillAmounts((current) => ({ ...current, [name]: value }))}
                      hint={name === LOANS ? "All of them together: car, student, personal, cards. You can list them one by one later." : undefined}
                    />
                  ))}
                </>
              )}
              <Pressable onPress={() => setUseTotal(!useTotal)} hitSlop={8}>
                <Text style={[styles.link, { color: theme.brand }]}>
                  {useTotal ? "List my bills one by one instead" : "Just type my bills total instead"}
                </Text>
              </Pressable>
            </>
          )}

          {step === 5 && (
            <>
              <Text style={[styles.sub, { color: theme.textMuted }]}>After rent and bills, you can spend about</Text>
              <Text style={[styles.big, { color: spendingWeekly < 0 ? "#ef4444" : theme.text }]}>
                {spendingWeekly < 0 ? "−" : ""}
                {money(Math.abs(spendingWeekly))} a week
              </Text>
              {nextPayday && (
                <Text style={[styles.sub, { color: theme.textMuted }]}>Your next payday is {formatDay(nextPayday)}.</Text>
              )}
              <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Row label="Each paycheck" value={money(pay)} />
                <Row label="Rent" value={`− ${money(rentPerPaycheck)}`} />
                <Row label="Bills" value={`− ${money(billsPerPaycheck)}`} />
                <Row label="Left to spend" value={money(spendingPerPaycheck)} bold />
              </View>
              {spendingWeekly < 0 && (
                <Text style={[styles.sub, { color: theme.textMuted }]}>
                  Your bills are more than your paycheck. Save the plan anyway, and you can look at what to change next.
                </Text>
              )}
              <Text style={[styles.note, { color: theme.textMuted }]}>
                Next you can add savings goals and once-in-a-while costs. Nothing is linked to your bank.
              </Text>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < LAST_STEP ? (
            <Pressable
              disabled={!canContinue}
              onPress={() => setStep(step + 1)}
              style={[styles.primaryButton, { backgroundColor: theme.brand, opacity: canContinue ? 1 : 0.4 }]}
            >
              <Text style={styles.primaryText}>{step === 4 && !useTotal && picked.length === 0 ? "No bills, continue" : "Continue"}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={save} style={[styles.primaryButton, { backgroundColor: theme.brand }]}>
              <Text style={styles.primaryText}>Save my plan</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useAppTheme();
  const weight = bold ? ("700" as const) : ("400" as const);
  return (
    <View style={styles.row}>
      <Text style={{ color: bold ? theme.text : theme.textMuted, fontWeight: weight }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: weight }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  option: { borderRadius: 14, paddingVertical: 12, gap: 2 },
  link: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  big: { fontSize: 38, fontWeight: "800" },
  summary: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  note: { fontSize: 12, marginTop: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
});

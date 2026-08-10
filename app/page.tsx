"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Card = {
  id: string;
  bank: string;
  name: string;
  last4: string;
  expiryDate: string;
  dueDate: string;
  limit: number;
  debt: number;
  color: string;
};

type Movement = {
  id: string;
  type: "expense" | "income";
  source: "cash" | string;
  amount: number;
  category: string;
  note: string;
  date: string;
};

type Loan = {
  id: string;
  name: string;
  startDate: string;
  principal: number;
  installmentCount: number;
  monthlyRate: number;
};

type CardForm = {
  bank: string;
  name: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  dueDay: string;
  dueMonth: string;
  limit: string;
  debt: string;
};

type MovementForm = {
  type: "expense" | "income";
  source: "cash" | string;
  amount: string;
  category: string;
  note: string;
  date: string;
};

type LoanForm = {
  name: string;
  startDate: string;
  principal: string;
  installmentCount: string;
  monthlyRate: string;
};

type Tab = "summary" | "creditCards" | "loans" | "wallet" | "kmh" | "movements";

const dataKey = "kart-takip:v1:data";
const oldCardsKey = "kart-takip:v0.5:cards";
const colors = [
  "from-teal-500 to-emerald-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-orange-400",
  "from-violet-500 to-fuchsia-500",
];

const expenseCategories = ["Genel", "Giyim", "Seyahat", "Akaryak\u0131t", "Market", "Yeme \u0130\u00e7me", "Fatura", "Sa\u011fl\u0131k", "E\u011flence"];
const categoryColors = ["#14b8a6", "#0ea5e9", "#f43f5e", "#f59e0b", "#8b5cf6", "#22c55e", "#6366f1", "#ec4899", "#64748b"];

const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const years = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + index).slice(-2));
const today = new Date().toISOString().slice(0, 10);

const emptyCardForm: CardForm = {
  bank: "",
  name: "",
  last4: "",
  expiryMonth: "01",
  expiryYear: years[0] ?? "26",
  dueDay: "01",
  dueMonth: "01",
  limit: "",
  debt: "",
};

const emptyMovementForm: MovementForm = {
  type: "expense",
  source: "cash",
  amount: "",
  category: expenseCategories[0],
  note: "",
  date: today,
};

const emptyLoanForm: LoanForm = {
  name: "",
  startDate: today,
  principal: "",
  installmentCount: "12",
  monthlyRate: "",
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value) + " TL";
}

function parseMoney(value: string) {
  const normalized = value
    .replace(/TL/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyInput(value: string) {
  const amount = parseMoney(value);
  return amount > 0 ? money(amount) : "";
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function safeCard(raw: Partial<Card>, index: number): Card {
  const last4 = String(raw.last4 ?? "").replace(/\D/g, "").slice(-4);
  return {
    id: String(raw.id ?? `${last4}-${Date.now()}-${index}`),
    bank: String(raw.bank ?? ""),
    name: String(raw.name ?? ""),
    last4,
    expiryDate: /^\d{2}\/\d{2}$/.test(String(raw.expiryDate ?? "")) ? String(raw.expiryDate) : "01/26",
    dueDate: /^\d{2}\/\d{2}$/.test(String(raw.dueDate ?? "")) ? String(raw.dueDate) : "01/01",
    limit: Number(raw.limit) || 0,
    debt: Number(raw.debt) || 0,
    color: colors.includes(String(raw.color)) ? String(raw.color) : colors[index % colors.length],
  };
}

function safeMovement(raw: Partial<Movement>): Movement {
  return {
    id: String(raw.id ?? Date.now()),
    type: raw.type === "income" ? "income" : "expense",
    source: raw.source ? String(raw.source) : "cash",
    amount: Number(raw.amount) || 0,
    category: String(raw.category ?? "Genel"),
    note: String(raw.note ?? ""),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date ?? "")) ? String(raw.date) : today,
  };
}

function safeLoan(raw: Partial<Loan>): Loan {
  return {
    id: String(raw.id ?? Date.now()),
    name: String(raw.name ?? ""),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate ?? "")) ? String(raw.startDate) : today,
    principal: Number(raw.principal) || 0,
    installmentCount: Math.max(1, Number(raw.installmentCount) || 1),
    monthlyRate: Math.max(0, Number(raw.monthlyRate) || 0),
  };
}

function readData() {
  try {
    const stored = window.localStorage.getItem(dataKey);
    if (stored) {
      const parsed = JSON.parse(stored) as { cards?: Partial<Card>[]; movements?: Partial<Movement>[]; loans?: Partial<Loan>[]; cash?: number };
      return {
        cards: (parsed.cards ?? []).map(safeCard).filter((card) => card.bank && card.name && card.last4.length === 4),
        movements: (parsed.movements ?? []).map(safeMovement).filter((item) => item.amount > 0),
        cash: Number(parsed.cash) || 0,
        loans: (parsed.loans ?? []).map(safeLoan).filter((loan) => loan.name && loan.principal > 0),
      };
    }

    const oldCards = window.localStorage.getItem(oldCardsKey);
    if (oldCards) {
      const cards = JSON.parse(oldCards) as Partial<Card>[];
      return {
        cards: cards.map(safeCard).filter((card) => card.bank && card.name && card.last4.length === 4),
        movements: [],
        loans: [],
        cash: 0,
      };
    }
  } catch {
    return { cards: [], movements: [], loans: [], cash: 0 };
  }

  return { cards: [], movements: [], loans: [], cash: 0 };
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cash, setCash] = useState(0);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [ready, setReady] = useState(false);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);
  const [loanForm, setLoanForm] = useState<LoanForm>(emptyLoanForm);
  const [cardError, setCardError] = useState("");
  const [movementError, setMovementError] = useState("");
  const [cardModal, setCardModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [loanModal, setLoanModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardManageMode, setCardManageMode] = useState(false);
  const [movementQuery, setMovementQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  useEffect(() => {
    window.setTimeout(() => {
      const data = readData();
      setCards(data.cards);
      setMovements(data.movements);
      setCash(data.cash);
      setReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(dataKey, JSON.stringify({ cards, movements, cash }));
    }
  }, [cards, movements, cash, ready]);

  const currentMonth = monthKey(today);
  const totals = useMemo(() => {
    const totalDebt = cards.reduce((sum, card) => sum + card.debt, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.limit, 0);
    const monthItems = movements.filter((item) => monthKey(item.date) === currentMonth);
    const income = monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

    return {
      totalDebt,
      totalLimit,
      availableLimit: Math.max(0, totalLimit - totalDebt),
      income,
      expense,
      net: income - expense,
    };
  }, [cards, movements, currentMonth]);

  const sortedMovements = [...movements].sort((a, b) => b.date.localeCompare(a.date));
  const dailyExpenses = Array.from({ length: Number(today.slice(8, 10)) }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const date = `${currentMonth}-${day}`;
    const amount = movements
      .filter((item) => item.type === "expense" && item.date === date)
      .reduce((sum, item) => sum + item.amount, 0);
    return { day, amount };
  });
  const maxDailyExpense = Math.max(1, ...dailyExpenses.map((item) => item.amount));
  const cashMovements = sortedMovements.filter((item) => item.source === "cash").slice(0, 8);
  const searchedMovements = sortedMovements.filter((item) => {
    const query = movementQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return true;
    return [item.category, item.note, sourceName(item.source)].join(" ").toLocaleLowerCase("tr-TR").includes(query);
  });
  const tabs: { id: Tab; label: string; short: string }[] = [
    { id: "summary", label: "\u00d6zet", short: "\u00d6zet" },
    { id: "creditCards", label: "Kredi kartlar\u0131", short: "Kart" },
    { id: "loans", label: "Krediler", short: "Kredi" },
    { id: "wallet", label: "C\u00fczdan", short: "C\u00fczdan" },
    { id: "kmh", label: "KMH", short: "KMH" },
    { id: "movements", label: "Hareketler", short: "\u0130\u015flem" },
  ];
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "\u00d6zet";
  const chartTotal = totals.income + totals.expense;
  const incomePercent = chartTotal > 0 ? Math.round((totals.income / chartTotal) * 100) : 0;
  const expensePercent = chartTotal > 0 ? 100 - incomePercent : 0;
  const cardExpenseByCategory = expenseCategories.map((category, index) => {
    const amount = movements
      .filter((item) => item.type === "expense" && item.source !== "cash" && item.category === category && monthKey(item.date) === currentMonth)
      .reduce((sum, item) => sum + item.amount, 0);

    return { category, amount, color: categoryColors[index % categoryColors.length] };
  }).filter((item) => item.amount > 0);
  const cardExpenseTotal = cardExpenseByCategory.reduce((sum, item) => sum + item.amount, 0);

  function updateCard(field: keyof CardForm, value: string) {
    setCardForm((current) => ({
      ...current,
      [field]: field === "last4" ? value.replace(/\D/g, "").slice(0, 4) : value,
    }));
    setCardError("");
  }

  function updateMovement(field: keyof MovementForm, value: string) {
    setMovementForm((current) => ({ ...current, [field]: value }));
    setMovementError("");
  }

  function openAddCard() {
    setEditingCardId(null);
    setCardForm(emptyCardForm);
    setCardError("");
    setCardModal(true);
  }

  function openEditCard(card: Card) {
    const [expiryMonth, expiryYear] = card.expiryDate.split("/");
    const [dueDay, dueMonth] = card.dueDate.split("/");
    setEditingCardId(card.id);
    setCardForm({
      bank: card.bank,
      name: card.name,
      last4: card.last4,
      expiryMonth: expiryMonth || "01",
      expiryYear: expiryYear || (years[0] ?? "26"),
      dueDay: dueDay || "01",
      dueMonth: dueMonth || "01",
      limit: card.limit ? money(card.limit) : "",
      debt: card.debt ? money(card.debt) : "",
    });
    setCardError("");
    setCardModal(true);
  }

  function openMovement(type: "expense" | "income") {
    setMovementForm({
      ...emptyMovementForm,
      type,
      source: type === "expense" && cards[0] ? cards[0].id : "cash",
      date: today,
    });
    setMovementError("");
    setMovementModal(true);
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const bank = cardForm.bank.trim();
    const name = cardForm.name.trim();
    const last4 = cardForm.last4.trim();
    if (!bank || !name || last4.length !== 4) {
      setCardError("Banka, kart adı ve son 4 hane gerekli.");
      return;
    }

    const next: Card = {
      id: editingCardId ?? `${last4}-${Date.now()}`,
      bank,
      name,
      last4,
      expiryDate: `${cardForm.expiryMonth}/${cardForm.expiryYear}`,
      dueDate: `${cardForm.dueDay}/${cardForm.dueMonth}`,
      limit: parseMoney(cardForm.limit),
      debt: parseMoney(cardForm.debt),
      color: cards.find((card) => card.id === editingCardId)?.color ?? colors[cards.length % colors.length],
    };

    setCards((current) => editingCardId ? current.map((card) => card.id === editingCardId ? next : card) : [next, ...current]);
    setCardForm(emptyCardForm);
    setEditingCardId(null);
    setCardModal(false);
  }

  function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseMoney(movementForm.amount);
    if (amount <= 0) {
      setMovementError("Tutar 0'dan büyük olmalı.");
      return;
    }

    const next: Movement = {
      id: `${Date.now()}`,
      type: movementForm.type,
      source: movementForm.source,
      amount,
      category: movementForm.category.trim() || "Genel",
      note: movementForm.note.trim(),
      date: movementForm.date || today,
    };

    setMovements((current) => [next, ...current]);

    if (next.source === "cash") {
      setCash((current) => next.type === "income" ? current + amount : current - amount);
    } else {
      setCards((current) => current.map((card) => {
        if (card.id !== next.source) return card;
        return { ...card, debt: next.type === "expense" ? card.debt + amount : Math.max(0, card.debt - amount) };
      }));
    }

    setMovementForm(emptyMovementForm);
    setMovementModal(false);
  }

  function sourceName(source: string) {
    if (source === "cash") return "Nakit kasa";
    const card = cards.find((item) => item.id === source);
    return card ? `${card.name} *${card.last4}` : "Kart";
  }

  function updateLoan(field: keyof LoanForm, value: string) {
    setLoanForm((current) => ({ ...current, [field]: value }));
  }

  function saveLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const principal = parseMoney(loanForm.principal);
    const installmentCount = Math.max(1, Number(loanForm.installmentCount) || 1);
    const monthlyRate = Math.max(0, Number(loanForm.monthlyRate.replace(",", ".")) || 0);
    const name = loanForm.name.trim();
    if (!name || principal <= 0) return;

    setLoans((current) => [{
      id: `${Date.now()}`,
      name,
      startDate: loanForm.startDate || today,
      principal,
      installmentCount,
      monthlyRate,
    }, ...current]);
    setLoanForm(emptyLoanForm);
    setLoanModal(false);
  }

  function clearAll() {
    setCards([]);
    setMovements([]);
    setCash(0);
    window.localStorage.removeItem(dataKey);
    window.localStorage.removeItem(oldCardsKey);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Cüzdan v1.0</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">Kart takip paneli</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Kartlarını, nakit kasanı ve aylık para hareketlerini tek yerde takip et.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => openMovement("expense")} className="rounded-md bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700">Harcama ekle</button>
            <button type="button" onClick={() => openMovement("income")} className="rounded-md border border-teal-200 bg-white px-4 py-2 font-semibold text-teal-700 hover:bg-teal-50">Para girişi</button>
            <button type="button" onClick={openAddCard} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100">Kart ekle</button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm" aria-label={"Ana men\u00fc"}>
              {tabs.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-semibold transition last:mb-0 ${selected ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <span>{tab.label}</span>
                    {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 pb-24 lg:pb-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-teal-700">B&#246;l&#252;m</p>
                <h2 className="text-2xl font-semibold text-slate-950">{activeTabLabel}</h2>
              </div>
            </div>

            {activeTab === "summary" ? (
              <div className="space-y-5">
                <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <article className="kt-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-start">
                      <div>
                        <p className="text-sm text-slate-500">G&#252;nl&#252;k harcama</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totals.expense)}</p>
                        <p className="mt-1 text-xs text-slate-500">Bu ay&#305;n g&#252;nl&#252;k gider da&#287;&#305;l&#305;m&#305;</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">C&#252;zdan</p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{money(cash)}</p>
                        <p className="mt-1 text-xs text-slate-500">Eldeki nakit para</p>
                      </div>
                    </div>
                    <div className="mt-5 flex h-16 items-end gap-1.5 overflow-hidden rounded-md border border-slate-200 bg-slate-50 px-2 pb-2 pt-3">
                      {dailyExpenses.map((item) => (
                        <span
                          key={item.day}
                          title={`${item.day}: ${money(item.amount)}`}
                          className="min-h-1 flex-1 rounded-t bg-teal-500/85"
                          style={{ height: `${Math.max(6, (item.amount / maxDailyExpense) * 48)}px` }}
                        />
                      ))}
                    </div>
                  </article>

                  <article className="kt-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Toplam kart borcu</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totals.totalDebt)}</p>
                        <p className="mt-1 text-sm text-slate-500">{cards.length} kartta g&#252;ncel bakiye</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                        <p className="text-xs text-slate-500">Bo&#351; limit</p>
                        <p className="text-sm font-semibold text-slate-950">{money(totals.availableLimit)}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {cards.length > 0 ? cards.map((card) => {
                        const usage = card.limit > 0 ? Math.min(100, Math.round((card.debt / card.limit) * 100)) : 0;
                        return (
                          <div key={card.id}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                              <span className="truncate font-medium text-slate-700">{card.name}</span>
                              <span className="shrink-0 text-slate-500">%{usage}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100">
                              <span className="block h-2 rounded-full bg-blue-500" style={{ width: `${usage}%` }} />
                            </div>
                          </div>
                        );
                      }) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Kart ekledi&#287;inde doluluk oranlar&#305; burada g&#246;r&#252;n&#252;r.</p>}
                    </div>
                  </article>
                </section>

                <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <article className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">Ayl&#305;k giri&#351; / &#231;&#305;k&#305;&#351;</h2>
                        <p className="mt-1 text-sm text-slate-500">Gelir ve gider kar&#351;&#305;la&#351;t&#305;rmas&#305;</p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${totals.net >= 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
                        Net {money(totals.net)}
                      </span>
                    </div>
                    <div className="mt-5 grid gap-4">
                      <MetricBar label={"Para giri\u015fi"} value={totals.income} percent={incomePercent} tone="income" />
                      <MetricBar label="Harcama" value={totals.expense} percent={expensePercent} tone="expense" />
                    </div>
                  </article>

                  <article className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">Kart harcamalar&#305;</h2>
                        <p className="mt-1 text-sm text-slate-500">Kategori baz&#305;nda da&#287;&#305;l&#305;m</p>
                      </div>
                      <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{money(cardExpenseTotal)}</span>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {cardExpenseByCategory.length > 0 ? cardExpenseByCategory.map((item) => (
                        <CategoryBar key={item.category} item={item} total={cardExpenseTotal} />
                      )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Bu ay kartla harcama yok.</p>}
                    </div>
                  </article>
                </section>
              </div>
            ) : null}

            {activeTab === "creditCards" ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">Kart arkas&#305;nda finansal bilgiler g&#246;r&#252;n&#252;r. Silme ve d&#252;zenleme i&#351;lemleri d&#252;zenleme modundad&#305;r.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setCardManageMode((current) => !current)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">{cardManageMode ? "D\u00fczenlemeyi kapat" : "Kartlar\u0131 d\u00fczenle"}</button>
                    <button type="button" onClick={openAddCard} className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">Kart ekle</button>
                  </div>
                </div>
                {cards.length > 0 ? (
                  <div className="grid gap-8 overflow-visible md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => {
                      const usage = card.limit > 0 ? Math.min(100, Math.round((card.debt / card.limit) * 100)) : 0;
                      return <CardTile key={card.id} card={card} usage={usage} manageMode={cardManageMode} onEdit={() => openEditCard(card)} onDelete={() => setCards((current) => current.filter((item) => item.id !== card.id))} />;
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                    Hen&#252;z kart yok. &#304;lk kart&#305;n&#305; ekleyerek ba&#351;layabilirsin.
                  </div>
                )}
                <article className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold">Yakla&#351;an &#246;demeler</h2>
                  <div className="mt-3 divide-y divide-slate-100">
                    {cards.length > 0 ? cards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="font-medium">{card.name}</p>
                          <p className="text-sm text-slate-500">Son &#246;deme: {card.dueDate}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-950">{money(card.debt)}</span>
                      </div>
                    )) : <p className="py-3 text-sm text-slate-500">&#214;deme takibi i&#231;in kart ekle.</p>}
                  </div>
                </article>
              </div>
            ) : null}
            {activeTab === "loans" ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">Kredi kullan&#305;m tarihi, taksit say&#305;s&#305;, faiz oran&#305; ve &#246;deme plan&#305;.</p>
                  <button type="button" onClick={() => setLoanModal(true)} className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">Kredi ekle</button>
                </div>
                {loans.length > 0 ? (
                  <div className="grid gap-4">
                    {loans.map((loan) => (
                      <LoanCard key={loan.id} loan={loan} onDelete={() => setLoans((current) => current.filter((item) => item.id !== loan.id))} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
                    Hen&#252;z kredi yok. &#304;lk kredi kayd&#305;n&#305; ekleyerek &#246;deme plan&#305;n&#305; g&#246;rebilirsin.
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "wallet" ? (
              <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <article className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Nakit kasa</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{money(cash)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Eldeki nakit paran&#305; ve nakit giri&#351; &#231;&#305;k&#305;&#351;lar&#305;n&#305; burada takip edebilirsin.</p>
                  <div className="mt-5 grid gap-3">
                    <button type="button" onClick={() => openMovement("income")} className="rounded-md bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700">Kasaya para ekle</button>
                    <button type="button" onClick={() => openMovement("expense")} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Nakit harcama ekle</button>
                  </div>
                </article>
                <article className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold">C&#252;zdan hareketleri</h2>
                  <MovementList items={cashMovements} sourceName={sourceName} />
                </article>
              </section>
            ) : null}

            {activeTab === "kmh" ? (
              <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
                <h2 className="text-lg font-semibold text-slate-950">KMH</h2>
                <p className="mt-2 leading-6">Kredili mevduat hesab&#305; takibi i&#231;in ayr&#305; alan haz&#305;r. Limit, kullan&#305;lan tutar ve faiz/&#246;deme takibini burada ayr&#305;ca tasarlayabiliriz.</p>
              </section>
            ) : null}

            {activeTab === "movements" ? (
              <section className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Hareketler</h2>
                    <p className="mt-1 text-sm text-slate-500">Kart ve nakit hareketlerinin kay&#305;tlar&#305;.</p>
                  </div>
                  <button type="button" onClick={clearAll} className="w-fit rounded-md border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">T&#252;m verileri temizle</button>
                </div>
                <div className="mt-4">
                  <input
                    value={movementQuery}
                    onChange={(event) => setMovementQuery(event.target.value)}
                    placeholder={"İşlem adı, kategori veya kaynak ara"}
                    className="field"
                  />
                </div>
                <MovementList items={searchedMovements} sourceName={sourceName} empty={movementQuery ? "Aramaya uygun i\u015flem bulunamad\u0131." : "Hen\u00fcz i\u015flem yok. Harcama veya para giri\u015fi ekleyerek ba\u015flayabilirsin."} />
              </section>
            ) : null}
          </section>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden" aria-label={"Mobil men\u00fc"}>
          <div className="mx-auto grid max-w-2xl grid-cols-6 gap-1">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-1 py-2 text-xs font-semibold transition ${selected ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {tab.short}
                </button>
              );
            })}
          </div>
        </nav>

      </div>

      {cardModal ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <form onSubmit={saveCard} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <ModalHeader title={editingCardId ? "Kart\u0131 d\u00fczenle" : "Kart ekle"} onClose={() => setCardModal(false)} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField label="Banka" value={cardForm.bank} onChange={(value) => updateCard("bank", value)} placeholder="Garanti BBVA" />
              <TextField label={"Kart ad\u0131"} value={cardForm.name} onChange={(value) => updateCard("name", value)} placeholder="Bonus Platinum" />
              <TextField label="Son 4 hane" value={cardForm.last4} onChange={(value) => updateCard("last4", value)} placeholder="4821" inputMode="numeric" maxLength={4} />
              <SelectPair label="Son kullanma tarihi" first={cardForm.expiryMonth} second={cardForm.expiryYear} firstOptions={months} secondOptions={years} onFirst={(value) => updateCard("expiryMonth", value)} onSecond={(value) => updateCard("expiryYear", value)} />
              <SelectPair label={"Son \u00f6deme tarihi"} first={cardForm.dueDay} second={cardForm.dueMonth} firstOptions={days} secondOptions={months} onFirst={(value) => updateCard("dueDay", value)} onSecond={(value) => updateCard("dueMonth", value)} />
              <TextField label="Limit" value={cardForm.limit} onChange={(value) => updateCard("limit", value)} onBlur={() => setCardForm((current) => ({ ...current, limit: moneyInput(current.limit) }))} placeholder="14.568,00 TL" inputMode="decimal" />
              <TextField label={"G\u00fcncel bor\u00e7"} value={cardForm.debt} onChange={(value) => updateCard("debt", value)} onBlur={() => setCardForm((current) => ({ ...current, debt: moneyInput(current.debt) }))} placeholder="14.568,00 TL" inputMode="decimal" wide />
            </div>
            {cardError ? <ErrorText text={cardError} /> : null}
            <ModalActions onCancel={() => setCardModal(false)} submit={editingCardId ? "De\u011fi\u015fiklikleri kaydet" : "Kart\u0131 kaydet"} />
          </form>
        </div>
      ) : null}


      {loanModal ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <form onSubmit={saveLoan} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <ModalHeader title="Kredi ekle" onClose={() => setLoanModal(false)} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField label={"Kredi ad\u0131"} value={loanForm.name} onChange={(value) => updateLoan("name", value)} placeholder={"İhtiyaç kredisi"} />
              <TextField label={"Kullan\u0131m tarihi"} type="date" value={loanForm.startDate} onChange={(value) => updateLoan("startDate", value)} />
              <TextField label={"Kredi tutar\u0131"} value={loanForm.principal} onChange={(value) => updateLoan("principal", value)} onBlur={() => setLoanForm((current) => ({ ...current, principal: moneyInput(current.principal) }))} placeholder="100.000,00 TL" inputMode="decimal" />
              <TextField label={"Taksit say\u0131s\u0131"} value={loanForm.installmentCount} onChange={(value) => updateLoan("installmentCount", value.replace(/\D/g, ""))} placeholder="12" inputMode="numeric" />
              <TextField label={"Ayl\u0131k faiz oran\u0131 (%)"} value={loanForm.monthlyRate} onChange={(value) => updateLoan("monthlyRate", value.replace(/[^\d,.]/g, ""))} placeholder="3,49" inputMode="decimal" wide />
            </div>
            <ModalActions onCancel={() => setLoanModal(false)} submit="Krediyi kaydet" />
          </form>
        </div>
      ) : null}
      {movementModal ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <form onSubmit={saveMovement} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <ModalHeader title={movementForm.type === "income" ? "Para giri\u015fi" : "Harcama ekle"} onClose={() => setMovementModal(false)} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span>{"\u0130\u015flem t\u00fcr\u00fc"}</span>
                <select value={movementForm.type} onChange={(event) => updateMovement("type", event.target.value as MovementForm["type"])} className="field">
                  <option value="expense">Harcama</option>
                  <option value="income">{"Para giri\u015fi"}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Kaynak</span>
                <select value={movementForm.source} onChange={(event) => updateMovement("source", event.target.value)} className="field">
                  <option value="cash">Nakit kasa</option>
                  {cards.map((card) => <option key={card.id} value={card.id}>{card.name} *{card.last4}</option>)}
                </select>
              </label>
              <TextField label="Tutar" value={movementForm.amount} onChange={(value) => updateMovement("amount", value)} onBlur={() => setMovementForm((current) => ({ ...current, amount: moneyInput(current.amount) }))} placeholder="14.568,00 TL" inputMode="decimal" />
              <TextField label="Tarih" type="date" value={movementForm.date} onChange={(value) => updateMovement("date", value)} />
              <label className="space-y-2 text-sm text-slate-700">
                <span>Kategori</span>
                <select value={movementForm.category} onChange={(event) => updateMovement("category", event.target.value)} className="field">
                  {expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <TextField label="Not" value={movementForm.note} onChange={(value) => updateMovement("note", value)} placeholder={"\u0130ste\u011fe ba\u011fl\u0131"} />
            </div>
            {movementError ? <ErrorText text={movementError} /> : null}
            <ModalActions onCancel={() => setMovementModal(false)} submit={"\u0130\u015flemi kaydet"} />
          </form>
        </div>
      ) : null}
    </main>
  );
}


function MetricBar({ label, value, percent, tone }: { label: string; value: number; percent: number; tone: "income" | "expense" }) {
  const color = tone === "income" ? "bg-emerald-500" : "bg-rose-500";
  const soft = tone === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${soft}`}>%{percent}</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, percent)}%` }} />
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-950">{money(value)}</p>
    </div>
  );
}

function CategoryBar({ item, total }: { item: { category: string; amount: number; color: string }; total: number }) {
  const percent = total > 0 ? Math.round((item.amount / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="truncate text-sm font-medium text-slate-700">{item.category}</span>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-950">{money(item.amount)}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, percent)}%`, background: item.color }} />
      </div>
    </div>
  );
}
function CardTile({
  card,
  usage,
  manageMode,
  onEdit,
  onDelete,
}: {
  card: Card;
  usage: number;
  manageMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const maskedNumber = `1234 1234 1234 ${card.last4}`;
  const flipClass = open ? "[transform:rotateY(180deg)]" : "group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)]";

  return (
    <div className="group relative z-0 rounded-[22px] [perspective:1200px] hover:z-20 focus-within:z-20">
      <div className={`relative aspect-[1.72/1] rounded-[22px] transition duration-500 [transform-style:preserve-3d] ${flipClass}`}>
        <article
          role="button"
          tabIndex={0}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
          className={`absolute inset-0 cursor-pointer overflow-hidden rounded-[22px] bg-gradient-to-br ${card.color} p-5 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] ring-1 ring-white/20 transition group-hover:-translate-y-1 group-hover:shadow-[0_22px_45px_rgba(15,23,42,0.22)] [backface-visibility:hidden]`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.20),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.30),rgba(15,23,42,0.08)_42%,rgba(255,255,255,0.08))]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{card.bank}</p>
                <h3 className="mt-1 text-base font-semibold">{card.name}</h3>
              </div>
              <ContactlessMark />
            </div>

            <Chip />

            <div>
              <div className="mb-2 grid grid-cols-[1fr_auto] items-end gap-3 text-[10px] uppercase tracking-wide text-white/75">
                <span>{card.name}</span>
                <span>{card.expiryDate}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[clamp(0.9rem,3.8vw,1.08rem)] tracking-[0.08em] text-white">{maskedNumber}</p>
                <CardBrandMark />
              </div>
            </div>
          </div>
        </article>

        <article
          role="button"
          tabIndex={0}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
          className={`absolute inset-0 cursor-pointer overflow-hidden rounded-[22px] bg-gradient-to-br ${card.color} p-4 text-white shadow-[0_22px_45px_rgba(15,23,42,0.22)] ring-1 ring-white/25 [backface-visibility:hidden] [transform:rotateY(180deg)]`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.24),rgba(15,23,42,0.08)_48%,rgba(255,255,255,0.10))]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{card.bank}</p>
                <h3 className="mt-1 text-base font-semibold">{card.name}</h3>
              </div>
              <ContactlessMark />
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-md">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/75">Limit</span>
                  <span className="font-semibold">{money(card.limit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/75">G&#252;ncel bor&#231;</span>
                  <span className="font-semibold">{money(card.debt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/75">Kullan&#305;m</span>
                  <span className="font-semibold">%{usage}</span>
                </div>
                <div className="h-2 rounded-full bg-white/25">
                  <div className="h-2 rounded-full bg-white" style={{ width: `${usage}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-white/75">
                  <span>SKT: {card.expiryDate}</span>
                  <span className="text-right">&#214;deme: {card.dueDate}</span>
                </div>
              </div>
            </div>

          </div>
        </article>
      </div>
      {manageMode ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onEdit} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">D&#252;zenle</button>
          <button type="button" onClick={onDelete} className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">Sil</button>
        </div>
      ) : null}
    </div>
  );
}

function ContactlessMark() {
  return (
    <div className="relative h-7 w-7">
      <span className="absolute right-0 top-1 h-5 w-5 rounded-full border-2 border-white/85" />
      <span className="absolute right-1 top-0 h-7 w-7 rounded-full border-2 border-white/65" />
      <span className="absolute right-2 -top-1 h-9 w-9 rounded-full border-2 border-white/40" />
    </div>
  );
}

function Chip() {
  return (
    <div className="grid h-8 w-10 place-items-center rounded-md bg-white/90 shadow-sm">
      <div className="grid grid-cols-2 gap-0.5">
        <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
        <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
        <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
        <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
      </div>
    </div>
  );
}

function CardBrandMark() {
  return (
    <div className="relative h-7 w-11 shrink-0 rounded-md bg-white/15">
      <span className="absolute left-2 top-1.5 h-4 w-4 rounded-full bg-red-500" />
      <span className="absolute left-5 top-1.5 h-4 w-4 rounded-full bg-amber-400 mix-blend-screen" />
    </div>
  );
}
function MovementList({
  items,
  sourceName,
  empty = "Hen\u00fcz kay\u0131t yok.",
}: {
  items: Movement[];
  sourceName: (source: string) => string;
  empty?: string;
}) {
  return (
    <div className="mt-4 grid gap-3">
      {items.length > 0 ? items.map((item) => {
        const isIncome = item.type === "income";

        return (
          <div key={item.id} className={`grid gap-3 rounded-lg border p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center ${isIncome ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
            <div className={`grid h-11 w-11 place-items-center rounded-full text-lg font-semibold ${isIncome ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
              {isIncome ? "+" : "-"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">{item.category}</p>
                <span className={`rounded-full bg-white px-2 py-0.5 text-xs font-medium ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>
                  {isIncome ? "Para giri\u015fi" : "Harcama"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{sourceName(item.source)}{item.note ? ` Â· ${item.note}` : ""}</p>
              <p className="mt-1 text-xs text-slate-500">{item.date}</p>
            </div>
            <p className={`text-lg font-semibold ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>
              {isIncome ? "+" : "-"}{money(item.amount)}
            </p>
          </div>
        );
      }) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{empty}</p>}
    </div>
  );
}

function LoanCard({ loan, onDelete }: { loan: Loan; onDelete: () => void }) {
  const rate = loan.monthlyRate / 100;
  const monthlyPayment = rate > 0
    ? loan.principal * (rate / (1 - Math.pow(1 + rate, -loan.installmentCount)))
    : loan.principal / loan.installmentCount;
  const schedule = Array.from({ length: loan.installmentCount }, (_, index) => {
    const paidMonths = index;
    const remainingBefore = rate > 0
      ? loan.principal * Math.pow(1 + rate, paidMonths) - monthlyPayment * ((Math.pow(1 + rate, paidMonths) - 1) / rate)
      : loan.principal - monthlyPayment * paidMonths;
    const interest = remainingBefore * rate;
    const principalPayment = Math.min(remainingBefore, monthlyPayment - interest);
    return {
      month: index + 1,
      payment: monthlyPayment,
      interest,
      balance: Math.max(0, remainingBefore - principalPayment),
    };
  });
  const totalPayment = monthlyPayment * loan.installmentCount;

  return (
    <article className="kt-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{loan.name}</h3>
          <p className="mt-1 text-sm text-slate-500">Kullan&#305;m tarihi: {loan.startDate}</p>
        </div>
        <button type="button" onClick={onDelete} className="w-fit rounded-md border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">Sil</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Kredi tutar&#305;</p>
          <p className="mt-1 font-semibold">{money(loan.principal)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Taksit</p>
          <p className="mt-1 font-semibold">{loan.installmentCount} x {money(monthlyPayment)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Toplam geri &#246;deme</p>
          <p className="mt-1 font-semibold">{money(totalPayment)}</p>
        </div>
      </div>
      <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-200">
        <div className="grid grid-cols-[56px_1fr_1fr_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          <span>Ay</span>
          <span>Taksit</span>
          <span>Faiz</span>
          <span>Kalan</span>
        </div>
        {schedule.map((item) => (
          <div key={item.month} className="grid grid-cols-[56px_1fr_1fr_1fr] border-t border-slate-100 px-3 py-2 text-sm">
            <span>{item.month}</span>
            <span>{money(item.payment)}</span>
            <span>{money(item.interest)}</span>
            <span>{money(item.balance)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Bilgileri istediğin zaman düzenleyebilirsin.</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Kapat</button>
    </div>
  );
}

function ModalActions({ onCancel, submit }: { onCancel: () => void; submit: string }) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Vazgeç</button>
      <button type="submit" className="rounded-md bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700">{submit}</button>
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{text}</p>;
}

function TextField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  inputMode,
  maxLength,
  type = "text",
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  maxLength?: number;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`space-y-2 text-sm text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        className="field"
      />
    </label>
  );
}

function SelectPair({
  label,
  first,
  second,
  firstOptions,
  secondOptions,
  onFirst,
  onSecond,
}: {
  label: string;
  first: string;
  second: string;
  firstOptions: string[];
  secondOptions: string[];
  onFirst: (value: string) => void;
  onSecond: (value: string) => void;
}) {
  return (
    <div className="space-y-2 text-sm text-slate-700">
      <span>{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <select value={first} onChange={(event) => onFirst(event.target.value)} className="field">
          {firstOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={second} onChange={(event) => onSecond(event.target.value)} className="field">
          {secondOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-400">Format: {first}/{second}</p>
    </div>
  );
}

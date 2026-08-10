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

type Tab = "summary" | "creditCards" | "loans" | "wallet" | "kmh" | "movements";

const dataKey = "kart-takip:v1:data";
const oldCardsKey = "kart-takip:v0.5:cards";
const colors = [
  "from-teal-500 to-emerald-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-orange-400",
  "from-violet-500 to-fuchsia-500",
];

const expenseCategories = ["Genel", "Giyim", "Seyahat", "Akaryakıt", "Market", "Yeme İçme", "Fatura", "Sağlık", "Eğlence"];
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

function readData() {
  try {
    const stored = window.localStorage.getItem(dataKey);
    if (stored) {
      const parsed = JSON.parse(stored) as { cards?: Partial<Card>[]; movements?: Partial<Movement>[]; cash?: number };
      return {
        cards: (parsed.cards ?? []).map(safeCard).filter((card) => card.bank && card.name && card.last4.length === 4),
        movements: (parsed.movements ?? []).map(safeMovement).filter((item) => item.amount > 0),
        cash: Number(parsed.cash) || 0,
      };
    }

    const oldCards = window.localStorage.getItem(oldCardsKey);
    if (oldCards) {
      const cards = JSON.parse(oldCards) as Partial<Card>[];
      return {
        cards: cards.map(safeCard).filter((card) => card.bank && card.name && card.last4.length === 4),
        movements: [],
        cash: 0,
      };
    }
  } catch {
    return { cards: [], movements: [], cash: 0 };
  }

  return { cards: [], movements: [], cash: 0 };
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cash, setCash] = useState(0);
  const [ready, setReady] = useState(false);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);
  const [cardError, setCardError] = useState("");
  const [movementError, setMovementError] = useState("");
  const [cardModal, setCardModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
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
  const cashMovements = sortedMovements.filter((item) => item.source === "cash").slice(0, 8);
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
  const chartStyle = {
    background: chartTotal > 0
      ? `conic-gradient(#10b981 0 ${incomePercent}%, #f43f5e ${incomePercent}% 100%)`
      : "conic-gradient(#e2e8f0 0 100%)",
  };
  const cardExpenseByCategory = expenseCategories.map((category, index) => {
    const amount = movements
      .filter((item) => item.type === "expense" && item.source !== "cash" && item.category === category && monthKey(item.date) === currentMonth)
      .reduce((sum, item) => sum + item.amount, 0);

    return { category, amount, color: categoryColors[index % categoryColors.length] };
  }).filter((item) => item.amount > 0);
  const cardExpenseTotal = cardExpenseByCategory.reduce((sum, item) => sum + item.amount, 0);
  let categoryCursor = 0;
  const cardCategoryGradient = cardExpenseTotal > 0
    ? `conic-gradient(${cardExpenseByCategory.map((item) => {
        const start = categoryCursor;
        const size = (item.amount / cardExpenseTotal) * 100;
        categoryCursor += size;
        return `${item.color} ${start}% ${categoryCursor}%`;
      }).join(", ")})`
    : "conic-gradient(#e2e8f0 0 100%)";

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
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Ayl\u0131k harcama", money(totals.expense), "Bu ay girilen giderler"],
                    ["Nakit kasa", money(cash), "Eldeki nakit para"],
                    ["Ayl\u0131k harcama", money(totals.expense), "Bu ay girilen giderler"],
                    ["Toplam kart borcu", money(totals.totalDebt), `${cards.length} kartta g\u00fcncel bakiye`],
                  ].map(([label, value, note]) => (
                    <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
                      <p className="mt-2 text-sm text-slate-500">{note}</p>
                    </article>
                  ))}
                </section>

                <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">Ayl&#305;k giri&#351; / &#231;&#305;k&#305;&#351;</h2>
                        <p className="mt-1 text-sm text-slate-500">Gelir ve gider oran&#305;</p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${totals.net >= 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
                        Net {money(totals.net)}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
                      <div className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full" style={chartStyle}>
                        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner">
                          <div>
                            <p className="text-xs text-slate-500">Gider</p>
                            <p className="text-xl font-semibold text-slate-950">%{expensePercent}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid w-full gap-3">
                        <div className="rounded-lg bg-emerald-50 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-emerald-800">Para giri&#351;i</span>
                            <span className="text-emerald-700">%{incomePercent}</span>
                          </div>
                          <p className="mt-2 text-xl font-semibold text-emerald-900">{money(totals.income)}</p>
                        </div>
                        <div className="rounded-lg bg-rose-50 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-rose-800">Harcama</span>
                            <span className="text-rose-700">%{expensePercent}</span>
                          </div>
                          <p className="mt-2 text-xl font-semibold text-rose-900">{money(totals.expense)}</p>
                        </div>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-950">Kart harcamalar&#305;</h2>
                    <p className="mt-1 text-sm text-slate-500">Giyim, seyahat, akaryak&#305;t ve di&#287;er kart harcamalar&#305;</p>
                    <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
                      <div className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full" style={{ background: cardCategoryGradient }}>
                        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner">
                          <div>
                            <p className="text-xs text-slate-500">Kart gideri</p>
                            <p className="text-base font-semibold text-slate-950">{money(cardExpenseTotal)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid w-full gap-2">
                        {cardExpenseByCategory.length > 0 ? cardExpenseByCategory.map((item) => (
                          <div key={item.category} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                              <span className="text-sm font-medium text-slate-700">{item.category}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-950">{money(item.amount)}</span>
                          </div>
                        )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Bu ay kartla harcama yok.</p>}
                      </div>
                    </div>
                  </article>
                </section>
              </div>
            ) : null}

            {activeTab === "creditCards" ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">Kapal&#305; kartta limit g&#246;r&#252;n&#252;r. Detay i&#231;in kart&#305;n &#252;zerine gel veya karta dokun.</p>
                  <button type="button" onClick={openAddCard} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Kart ekle</button>
                </div>
                {cards.length > 0 ? (
                  <div className="grid gap-8 overflow-visible md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => {
                      const usage = card.limit > 0 ? Math.min(100, Math.round((card.debt / card.limit) * 100)) : 0;
                      return <CardTile key={card.id} card={card} usage={usage} onEdit={() => openEditCard(card)} onDelete={() => setCards((current) => current.filter((item) => item.id !== card.id))} />;
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                    Hen&#252;z kart yok. &#304;lk kart&#305;n&#305; ekleyerek ba&#351;layabilirsin.
                  </div>
                )}
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
              <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
                <h2 className="text-lg font-semibold text-slate-950">Krediler</h2>
                <p className="mt-2 leading-6">Bu b&#246;l&#252;m kredi takibi i&#231;in ayr&#305;ld&#305;. Bir sonraki ad&#305;mda kredi ad&#305;, taksit tutar&#305;, kalan taksit ve &#246;deme g&#252;n&#252; ekleme ekran&#305;n&#305; burada a&#231;abiliriz.</p>
              </section>
            ) : null}

            {activeTab === "wallet" ? (
              <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Nakit kasa</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{money(cash)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Eldeki nakit paran&#305; ve nakit giri&#351; &#231;&#305;k&#305;&#351;lar&#305;n&#305; burada takip edebilirsin.</p>
                  <div className="mt-5 grid gap-3">
                    <button type="button" onClick={() => openMovement("income")} className="rounded-md bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700">Kasaya para ekle</button>
                    <button type="button" onClick={() => openMovement("expense")} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Nakit harcama ekle</button>
                  </div>
                </article>
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Hareketler</h2>
                    <p className="mt-1 text-sm text-slate-500">Kart ve nakit hareketlerinin kay&#305;tlar&#305;.</p>
                  </div>
                  <button type="button" onClick={clearAll} className="w-fit rounded-md border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">T&#252;m verileri temizle</button>
                </div>
                <MovementList items={sortedMovements} sourceName={sourceName} empty={"Hen\u00fcz i\u015flem yok. Harcama veya para giri\u015fi ekleyerek ba\u015flayabilirsin."} />
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

function CardTile({
  card,
  usage,
  onEdit,
  onDelete,
}: {
  card: Card;
  usage: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const maskedNumber = `1234 1234 1234 ${card.last4}`;

  return (
    <div className="group relative overflow-visible rounded-[22px] pb-16 focus-within:z-20 hover:z-20">
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
        className={`relative aspect-[1.72/1] cursor-pointer overflow-hidden rounded-[22px] bg-gradient-to-br ${card.color} p-5 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] ring-1 ring-white/20 transition group-hover:-translate-y-1 group-hover:shadow-[0_22px_45px_rgba(15,23,42,0.22)]`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.20),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.30),rgba(15,23,42,0.08)_42%,rgba(255,255,255,0.08))]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{card.bank}</p>
              <h3 className="mt-1 text-base font-semibold">{card.name}</h3>
            </div>
            <div className="relative h-7 w-7">
              <span className="absolute right-0 top-1 h-5 w-5 rounded-full border-2 border-white/85" />
              <span className="absolute right-1 top-0 h-7 w-7 rounded-full border-2 border-white/65" />
              <span className="absolute right-2 -top-1 h-9 w-9 rounded-full border-2 border-white/40" />
            </div>
          </div>

          <div className="grid h-8 w-10 place-items-center rounded-md bg-white/90 shadow-sm">
            <div className="grid grid-cols-2 gap-0.5">
              <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
              <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
              <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
              <span className="h-2.5 w-3 rounded-[2px] bg-slate-300" />
            </div>
          </div>

          <div>
            <div className="mb-2 grid grid-cols-[1fr_auto] items-end gap-3 text-[10px] uppercase tracking-wide text-white/75">
              <span>{card.name}</span>
              <span>{card.expiryDate}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[clamp(0.9rem,3.8vw,1.08rem)] tracking-[0.08em] text-white">{maskedNumber}</p>
              <div className="relative h-7 w-11 shrink-0 rounded-md bg-white/15">
                <span className="absolute left-2 top-1.5 h-4 w-4 rounded-full bg-red-500" />
                <span className="absolute left-5 top-1.5 h-4 w-4 rounded-full bg-amber-400 mix-blend-screen" />
              </div>
            </div>
          </div>
        </div>
      </article>
      <div className={`absolute inset-x-3 top-[78%] z-10 rounded-xl border border-slate-200 bg-white p-4 text-slate-950 shadow-xl transition ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"}`}>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Limit</span>
            <span className="font-semibold">{money(card.limit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">G&#252;ncel bor&#231;</span>
            <span className="font-semibold">{money(card.debt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Kullan&#305;m</span>
            <span className="font-semibold">%{usage}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-teal-500" style={{ width: `${usage}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <span>SKT: {card.expiryDate}</span>
            <span className="text-right">&#214;deme: {card.dueDate}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">D&#252;zenle</button>
            <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded-md border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">Sil</button>
          </div>
        </div>
      </div>
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

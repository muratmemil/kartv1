"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Card = {
  id: string;
  bank: string;
  name: string;
  last4: string;
  color: string;
  debt: number;
  limit: number;
  dueDate: string;
  dueAmount: number;
};

type CardForm = {
  bank: string;
  name: string;
  last4: string;
  debt: string;
  limit: string;
  dueDate: string;
  dueAmount: string;
};

type Payment = {
  id: string;
  card: string;
  date: string;
  amount: number;
  status: "Yaklasiyor" | "Planlandi" | "Odendi";
};

type Transaction = {
  merchant: string;
  card: string;
  date: string;
  amount: string;
  category: string;
};

const storageKey = "kart-takip:v0.2:cards";

const colorOptions = [
  "from-emerald-500 to-cyan-500",
  "from-rose-500 to-orange-400",
  "from-sky-500 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
];

const initialCards: Card[] = [
  {
    id: "bonus-4821",
    bank: "Garanti BBVA",
    name: "Bonus Platinum",
    last4: "4821",
    color: colorOptions[0],
    debt: 18420,
    limit: 75000,
    dueDate: "18 Agu",
    dueAmount: 7250,
  },
  {
    id: "axess-7394",
    bank: "Akbank",
    name: "Axess",
    last4: "7394",
    color: colorOptions[1],
    debt: 9860,
    limit: 45000,
    dueDate: "24 Agu",
    dueAmount: 3100,
  },
  {
    id: "world-1168",
    bank: "Yapi Kredi",
    name: "World",
    last4: "1168",
    color: colorOptions[2],
    debt: 5340,
    limit: 30000,
    dueDate: "02 Eyl",
    dueAmount: 1600,
  },
];

const emptyForm: CardForm = {
  bank: "",
  name: "",
  last4: "",
  debt: "",
  limit: "",
  dueDate: "",
  dueAmount: "",
};

const transactions: Transaction[] = [
  { merchant: "Migros", card: "Bonus *4821", date: "Bugun", amount: "-842 TL", category: "Market" },
  { merchant: "Shell", card: "Axess *7394", date: "Dun", amount: "-1.250 TL", category: "Ulasim" },
  { merchant: "Netflix", card: "World *1168", date: "08 Agu", amount: "-229 TL", category: "Abonelik" },
  { merchant: "Hepsiburada", card: "Bonus *4821", date: "06 Agu", amount: "-2.480 TL", category: "Alisveris" },
];

const statusStyles: Record<Payment["status"], string> = {
  Yaklasiyor: "bg-amber-400/15 text-amber-200 ring-amber-300/20",
  Planlandi: "bg-cyan-400/10 text-cyan-200 ring-cyan-300/20",
  Odendi: "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value) + " TL";
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getUtilization(card: Card) {
  if (card.limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((card.debt / card.limit) * 100));
}

function makePayments(cards: Card[]): Payment[] {
  return cards.map((card, index) => ({
    id: card.id,
    card: card.name,
    date: card.dueDate,
    amount: card.dueAmount,
    status: index === 0 ? "Yaklasiyor" : "Planlandi",
  }));
}

function safeCardFromUnknown(card: Card) {
  return {
    id: String(card.id),
    bank: String(card.bank),
    name: String(card.name),
    last4: String(card.last4).replace(/\D/g, "").slice(-4),
    color: colorOptions.includes(card.color) ? card.color : colorOptions[0],
    debt: Number(card.debt) || 0,
    limit: Number(card.limit) || 0,
    dueDate: String(card.dueDate),
    dueAmount: Number(card.dueAmount) || 0,
  };
}

function getStoredCards() {
  if (typeof window === "undefined") {
    return initialCards;
  }

  try {
    const storedCards = window.localStorage.getItem(storageKey);
    if (!storedCards) {
      return initialCards;
    }

    const parsed = JSON.parse(storedCards) as Card[];
    return parsed.map(safeCardFromUnknown).filter((card) => card.last4.length === 4);
  } catch {
    return initialCards;
  }
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>(getStoredCards);
  const [form, setForm] = useState<CardForm>(emptyForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cards));
  }, [cards]);

  const totals = useMemo(() => {
    const totalDebt = cards.reduce((sum, card) => sum + card.debt, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.limit, 0);
    const totalDue = cards.reduce((sum, card) => sum + card.dueAmount, 0);
    const availableLimit = Math.max(0, totalLimit - totalDebt);
    const utilization = totalLimit > 0 ? Math.round((totalDebt / totalLimit) * 100) : 0;

    return { totalDebt, totalLimit, totalDue, availableLimit, utilization };
  }, [cards]);

  const summary = [
    { label: "Toplam borc", value: formatCurrency(totals.totalDebt), note: `${cards.length} kartta guncel bakiye` },
    { label: "Bu ay odenecek", value: formatCurrency(totals.totalDue), note: "Ekstrelerden gelen toplam" },
    { label: "Kullanilabilir limit", value: formatCurrency(totals.availableLimit), note: `Toplam limit ${formatCurrency(totals.totalLimit)}` },
    { label: "Ortalama kullanim", value: `%${totals.utilization}`, note: totals.utilization < 50 ? "Risk seviyesi dusuk" : "Kontrol gerekli" },
  ];

  const payments = makePayments(cards);

  function updateForm(field: keyof CardForm, value: string) {
    const safeValue = field === "last4" ? value.replace(/\D/g, "").slice(0, 4) : value;
    setForm((current) => ({ ...current, [field]: safeValue }));
  }

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const bank = form.bank.trim();
    const name = form.name.trim();
    const last4 = form.last4.trim();
    const dueDate = form.dueDate.trim();
    const debt = parseMoney(form.debt);
    const limit = parseMoney(form.limit);
    const dueAmount = parseMoney(form.dueAmount);

    if (!bank || !name || !dueDate || last4.length !== 4 || limit <= 0) {
      setFormError("Banka, kart adi, son 4 hane, limit ve son odeme tarihi zorunlu.");
      return;
    }

    const nextCard: Card = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${last4}-${Date.now()}`,
      bank,
      name,
      last4,
      color: colorOptions[cards.length % colorOptions.length],
      debt,
      limit,
      dueDate,
      dueAmount,
    };

    setCards((current) => [nextCard, ...current]);
    setForm(emptyForm);
    setFormError("");
  }

  function removeCard(cardId: string) {
    setCards((current) => current.filter((card) => card.id !== cardId));
  }

  function resetDemoData() {
    setCards(initialCards);
    setForm(emptyForm);
    setFormError("");
  }

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-200">Cuzdan v0.2</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Kart takip paneli
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Kart borclari, son odemeler ve yaklasan ekstre tarihleri tek ekranda. Kartlar bu cihazdaki tarayici hafizasinda saklanir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
              Tam kart numarasi yok
            </span>
            <span className="rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-rose-100">
              CVV/PIN/sifre yok
            </span>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-sm text-slate-500">{item.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={addCard} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Kart ekle</h2>
                <p className="mt-1 text-sm text-slate-500">Yalnizca takip icin gereken guvenli bilgiler.</p>
              </div>
              <button type="button" onClick={resetDemoData} className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
                Ornek veriye don
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Banka</span>
                <input value={form.bank} onChange={(event) => updateForm("bank", event.target.value)} placeholder="Garanti BBVA" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Kart adi</span>
                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Bonus Platinum" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Son 4 hane</span>
                <input value={form.last4} onChange={(event) => updateForm("last4", event.target.value)} inputMode="numeric" maxLength={4} placeholder="4821" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Son odeme tarihi</span>
                <input value={form.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} placeholder="18 Agu" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Limit</span>
                <input value={form.limit} onChange={(event) => updateForm("limit", event.target.value)} inputMode="decimal" placeholder="75000" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Guncel borc</span>
                <input value={form.debt} onChange={(event) => updateForm("debt", event.target.value)} inputMode="decimal" placeholder="18420" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
                <span>Bu ekstre icin odenecek tutar</span>
                <input value={form.dueAmount} onChange={(event) => updateForm("dueAmount", event.target.value)} inputMode="decimal" placeholder="7250" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
            </div>

            {formError ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{formError}</p> : null}

            <button type="submit" className="mt-4 w-full rounded-md bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
              Karti kaydet
            </button>
          </form>

          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold text-white">Guvenlik modeli</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <p>Uygulama banka sifresi, PIN veya CVV istemez ve saklamaz.</p>
              <p>Kart kimligi icin yalnizca banka adi, kart adi ve son dort hane kullanilir.</p>
              <p>Kayitlar simdilik sadece bu tarayicinin localStorage alaninda tutulur; cihaz disina otomatik gonderilmez.</p>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Kartlar</h2>
              <p className="text-sm text-slate-500">{cards.length} aktif kart</p>
            </div>
            {cards.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => {
                  const utilization = getUtilization(card);

                  return (
                    <article key={card.id} className="overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                      <div className={`bg-gradient-to-br ${card.color} p-4 text-white`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-white/80">{card.bank}</p>
                            <h3 className="mt-1 text-lg font-semibold">{card.name}</h3>
                          </div>
                          <span className="rounded-md bg-black/20 px-2 py-1 text-xs font-medium">*{card.last4}</span>
                        </div>
                        <div className="mt-8 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-white/75">Guncel borc</p>
                            <p className="text-2xl font-semibold">{formatCurrency(card.debt)}</p>
                          </div>
                          <p className="text-sm text-white/80">Son: {card.dueDate}</p>
                        </div>
                      </div>
                      <div className="space-y-4 p-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Limit</span>
                          <span className="font-medium text-slate-100">{formatCurrency(card.limit)}</span>
                        </div>
                        <div>
                          <div className="mb-2 flex justify-between text-xs text-slate-500">
                            <span>Kullanim</span>
                            <span>%{utilization}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10">
                            <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${utilization}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
                          <div>
                            <p className="text-xs text-slate-500">Bu ekstre icin</p>
                            <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(card.dueAmount)}</p>
                          </div>
                          <button type="button" onClick={() => removeCard(card.id)} className="rounded-md border border-rose-300/20 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-400/10">
                            Sil
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
                Henuz kart yok. Ilk kartini ekleyerek baslayabilirsin.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Yaklasan odemeler</h2>
              <p className="text-sm text-slate-500">30 gun</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04]">
              {payments.length > 0 ? payments.map((payment, index) => (
                <div key={payment.id} className={`flex items-center justify-between gap-4 p-4 ${index !== payments.length - 1 ? "border-b border-white/10" : ""}`}>
                  <div>
                    <p className="font-medium text-white">{payment.card}</p>
                    <p className="mt-1 text-sm text-slate-500">Son odeme: {payment.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatCurrency(payment.amount)}</p>
                    <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ${statusStyles[payment.status]}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-5 text-sm text-slate-500">Odeme takibi icin kart ekle.</div>
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
            <h2 className="text-lg font-semibold text-white">Son islemler</h2>
            <p className="text-sm text-slate-500">Maskeleme aktif</p>
          </div>
          <div className="divide-y divide-white/10">
            {transactions.map((transaction) => (
              <div key={`${transaction.merchant}-${transaction.date}`} className="grid grid-cols-[1fr_auto] gap-4 p-4 sm:grid-cols-[1fr_130px_100px_auto] sm:items-center">
                <div>
                  <p className="font-medium text-white">{transaction.merchant}</p>
                  <p className="mt-1 text-sm text-slate-500">{transaction.card}</p>
                </div>
                <p className="hidden text-sm text-slate-400 sm:block">{transaction.category}</p>
                <p className="hidden text-sm text-slate-500 sm:block">{transaction.date}</p>
                <p className="font-semibold text-rose-200">{transaction.amount}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
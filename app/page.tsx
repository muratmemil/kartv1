"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Card = {
  id: string;
  bank: string;
  name: string;
  last4: string;
  expiryDate: string;
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
  expiryMonth: string;
  expiryYear: string;
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

const storageKey = "kart-takip:v0.3:cards";

const colorOptions = [
  "from-emerald-500 to-cyan-500",
  "from-rose-500 to-orange-400",
  "from-sky-500 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
];

const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const years = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + index).slice(-2));

const emptyForm: CardForm = {
  bank: "",
  name: "",
  last4: "",
  expiryMonth: "01",
  expiryYear: years[0] ?? "26",
  debt: "",
  limit: "",
  dueDate: "",
  dueAmount: "",
};

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
  return cards
    .filter((card) => card.dueDate || card.dueAmount > 0)
    .map((card, index) => ({
      id: card.id,
      card: card.name,
      date: card.dueDate || "Tarih yok",
      amount: card.dueAmount,
      status: index === 0 ? "Yaklasiyor" : "Planlandi",
    }));
}

function safeCardFromUnknown(card: Partial<Card>) {
  const last4 = String(card.last4 ?? "").replace(/\D/g, "").slice(-4);
  const expiryDate = /^\d{2}\/\d{2}$/.test(String(card.expiryDate ?? "")) ? String(card.expiryDate) : "01/26";

  return {
    id: String(card.id ?? crypto.randomUUID()),
    bank: String(card.bank ?? ""),
    name: String(card.name ?? ""),
    last4,
    expiryDate,
    color: colorOptions.includes(String(card.color)) ? String(card.color) : colorOptions[0],
    debt: Number(card.debt) || 0,
    limit: Number(card.limit) || 0,
    dueDate: String(card.dueDate ?? ""),
    dueAmount: Number(card.dueAmount) || 0,
  };
}

function readStoredCards() {
  try {
    const storedCards = window.localStorage.getItem(storageKey);
    if (!storedCards) {
      return [];
    }

    const parsed = JSON.parse(storedCards) as Partial<Card>[];
    return parsed
      .map(safeCardFromUnknown)
      .filter((card) => card.bank && card.name && card.last4.length === 4 && card.limit > 0);
  } catch {
    return [];
  }
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [form, setForm] = useState<CardForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      setCards(readStoredCards());
      setIsReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(storageKey, JSON.stringify(cards));
    }
  }, [cards, isReady]);

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
    setFormError("");
  }

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const bank = form.bank.trim();
    const name = form.name.trim();
    const last4 = form.last4.trim();
    const expiryDate = `${form.expiryMonth}/${form.expiryYear}`;
    const dueDate = form.dueDate.trim();
    const debt = parseMoney(form.debt);
    const limit = parseMoney(form.limit);
    const dueAmount = parseMoney(form.dueAmount);

    if (!bank) {
      setFormError("Banka adi gerekli.");
      return;
    }

    if (!name) {
      setFormError("Kart adi gerekli.");
      return;
    }

    if (last4.length !== 4) {
      setFormError("Son 4 hane tam olarak 4 rakam olmali.");
      return;
    }

    if (limit <= 0) {
      setFormError("Limit 0'dan buyuk olmali.");
      return;
    }

    const nextCard: Card = {
      id: `${last4}-${Date.now()}`,
      bank,
      name,
      last4,
      expiryDate,
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

  function clearCards() {
    setCards([]);
    setForm(emptyForm);
    setFormError("");
    window.localStorage.removeItem(storageKey);
  }

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-200">Cuzdan v0.3</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Kart takip paneli
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Temiz sistem: kartlari kendin eklersin, bilgiler bu cihazdaki tarayici hafizasinda saklanir.
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
              <button type="button" onClick={clearCards} className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
                Tum kartlari temizle
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
              <div className="space-y-2 text-sm text-slate-300">
                <span>Son kullanma tarihi</span>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.expiryMonth} onChange={(event) => updateForm("expiryMonth", event.target.value)} className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-300/60">
                    {months.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select value={form.expiryYear} onChange={(event) => updateForm("expiryYear", event.target.value)} className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-300/60">
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <p className="text-xs text-slate-600">Format: {form.expiryMonth}/{form.expiryYear}</p>
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Limit</span>
                <input value={form.limit} onChange={(event) => updateForm("limit", event.target.value)} inputMode="decimal" placeholder="75000" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Guncel borc</span>
                <input value={form.debt} onChange={(event) => updateForm("debt", event.target.value)} inputMode="decimal" placeholder="0" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Son odeme tarihi</span>
                <input value={form.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} placeholder="18 Agu" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Bu ekstre icin odenecek tutar</span>
                <input value={form.dueAmount} onChange={(event) => updateForm("dueAmount", event.target.value)} inputMode="decimal" placeholder="0" className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/60" />
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
              <p>Kart kimligi icin yalnizca banka adi, kart adi, son dort hane ve son kullanma ay/yil bilgisi kullanilir.</p>
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
                          <p className="text-sm text-white/80">SKT: {card.expiryDate}</p>
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

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-semibold text-white">Son islemler</h2>
          <p className="mt-3 text-sm text-slate-500">Henuz islem yok. Bir sonraki adimda kartlara harcama ekleme ekranini baglayacagiz.</p>
        </section>
      </div>
    </main>
  );
}
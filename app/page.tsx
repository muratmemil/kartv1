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
};

type CardForm = {
  bank: string;
  name: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  dueDay: string;
  dueMonth: string;
  debt: string;
  limit: string;
};

type Payment = {
  id: string;
  card: string;
  date: string;
  status: "Yaklaşıyor" | "Planlandı";
};

const storageKey = "kart-takip:v0.5:cards";

const colorOptions = [
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-400",
  "from-sky-500 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
];

const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const years = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + index).slice(-2));

const emptyForm: CardForm = {
  bank: "",
  name: "",
  last4: "",
  expiryMonth: "01",
  expiryYear: years[0] ?? "26",
  dueDay: "01",
  dueMonth: "01",
  debt: "",
  limit: "",
};

const statusStyles: Record<Payment["status"], string> = {
  Yaklaşıyor: "bg-amber-50 text-amber-700 ring-amber-200",
  Planlandı: "bg-sky-50 text-sky-700 ring-sky-200",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value) + " TL";
}

function parseMoney(value: string) {
  const normalized = value.replace(/TL/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyInput(value: string) {
  const amount = parseMoney(value);
  return amount > 0 ? formatCurrency(amount) : "";
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
    status: index === 0 ? "Yaklaşıyor" : "Planlandı",
  }));
}

function safeCardFromUnknown(card: Partial<Card>, index: number) {
  const last4 = String(card.last4 ?? "").replace(/\D/g, "").slice(-4);
  const expiryDate = /^\d{2}\/\d{2}$/.test(String(card.expiryDate ?? "")) ? String(card.expiryDate) : "01/26";
  const dueDate = /^\d{2}\/\d{2}$/.test(String(card.dueDate ?? "")) ? String(card.dueDate) : "01/01";

  return {
    id: String(card.id ?? `${last4}-${Date.now()}-${index}`),
    bank: String(card.bank ?? ""),
    name: String(card.name ?? ""),
    last4,
    expiryDate,
    color: colorOptions.includes(String(card.color)) ? String(card.color) : colorOptions[index % colorOptions.length],
    debt: Number(card.debt) || 0,
    limit: Number(card.limit) || 0,
    dueDate,
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
      .filter((card) => card.bank && card.name && card.last4.length === 4);
  } catch {
    return [];
  }
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [form, setForm] = useState<CardForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

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
    const availableLimit = Math.max(0, totalLimit - totalDebt);
    const utilization = totalLimit > 0 ? Math.round((totalDebt / totalLimit) * 100) : 0;

    return { totalDebt, totalLimit, availableLimit, utilization };
  }, [cards]);

  const summary = [
    { label: "Toplam borç", value: formatCurrency(totals.totalDebt), note: `${cards.length} kartta güncel bakiye` },
    { label: "Kart sayısı", value: String(cards.length), note: "Eklenen aktif kart" },
    { label: "Kullanılabilir limit", value: formatCurrency(totals.availableLimit), note: `Toplam limit ${formatCurrency(totals.totalLimit)}` },
    { label: "Ortalama kullanım", value: `%${totals.utilization}`, note: totals.utilization < 50 ? "Risk seviyesi düşük" : "Kontrol gerekli" },
  ];

  const payments = makePayments(cards);

  function updateForm(field: keyof CardForm, value: string) {
    const safeValue = field === "last4" ? value.replace(/\D/g, "").slice(0, 4) : value;
    setForm((current) => ({ ...current, [field]: safeValue }));
    setFormError("");
  }

  function formatFormMoney(field: "debt" | "limit") {
    setForm((current) => ({ ...current, [field]: formatMoneyInput(current[field]) }));
  }

  function openAddCard() {
    setEditingCardId(null);
    setForm(emptyForm);
    setFormError("");
    setIsCardModalOpen(true);
  }

  function openEditCard(card: Card) {
    const [expiryMonth, expiryYear] = card.expiryDate.split("/");
    const [dueDay, dueMonth] = card.dueDate.split("/");

    setEditingCardId(card.id);
    setForm({
      bank: card.bank,
      name: card.name,
      last4: card.last4,
      expiryMonth: expiryMonth || "01",
      expiryYear: expiryYear || (years[0] ?? "26"),
      dueDay: dueDay || "01",
      dueMonth: dueMonth || "01",
      debt: card.debt ? String(card.debt) : "",
      limit: card.limit ? String(card.limit) : "",
    });
    setFormError("");
    setIsCardModalOpen(true);
  }

  function closeCardModal() {
    setIsCardModalOpen(false);
    setEditingCardId(null);
    setFormError("");
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const bank = form.bank.trim();
    const name = form.name.trim();
    const last4 = form.last4.trim();
    const expiryDate = `${form.expiryMonth}/${form.expiryYear}`;
    const dueDate = `${form.dueDay}/${form.dueMonth}`;
    const debt = parseMoney(form.debt);
    const limit = parseMoney(form.limit);

    if (!bank) {
      setFormError("Banka adı gerekli.");
      return;
    }

    if (!name) {
      setFormError("Kart adı gerekli.");
      return;
    }

    if (last4.length !== 4) {
      setFormError("Son 4 hane tam olarak 4 rakam olmalı.");
      return;
    }

    if (editingCardId) {
      setCards((current) => current.map((card) => card.id === editingCardId ? { ...card, bank, name, last4, expiryDate, debt, limit, dueDate } : card));
    } else {
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
      };

      setCards((current) => [nextCard, ...current]);
    }

    setForm(emptyForm);
    setFormError("");
    setEditingCardId(null);
    setIsCardModalOpen(false);
  }

  function removeCard(cardId: string) {
    setCards((current) => current.filter((card) => card.id !== cardId));
  }

  function clearCards() {
    setCards([]);
    setForm(emptyForm);
    setFormError("");
    setEditingCardId(null);
    setIsCardModalOpen(false);
    window.localStorage.removeItem(storageKey);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Cüzdan v0.8</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Kart takip paneli
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Kartlarını takip et, ödeme tarihlerini kaçırma, hassas kart bilgilerini sisteme alma.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={openAddCard} className="rounded-md bg-teal-600 px-4 py-2 font-semibold text-white transition hover:bg-teal-700">
              Kart ekle
            </button>
            <button type="button" onClick={clearCards} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-100">
              Tüm kartları temizle
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm text-slate-500">{item.note}</p>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-teal-100 bg-teal-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Güvenli takip modeli</h2>
              <p className="mt-1 text-sm text-slate-600">Banka şifresi, PIN, CVV veya tam kart numarası istemiyoruz. Kart kimliği için yalnızca son 4 hane tutulur.</p>
            </div>
            <span className="w-fit rounded-md border border-teal-200 bg-white px-3 py-2 text-sm text-teal-700">
              Hassas veri yok
            </span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">Kartlar</h2>
              <p className="text-sm text-slate-500">{cards.length} aktif kart</p>
            </div>
            {cards.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => {
                  const utilization = getUtilization(card);

                  return (
                    <article key={card.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className={`bg-gradient-to-br ${card.color} p-4 text-white`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-white/85">{card.bank}</p>
                            <h3 className="mt-1 text-lg font-semibold">{card.name}</h3>
                          </div>
                          <span className="rounded-md bg-black/20 px-2 py-1 text-xs font-medium">*{card.last4}</span>
                        </div>
                        <div className="mt-8 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-white/80">Güncel borç</p>
                            <p className="text-2xl font-semibold">{formatCurrency(card.debt)}</p>
                          </div>
                          <div className="text-right text-sm text-white/85">
                            <p>SKT: {card.expiryDate}</p>
                            <p>Ödeme: {card.dueDate}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 p-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Limit</span>
                          <span className="font-medium text-slate-900">{formatCurrency(card.limit)}</span>
                        </div>
                        <div>
                          <div className="mb-2 flex justify-between text-xs text-slate-500">
                            <span>Kullanım</span>
                            <span>%{utilization}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-teal-500" style={{ width: `${utilization}%` }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => openEditCard(card)} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                            Düzenle
                          </button>
                          <button type="button" onClick={() => removeCard(card.id)} className="rounded-md border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50">
                            Sil
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Henüz kart yok. İlk kartını ekleyerek başlayabilirsin.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">Yaklaşan ödemeler</h2>
              <p className="text-sm text-slate-500">GG/AA</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              {payments.length > 0 ? payments.map((payment, index) => (
                <div key={payment.id} className={`flex items-center justify-between gap-4 p-4 ${index !== payments.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div>
                    <p className="font-medium text-slate-950">{payment.card}</p>
                    <p className="mt-1 text-sm text-slate-500">Son ödeme: {payment.date}</p>
                  </div>
                  <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ${statusStyles[payment.status]}`}>
                    {payment.status}
                  </span>
                </div>
              )) : (
                <div className="p-5 text-sm text-slate-500">Ödeme takibi için kart ekle.</div>
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Son işlemler</h2>
          <p className="mt-3 text-sm text-slate-500">Henüz işlem yok. Bir sonraki adımda kartlara harcama ekleme ekranını bağlayacağız.</p>
        </section>
      </div>

      {isCardModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <form onSubmit={saveCard} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-400/30">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{editingCardId ? "Kartı düzenle" : "Kart ekle"}</h2>
                <p className="mt-1 text-sm text-slate-500">Zorunlu alanlar: banka, kart adı ve son 4 hane.</p>
              </div>
              <button type="button" onClick={closeCardModal} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100" aria-label="Kapat">
                Kapat
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span>Banka</span>
                <input value={form.bank} onChange={(event) => updateForm("bank", event.target.value)} placeholder="Garanti BBVA" className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500" />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Kart adı</span>
                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Bonus Platinum" className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500" />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Son 4 hane</span>
                <input value={form.last4} onChange={(event) => updateForm("last4", event.target.value)} inputMode="numeric" maxLength={4} placeholder="4821" className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500" />
              </label>
              <div className="space-y-2 text-sm text-slate-700">
                <span>Son kullanma tarihi</span>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.expiryMonth} onChange={(event) => updateForm("expiryMonth", event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500">
                    {months.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select value={form.expiryYear} onChange={(event) => updateForm("expiryYear", event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500">
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <p className="text-xs text-slate-400">Format: {form.expiryMonth}/{form.expiryYear}</p>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <span>Son ödeme tarihi</span>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.dueDay} onChange={(event) => updateForm("dueDay", event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500">
                    {days.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                  <select value={form.dueMonth} onChange={(event) => updateForm("dueMonth", event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500">
                    {months.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                </div>
                <p className="text-xs text-slate-400">Format: {form.dueDay}/{form.dueMonth}</p>
              </div>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Limit</span>
                <input value={form.limit} onChange={(event) => updateForm("limit", event.target.value)} onBlur={() => formatFormMoney("limit")} inputMode="decimal" placeholder="14.568,00 TL" className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500" />
              </label>
              <label className="space-y-2 text-sm text-slate-700 sm:col-span-2">
                <span>Güncel borç</span>
                <input value={form.debt} onChange={(event) => updateForm("debt", event.target.value)} onBlur={() => formatFormMoney("debt")} inputMode="decimal" placeholder="14.568,00 TL" className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500" />
              </label>
            </div>

            {formError ? <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeCardModal} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Vazgeç
              </button>
              <button type="submit" className="rounded-md bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
                {editingCardId ? "Değişiklikleri kaydet" : "Kartı kaydet"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
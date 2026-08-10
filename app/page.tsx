type Card = {
  bank: string;
  name: string;
  last4: string;
  color: string;
  debt: string;
  limit: string;
  dueDate: string;
  dueAmount: string;
  utilization: number;
};

type Payment = {
  card: string;
  date: string;
  amount: string;
  status: "Yaklasiyor" | "Planlandi" | "Odendi";
};

type Transaction = {
  merchant: string;
  card: string;
  date: string;
  amount: string;
  category: string;
};

const cards: Card[] = [
  {
    bank: "Garanti BBVA",
    name: "Bonus Platinum",
    last4: "4821",
    color: "from-emerald-500 to-cyan-500",
    debt: "18.420 TL",
    limit: "75.000 TL",
    dueDate: "18 Agu",
    dueAmount: "7.250 TL",
    utilization: 25,
  },
  {
    bank: "Akbank",
    name: "Axess",
    last4: "7394",
    color: "from-rose-500 to-orange-400",
    debt: "9.860 TL",
    limit: "45.000 TL",
    dueDate: "24 Agu",
    dueAmount: "3.100 TL",
    utilization: 22,
  },
  {
    bank: "Yapi Kredi",
    name: "World",
    last4: "1168",
    color: "from-sky-500 to-indigo-500",
    debt: "5.340 TL",
    limit: "30.000 TL",
    dueDate: "02 Eyl",
    dueAmount: "1.600 TL",
    utilization: 18,
  },
];

const payments: Payment[] = [
  { card: "Bonus Platinum", date: "18 Agu", amount: "7.250 TL", status: "Yaklasiyor" },
  { card: "Axess", date: "24 Agu", amount: "3.100 TL", status: "Planlandi" },
  { card: "World", date: "02 Eyl", amount: "1.600 TL", status: "Planlandi" },
];

const transactions: Transaction[] = [
  { merchant: "Migros", card: "Bonus *4821", date: "Bugun", amount: "-842 TL", category: "Market" },
  { merchant: "Shell", card: "Axess *7394", date: "Dun", amount: "-1.250 TL", category: "Ulasim" },
  { merchant: "Netflix", card: "World *1168", date: "08 Agu", amount: "-229 TL", category: "Abonelik" },
  { merchant: "Hepsiburada", card: "Bonus *4821", date: "06 Agu", amount: "-2.480 TL", category: "Alisveris" },
];

const summary = [
  { label: "Toplam borc", value: "33.620 TL", note: "3 kartta guncel bakiye" },
  { label: "Bu ay odenecek", value: "10.350 TL", note: "18-24 Agu arasi" },
  { label: "Kullanilabilir limit", value: "111.380 TL", note: "Toplam limit 150.000 TL" },
  { label: "Ortalama kullanim", value: "%22", note: "Risk seviyesi dusuk" },
];

const statusStyles: Record<Payment["status"], string> = {
  Yaklasiyor: "bg-amber-400/15 text-amber-200 ring-amber-300/20",
  Planlandi: "bg-cyan-400/10 text-cyan-200 ring-cyan-300/20",
  Odendi: "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-200">Cuzdan v0.1</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Kart takip paneli
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Kart borclari, son odemeler ve yaklasan ekstre tarihleri tek ekranda. Guvenlik icin yalnizca kartin son dort hanesi gosterilir.
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

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Kartlar</h2>
              <p className="text-sm text-slate-500">3 aktif kart</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {cards.map((card) => (
                <article key={card.last4} className="overflow-hidden rounded-lg border border-white/10 bg-slate-950">
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
                        <p className="text-2xl font-semibold">{card.debt}</p>
                      </div>
                      <p className="text-sm text-white/80">Son: {card.dueDate}</p>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Limit</span>
                      <span className="font-medium text-slate-100">{card.limit}</span>
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>Kullanim</span>
                        <span>%{card.utilization}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${card.utilization}%` }} />
                      </div>
                    </div>
                    <div className="rounded-md bg-white/[0.04] p-3">
                      <p className="text-xs text-slate-500">Bu ekstre icin</p>
                      <p className="mt-1 text-sm font-semibold text-white">{card.dueAmount}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Yaklasan odemeler</h2>
              <p className="text-sm text-slate-500">30 gun</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04]">
              {payments.map((payment, index) => (
                <div key={payment.card} className={`flex items-center justify-between gap-4 p-4 ${index !== payments.length - 1 ? "border-b border-white/10" : ""}`}>
                  <div>
                    <p className="font-medium text-white">{payment.card}</p>
                    <p className="mt-1 text-sm text-slate-500">Son odeme: {payment.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{payment.amount}</p>
                    <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ${statusStyles[payment.status]}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold text-white">Guvenlik modeli</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <p>Uygulama banka sifresi, PIN veya CVV istemez ve saklamaz.</p>
              <p>Kart kimligi icin yalnizca banka adi, kart adi ve son dort hane kullanilir.</p>
              <p>v0.1 verileri ornek ekrandir; gercek entegrasyonlarda hassas alanlar veri modeline alinmayacak.</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
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
          </div>
        </section>
      </div>
    </main>
  );
}

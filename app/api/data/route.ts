import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type AppData = {
  cards: Card[];
  movements: Movement[];
  cash: number;
  loans: Loan[];
};

type Statement = {
  all: (...values: unknown[]) => unknown[];
  get: (...values: unknown[]) => unknown;
  run: (...values: unknown[]) => unknown;
};

type Database = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
};

let database: Database | null = null;

function db() {
  if (!database) {
    database = new DatabaseSync(path.join(process.cwd(), "kartakip.db")) as Database;
    database.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        bank TEXT NOT NULL,
        name TEXT NOT NULL,
        last4 TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        card_limit REAL NOT NULL DEFAULT 0,
        debt REAL NOT NULL DEFAULT 0,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS movements (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        note TEXT NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        principal REAL NOT NULL DEFAULT 0,
        installment_count INTEGER NOT NULL DEFAULT 1,
        monthly_rate REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  return database;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function amount(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeData(raw: Partial<AppData>): AppData {
  return {
    cards: Array.isArray(raw.cards) ? raw.cards.map((card) => ({
      id: text(card.id),
      bank: text(card.bank),
      name: text(card.name),
      last4: text(card.last4).replace(/\D/g, "").slice(-4),
      expiryDate: /^\d{2}\/\d{2}$/.test(text(card.expiryDate)) ? text(card.expiryDate) : "01/26",
      dueDate: /^\d{2}\/\d{2}$/.test(text(card.dueDate)) ? text(card.dueDate) : "01/01",
      limit: amount(card.limit),
      debt: amount(card.debt),
      color: text(card.color) || "from-teal-500 to-emerald-500",
    })).filter((card) => card.id && card.bank && card.name && card.last4.length === 4) : [],
    movements: Array.isArray(raw.movements) ? raw.movements.map((movement) => ({
      id: text(movement.id),
      type: (movement.type === "income" ? "income" : "expense") as Movement["type"],
      source: text(movement.source) || "cash",
      amount: amount(movement.amount),
      category: text(movement.category) || "Genel",
      note: text(movement.note),
      date: /^\d{4}-\d{2}-\d{2}$/.test(text(movement.date)) ? text(movement.date) : new Date().toISOString().slice(0, 10),
    })).filter((movement) => movement.id && movement.amount > 0) : [],
    cash: amount(raw.cash),
    loans: Array.isArray(raw.loans) ? raw.loans.map((loan) => ({
      id: text(loan.id),
      name: text(loan.name),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(text(loan.startDate)) ? text(loan.startDate) : new Date().toISOString().slice(0, 10),
      principal: amount(loan.principal),
      installmentCount: Math.max(1, Math.round(amount(loan.installmentCount))),
      monthlyRate: Math.max(0, amount(loan.monthlyRate)),
    })).filter((loan) => loan.id && loan.name && loan.principal > 0) : [],
  };
}

export async function GET() {
  const database = db();
  const cashRow = database.prepare("SELECT value FROM settings WHERE key = ?").get("cash") as { value?: string } | undefined;

  return NextResponse.json({
    cards: database.prepare("SELECT id, bank, name, last4, expiry_date as expiryDate, due_date as dueDate, card_limit as 'limit', debt, color FROM cards ORDER BY rowid DESC").all(),
    movements: database.prepare("SELECT id, type, source, amount, category, note, date FROM movements ORDER BY date DESC, rowid DESC").all(),
    cash: Number(cashRow?.value) || 0,
    loans: database.prepare("SELECT id, name, start_date as startDate, principal, installment_count as 'installmentCount', monthly_rate as 'monthlyRate' FROM loans ORDER BY rowid DESC").all(),
  });
}

export async function PUT(request: NextRequest) {
  const data = normalizeData(await request.json());
  const database = db();

  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("DELETE FROM cards; DELETE FROM movements; DELETE FROM loans;");

    const insertCard = database.prepare("INSERT INTO cards (id, bank, name, last4, expiry_date, due_date, card_limit, debt, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const card of data.cards) {
      insertCard.run(card.id, card.bank, card.name, card.last4, card.expiryDate, card.dueDate, card.limit, card.debt, card.color);
    }

    const insertMovement = database.prepare("INSERT INTO movements (id, type, source, amount, category, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const movement of data.movements) {
      insertMovement.run(movement.id, movement.type, movement.source, movement.amount, movement.category, movement.note, movement.date);
    }

    const insertLoan = database.prepare("INSERT INTO loans (id, name, start_date, principal, installment_count, monthly_rate) VALUES (?, ?, ?, ?, ?, ?)");
    for (const loan of data.loans) {
      insertLoan.run(loan.id, loan.name, loan.startDate, loan.principal, loan.installmentCount, loan.monthlyRate);
    }

    database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("cash", String(data.cash));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return NextResponse.json({ ok: true });
}
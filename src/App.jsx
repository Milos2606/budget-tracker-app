import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

const API_URL = "https://budget-tracker-api-production-4717.up.railway.app/api/transactions";

const CATEGORIES = ["Gaji", "Makanan", "Transportasi", "Hiburan", "Tagihan", "Lainnya"];

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const formatDay = (d) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
};

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [type, setType] = useState("expense");

  const today = new Date();
  const currentKey = monthKey(today);
  const [selectedMonth, setSelectedMonth] = useState(currentKey);

  // ambil data dari Laravel saat komponen pertama kali dimuat
  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data");
        return res.json();
      })
      .then((data) => {
        setTransactions(data.map((t) => ({ ...t, date: new Date(t.date) })));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const monthKeysSet = new Set(transactions.map((t) => monthKey(t.date)));
  monthKeysSet.add(currentKey);
  const monthKeys = [...monthKeysSet].sort();

  const carryOver = transactions
    .filter((t) => monthKey(t.date) < selectedMonth)
    .reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);

  const monthTx = transactions
    .filter((t) => monthKey(t.date) === selectedMonth)
    .sort((a, b) => a.date - b.date);

  const monthIncome = monthTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const endingBalance = carryOver + monthIncome - monthExpense;

  let running = carryOver;
  const rows = monthTx.map((t) => {
    running += t.type === "income" ? t.amount : -t.amount;
    return { ...t, running };
  }).reverse();

  const handleAdd = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!desc.trim() || !value || value <= 0) return;

    const [y, m] = selectedMonth.split("-").map(Number);
    const isCurrentMonth = selectedMonth === currentKey;
    const date = isCurrentMonth ? new Date() : new Date(y, m - 1, 1);

    const payload = {
      desc: desc.trim(),
      category,
      amount: value,
      type,
      date: toDateStr(date),
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal menyimpan transaksi");
      const saved = await res.json();
      setTransactions((prev) => [...prev, { ...saved, date: new Date(saved.date) }]);
      setDesc("");
      setAmount("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus transaksi");
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="ledger-root min-h-screen flex items-start justify-center p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');

        .ledger-root {
          --paper: #f1ede2;
          --paper-line: #c9bfa1;
          --ink: #2c2a20;
          --ink-soft: #6b6656;
          --income: #3e6b4f;
          --expense: #a3402f;
          --gold: #a5793a;
          --card: #f8f5eb;
          background: var(--paper);
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }
        .ledger-serif { font-family: 'Source Serif 4', serif; }
        .ledger-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

        .ledger-page {
          background:
            repeating-linear-gradient(
              to bottom,
              transparent,
              transparent 38px,
              var(--paper-line) 39px
            );
        }

        .ledger-card {
          background: var(--card);
          border: 1px solid var(--paper-line);
        }

        .ledger-input {
          background: transparent;
          border-bottom: 1px solid var(--paper-line);
          color: var(--ink);
        }
        .ledger-input:focus {
          outline: none;
          border-bottom-color: var(--ink);
        }
        .ledger-input::placeholder { color: var(--ink-soft); }

        .type-pill {
          border: 1px solid var(--paper-line);
          color: var(--ink-soft);
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .type-pill.active-income {
          background: var(--income);
          border-color: var(--income);
          color: #f8f5eb;
        }
        .type-pill.active-expense {
          background: var(--expense);
          border-color: var(--expense);
          color: #f8f5eb;
        }

        .row-hover:hover { background: rgba(44, 42, 32, 0.035); }

        .add-btn {
          background: var(--ink);
          color: var(--paper);
        }
        .add-btn:hover { background: var(--gold); }
        .add-btn:disabled { opacity: 0.5; }

        .del-btn { color: var(--ink-soft); }
        .del-btn:hover { color: var(--expense); }

        .error-banner {
          background: rgba(163, 64, 47, 0.1);
          border: 1px solid var(--expense);
          color: var(--expense);
        }
      `}</style>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <p className="ledger-mono text-xs tracking-wide uppercase" style={{ color: "var(--ink-soft)" }}>
            Buku Kas
          </p>
          <h1 className="ledger-serif text-4xl font-semibold mt-1">{monthLabel(selectedMonth)}</h1>
        </div>

        {error && (
          <div className="error-banner rounded-sm px-4 py-2 text-sm mb-4">
            {error} — pastikan server Laravel (`php artisan serve`) sedang berjalan.
          </div>
        )}

        {/* Month picker */}
        <div className="mb-6">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="ledger-input py-2 text-sm"
          >
            {monthKeys.map((key) => (
              <option key={key} value={key}>{monthLabel(key)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Memuat data...</p>
        ) : (
          <>
            {/* Balance + summary */}
            <div className="ledger-card rounded-sm px-6 py-5 mb-6">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <span className="text-sm" style={{ color: "var(--ink-soft)" }}>Saldo akhir bulan ini</span>
                <span
                  className="ledger-mono text-3xl font-bold"
                  style={{ color: endingBalance < 0 ? "var(--expense)" : "var(--ink)" }}
                >
                  {formatRupiah(endingBalance)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--ink-soft)" }}>Bawaan dari bulan lalu</span>
                <span className="ledger-mono text-xs" style={{ color: "var(--ink-soft)" }}>
                  {formatRupiah(carryOver)}
                </span>
              </div>
              <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: "1px solid var(--paper-line)" }}>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: "var(--income)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Pemasukan bulan ini</p>
                    <p className="ledger-mono text-sm font-medium" style={{ color: "var(--income)" }}>
                      {formatRupiah(monthIncome)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} style={{ color: "var(--expense)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Pengeluaran bulan ini</p>
                    <p className="ledger-mono text-sm font-medium" style={{ color: "var(--expense)" }}>
                      {formatRupiah(monthExpense)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add transaction form */}
            <form onSubmit={handleAdd} className="ledger-card rounded-sm px-6 py-5 mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`type-pill flex-1 rounded-sm py-2 text-sm font-medium ${type === "expense" ? "active-expense" : ""}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`type-pill flex-1 rounded-sm py-2 text-sm font-medium ${type === "income" ? "active-income" : ""}`}
                >
                  Pemasukan
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Keterangan, mis. Makan siang"
                  className="ledger-input flex-1 py-2 text-sm"
                />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Jumlah (Rp)"
                  className="ledger-input sm:w-40 py-2 text-sm ledger-mono"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="ledger-input py-2 text-sm flex-1"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="add-btn rounded-sm px-4 py-2 text-sm font-medium flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={15} />
                  Tambah
                </button>
              </div>
              {selectedMonth !== currentKey && (
                <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
                  Catatan ini akan ditambahkan ke {monthLabel(selectedMonth)}.
                </p>
              )}
            </form>

            {/* Transaction list */}
            <div className="ledger-card ledger-page rounded-sm overflow-hidden">
              {rows.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="ledger-serif text-lg" style={{ color: "var(--ink-soft)" }}>
                    Halaman ini masih kosong
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
                    Tambahkan catatan pertama Anda di atas.
                  </p>
                </div>
              ) : (
                rows.map((t) => (
                  <div
                    key={t.id}
                    className="row-hover flex items-center justify-between gap-3 px-6 group"
                    style={{ height: "39px" }}
                  >
                    <span className="ledger-mono text-xs w-12 shrink-0" style={{ color: "var(--ink-soft)" }}>
                      {formatDay(t.date)}
                    </span>
                    <div className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span className="text-sm truncate">{t.desc}</span>
                      <span
                        className="text-[11px] px-1.5 rounded-sm shrink-0"
                        style={{ background: "rgba(44,42,32,0.06)", color: "var(--ink-soft)" }}
                      >
                        {t.category}
                      </span>
                    </div>
                    <span
                      className="ledger-mono text-sm font-medium shrink-0 w-32 text-right"
                      style={{ color: t.type === "income" ? "var(--income)" : "var(--expense)" }}
                    >
                      {t.type === "income" ? "+" : "−"}{formatRupiah(t.amount).replace("Rp", "").trim()}
                    </span>
                    <span className="ledger-mono text-xs w-24 text-right shrink-0" style={{ color: "var(--ink-soft)" }}>
                      {formatRupiah(t.running)}
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="del-btn shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
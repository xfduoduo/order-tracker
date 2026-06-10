"use client";

import { useState, useEffect } from "react";
import { fmtCNY } from "@/lib/utils";

interface Order {
  id: string; customerName: string; productName: string;
  sellingPrice: number; purchasePrice: number; packagingShipping: number;
  actualPayment: number; actualRefund: number; returnPurchasePrice: number;
  returnSellingPrice: number; returnPackagingCost: number;
  returnProfit: number; profit: number;
  salesStatus: string; productStatus: string; startDate: string;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredProfit, setHoveredProfit] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders?limit=9999").then((r) => r.json()).then((json) => {
      if (json.success) setOrders(json.data);
      setLoading(false);
    });
  }, []);

  const filtered = orders.filter((o) => {
    if (dateFrom && o.startDate && o.startDate < dateFrom) return false;
    if (dateTo && o.startDate && o.startDate > dateTo) return false;
    return true;
  });

  const totals = { packagingShipping: 0, purchasePrice: 0, sellingPrice: 0, actualPayment: 0, actualRefund: 0, profit: 0, returnProfit: 0 };
  const presaleItems: Order[] = [];
  const statusCount: Record<string, number> = {};
  for (const o of filtered) {
    totals.packagingShipping += o.packagingShipping;
    totals.purchasePrice += o.purchasePrice;
    totals.sellingPrice += o.sellingPrice;
    totals.actualPayment += o.actualPayment;
    totals.actualRefund += o.actualRefund;
    totals.profit += o.profit;
    totals.returnProfit += o.returnProfit;
    const s = o.salesStatus || "未分类";
    statusCount[s] = (statusCount[s] || 0) + 1;
    if (o.salesStatus.includes("预售") || o.productStatus.includes("预售")) presaleItems.push(o);
  }
  const maxCount = Math.max(1, ...Object.values(statusCount));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1.5 items-center">
        {[0,1,2].map(i => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: `${i*0.15}s`}} />
        ))}
      </div>
    </div>
  );

  const kpis = [
    { label: "包装快递费", value: totals.packagingShipping, icon: "📦", color: "from-amber-50 to-orange-50 border-amber-200" },
    { label: "进价总和", value: totals.purchasePrice, icon: "💰", color: "from-blue-50 to-cyan-50 border-blue-200" },
    { label: "卖价总和", value: totals.sellingPrice, icon: "🏷️", color: "from-green-50 to-emerald-50 border-green-200" },
    { label: "实付总和", value: totals.actualPayment, icon: "💳", color: "from-violet-50 to-purple-50 border-violet-200" },
    { label: "实退总和", value: totals.actualRefund, icon: "↩️", color: "from-red-50 to-rose-50 border-red-200" },
    { label: "退货利润", value: totals.returnProfit, icon: "📉", color: "from-orange-50 to-yellow-50 border-orange-200" },
    { label: "利润总和", value: totals.profit, icon: "🏆", color: totals.profit >= 0 ? "from-emerald-50 to-green-50 border-emerald-200" : "from-red-50 to-rose-50 border-red-200" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {filtered.length} 条订单</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">时间范围</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 p-0" />
          <span className="text-gray-300">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 p-0" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">清除</button>
          )}
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`relative group bg-gradient-to-br ${kpi.color} border rounded-xl p-4 cursor-default
              hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
          >
            <div className="text-lg mb-2">{kpi.icon}</div>
            <div className="text-xs text-gray-500 font-medium mb-1">{kpi.label}</div>
            <div className={`text-base font-bold font-mono tracking-tight ${kpi.label === "利润总和" ? (kpi.value >= 0 ? "text-emerald-700" : "text-red-600") : "text-gray-800"}`}>
              {fmtCNY(kpi.value)}
            </div>
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5 group-hover:ring-black/10 transition-all" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 售卖状态分布 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            售卖状态分布
          </h2>
          {Object.keys(statusCount).length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCount).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div
                  key={status}
                  className="group/bar"
                  onMouseEnter={() => setHoveredBar(status)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{status}</span>
                    <span className={`font-mono text-xs transition-all ${hoveredBar === status ? "text-blue-700 font-bold" : "text-gray-500"}`}>
                      {count} 单 ({((count / filtered.length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500 ease-out flex items-center justify-end pr-2
                        ${hoveredBar === status ? "from-blue-500 to-indigo-600 shadow-sm" : ""}`}
                      style={{ width: `${hoveredBar === status ? Math.min((count / maxCount) * 100 + 3, 100) : (count / maxCount) * 100}%` }}
                    >
                      {(count / maxCount) > 0.25 && (
                        <span className="text-white text-[11px] font-semibold drop-shadow-sm">
                          {((count / filtered.length) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 预售看板 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            预售看板
            {presaleItems.length > 0 && (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{presaleItems.length} 单</span>
            )}
          </h2>
          {presaleItems.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">暂无预售订单</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {presaleItems.map((o, i) => (
                <div key={o.id} className={`flex items-center justify-between text-sm py-2 px-2 rounded-lg transition-colors hover:bg-amber-50 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                  <div>
                    <span className="text-gray-800 font-medium">{o.customerName}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500">{o.productName}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-blue-600">{fmtCNY(o.sellingPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 利润分布 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          利润分布
        </h2>
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">暂无数据</p>
        ) : (
          <div className="flex items-end gap-1.5 h-40 px-1">
            {(() => {
              const profits = filtered.map((o) => o.profit).sort((a, b) => a - b);
              const min = profits[0], max = profits[profits.length - 1], range = max - min || 1;
              const buckets = Array.from({ length: 12 }, (_, i) => {
                const lo = min + (range / 12) * i;
                const hi = min + (range / 12) * (i + 1);
                const count = profits.filter((p) => p >= lo && (i < 11 ? p < hi : p <= hi)).length;
                return { lo, hi, count };
              });
              const m = Math.max(1, ...buckets.map((b) => b.count));
              return buckets.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full group/bar cursor-pointer"
                  onMouseEnter={() => setHoveredProfit(i)}
                  onMouseLeave={() => setHoveredProfit(null)}
                >
                  {b.count > 0 && hoveredProfit === i && (
                    <span className="text-[10px] font-mono text-gray-700 mb-1 bg-white border rounded px-1.5 py-0.5 shadow-sm">{b.count} 单</span>
                  )}
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      b.count > 0
                        ? hoveredProfit === i
                          ? "bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm"
                          : "bg-gradient-to-t from-emerald-400 to-emerald-300"
                        : "bg-transparent"
                    }`}
                    style={{ height: `${(b.count / m) * 100}%`, minHeight: b.count > 0 ? "4px" : "0" }}
                  />
                  <span className="text-[10px] text-gray-400 mt-1.5 truncate w-full text-center font-mono">
                    {fmtCNY(b.lo).replace("¥", "").slice(0, 6)}
                  </span>
                </div>
              ));
            })()}
          </div>
        )}
        <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
          <span>{fmtCNY(Math.min(...filtered.map((o) => o.profit), 0))}</span>
          <span className="text-gray-500 font-medium">利润区间</span>
          <span>{fmtCNY(Math.max(...filtered.map((o) => o.profit), 0))}</span>
        </div>
      </div>
    </div>
  );
}

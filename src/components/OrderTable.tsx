"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { fmtCNY } from "@/lib/utils";
import { nameToColor } from "@/lib/color";
import { exportCSV, exportExcel } from "@/lib/export";

// ── 列配置 ──
type ColumnType = "text" | "number" | "dropdown" | "readonly" | "checkbox" | "datetime" | "date";

interface ColDef {
  key: string;
  label: string;
  type: ColumnType;
}

const COLUMNS: ColDef[] = [
  { key: "_index",            label: "序号",         type: "readonly" },
  { key: "customerName",      label: "客户名称",     type: "dropdown" },
  { key: "customerRegion",    label: "地区",         type: "dropdown" },
  { key: "productName",       label: "货品名称",     type: "dropdown" },
  { key: "productStatus",     label: "货品状态",     type: "dropdown" },
  { key: "upstreamContact",   label: "上游对接",     type: "dropdown" },
  { key: "priorityShipping",  label: "优先发货",     type: "checkbox" },
  { key: "isReturn",          label: "是否退货",     type: "checkbox" },
  { key: "salesStatus",       label: "售卖状态",     type: "dropdown" },
  { key: "packagingShipping", label: "包装快递费",   type: "number" },
  { key: "purchasePrice",     label: "进价",         type: "number" },
  { key: "sellingPrice",      label: "卖价",         type: "number" },
  { key: "actualPayment",     label: "实付",         type: "number" },
  { key: "returnPackagingCost",label: "退货包装成本费",type: "number" },
  { key: "returnPurchasePrice", label: "退货进价",   type: "number" },
  { key: "returnSellingPrice",  label: "退货卖价",   type: "number" },
  { key: "actualRefund",      label: "实退",         type: "number" },
  { key: "returnProfit",      label: "实退利润",     type: "readonly" },
  { key: "profit",            label: "利润",         type: "readonly" },
  { key: "customerAddress",   label: "地址",         type: "text" },
  { key: "remark",            label: "备注",         type: "text" },
  { key: "ironFanBenefit",    label: "铁粉福利",     type: "dropdown" },
  { key: "diamondFanBenefit", label: "钻粉福利",     type: "dropdown" },
  { key: "loyalFanBenefit",   label: "挚爱粉福利",   type: "dropdown" },
  { key: "superFanBenefit",   label: "超粉福利",     type: "dropdown" },
  { key: "startDate",         label: "开始日期",     type: "datetime" },
  { key: "completionDate",    label: "完成日期",     type: "date" },
];

// ── 类型 ──
interface Order {
  id: string;
  [key: string]: string | number | boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── 冻结列 ──
const FROZEN_KEYS = ["_index", "customerName", "customerRegion", "productName"];

// ── 样式 ──
const CELL_CLASS = "border border-gray-200 px-2 py-1 text-sm text-gray-900 font-medium";
const HEADER_CLASS =
  "border border-gray-300 bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap sticky top-0 z-20 cursor-pointer select-none";

// ── 颜色药丸标签（用于需要背景色的单元格） ──
function PillTag({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  if (color === "transparent") return <>{children}</>;
  return (
    <span
      className="inline-block pl-2.5 pr-1.5 py-0.5 rounded-md text-sm text-gray-900 font-medium"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

// ── 组件 ──
export default function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const preReturnStatus = useRef<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?limit=500${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`);
      const json: ApiResponse<Order[]> = await res.json();
      if (json.success && json.data) setOrders(json.data);
    } catch (e) {
      console.error("加载订单失败", e);
    }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 存储的下拉选项（localStorage）
  const [storedOpts, setStoredOpts] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem("dropdownOptions") || "{}"); }
    catch { return {}; }
  });
  const saveStoredOpts = (v: Record<string, string[]>) => {
    setStoredOpts(v);
    localStorage.setItem("dropdownOptions", JSON.stringify(v));
  };

  // 提取各列的独特值 + 合并存储值
  const dropdownValues = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const col of COLUMNS) {
      if (col.type === "dropdown") {
        const set = new Set<string>();
        for (const o of orders) {
          const v = o[col.key];
          if (typeof v === "string" && v) set.add(v);
        }
        for (const v of (storedOpts[col.key] || [])) set.add(v);
        map[col.key] = set;
      }
    }
    return map;
  }, [orders, storedOpts]);

  const addDropdownOption = (colKey: string, value: string) => {
    if (!value) return;
    const cur = storedOpts[colKey] || [];
    if (cur.includes(value)) return;
    saveStoredOpts({ ...storedOpts, [colKey]: [...cur, value] });
  };

  const removeDropdownOption = (colKey: string, value: string) => {
    const cur = storedOpts[colKey] || [];
    saveStoredOpts({ ...storedOpts, [colKey]: cur.filter((v) => v !== value) });
  };

  // 排序（不调用API，前端排）
  const sortedOrders = useMemo(() => {
    if (!sortKey) return orders;
    const sorted = [...orders].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "zh");
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [orders, sortKey, sortDir]);

  // 列筛选
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 计算冻结列 left 偏移（按DOM顺序累加宽度）
  useLayoutEffect(() => {
    if (loading) return;
    const container = document.getElementById("main-scroll");
    if (!container) return;
    // 测量第一行每个冻结 th 的宽度，计算累积偏移
    const frozenThs = container.querySelectorAll("th[data-frozen]");
    const offsets: number[] = [];
    let left = 36; // checkbox 宽度
    frozenThs.forEach((th) => {
      offsets.push(left);
      left += (th as HTMLElement).offsetWidth;
    });
    // 应用到所有行
    const apply = (sel: string) => {
      const all = container.querySelectorAll(sel);
      // 每行的冻结列数量相同，按位置匹配
      let colIdx = 0;
      const perRow = offsets.length;
      all.forEach((el) => {
        const offset = offsets[colIdx % perRow];
        (el as HTMLElement).style.left = offset + "px";
        colIdx++;
      });
    };
    apply("th[data-frozen]");
    apply("td[data-frozen]");
  }, [orders, loading, showFilters, filters, searchQuery]);

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredOrders = useMemo(() => {
    let result = sortedOrders;
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      const boolCols = new Set(["priorityShipping", "isReturn"]);
      if (boolCols.has(key)) {
        const boolVal = val === "是";
        result = result.filter((o) => o[key] === boolVal);
      } else if (typeof result[0]?.[key] === "number") {
        // Number columns: substring match on string representation
        result = result.filter((o) => String(o[key]).includes(val));
      } else {
        result = result.filter((o) => String(o[key] ?? "").includes(val));
      }
    }
    return result;
  }, [sortedOrders, filters]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const reqSeq = useRef(0);

  const updateCell = async (id: string, field: string, value: string | boolean | number) => {
    const seq = ++reqSeq.current;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const json: ApiResponse<Order> = await res.json();
      if (json.success && json.data && seq === reqSeq.current) {
        setOrders((prev) => prev.map((o) => (o.id === id ? json.data! : o)));
      }
    } catch (e) {
      console.error("更新失败", e);
      fetchOrders();
    }
  };

  // 退货切换：勾选时把销售金额整组搬到退货列
  const handleReturnToggle = async (id: string, checked: boolean) => {
    const o = orders.find((x) => x.id === id);
    if (!o) return;

    const data: Record<string, unknown> = { isReturn: checked };
    if (checked) {
      preReturnStatus.current[id] = String(o.salesStatus || "");
      data.salesStatus = "";
      data.packagingShipping = 0;
      data.returnPackagingCost = Number(o.packagingShipping) || 0;
      data.purchasePrice = 0;
      data.returnPurchasePrice = Number(o.purchasePrice) || 0;
      data.sellingPrice = 0;
      data.returnSellingPrice = Number(o.sellingPrice) || 0;
      data.actualPayment = 0;
      data.actualRefund = Number(o.actualPayment) || 0;
    } else {
      data.salesStatus = preReturnStatus.current[id] || "";
      data.packagingShipping = Number(o.returnPackagingCost) || 0;
      data.returnPackagingCost = 0;
      data.purchasePrice = Number(o.returnPurchasePrice) || 0;
      data.returnPurchasePrice = 0;
      data.sellingPrice = Number(o.returnSellingPrice) || 0;
      data.returnSellingPrice = 0;
      data.actualPayment = Number(o.actualRefund) || 0;
      data.actualRefund = 0;
    }

    const seq = ++reqSeq.current;
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } as Order : x)));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Order> = await res.json();
      if (json.success && json.data && seq === reqSeq.current) {
        setOrders((prev) => prev.map((x) => (x.id === id ? json.data! : x)));
      }
    } catch (e) {
      console.error("更新失败", e);
      fetchOrders();
    }
  };

  const addRow = async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: "新客户", productName: "" }),
      });
      const json: ApiResponse<Order> = await res.json();
      if (json.success && json.data) setOrders((prev) => [json.data!, ...prev]);
    } catch (e) {
      console.error("新增失败", e);
    }
  };

  const deleteRow = async (id: string) => {
    if (!window.confirm("确定删除这条订单？")) return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    try { await fetch(`/api/orders/${id}`, { method: "DELETE" }); } catch (e) { fetchOrders(); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const batchDelete = async () => {
    if (!window.confirm(`确定删除选中的 ${selectedIds.size} 条订单？`)) return;
    const ids = [...selectedIds];
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
    setSelectedIds(new Set());
    try {
      await Promise.all(ids.map((id) => fetch(`/api/orders/${id}`, { method: "DELETE" })));
    } catch (e) { fetchOrders(); }
  };

  const batchSetStatus = async (status: string) => {
    const ids = [...selectedIds];
    setOrders((prev) => prev.map((o) => ids.includes(o.id) ? { ...o, salesStatus: status } : o));
    setSelectedIds(new Set());
    try {
      await Promise.all(ids.map((id) =>
        fetch(`/api/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesStatus: status }) })
      ));
    } catch (e) { fetchOrders(); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import("xlsx");
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    const REVERSE_MAP: Record<string, string> = {
      "客户名称": "customerName", "地区": "customerRegion",
      "地址": "customerAddress", "货品名称": "productName",
      "货品状态": "productStatus", "上游对接": "upstreamContact",
      "优先发货": "priorityShipping", "是否退货": "isReturn",
      "售卖状态": "salesStatus", "包装快递费": "packagingShipping",
      "进价": "purchasePrice", "卖价": "sellingPrice",
      "实付": "actualPayment", "退货包装成本费": "returnPackagingCost",
      "退货进价": "returnPurchasePrice", "退货卖价": "returnSellingPrice",
      "实退": "actualRefund", "铁粉福利": "ironFanBenefit",
      "钻粉福利": "diamondFanBenefit", "挚爱粉福利": "loyalFanBenefit",
      "超粉福利": "superFanBenefit", "开始日期": "startDate",
      "完成日期": "completionDate", "备注": "remark",
    };

    const mapped = rows.map((r) => {
      const item: Record<string, unknown> = {};
      for (const [cn, key] of Object.entries(REVERSE_MAP)) {
        const v = r[cn];
        if (v !== undefined && v !== "") {
          if (key === "priorityShipping" || key === "isReturn") item[key] = v === "是" || v === "true";
          else item[key] = v;
        }
      }
      return item;
    });

    try {
      const res = await fetch("/api/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: mapped }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`成功导入 ${json.data.count} 条订单`);
        fetchOrders();
      }
    } catch (e) {
      alert("导入失败");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return <div className="flex justify-center py-12 text-gray-400">加载中...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative w-72">
          <input
            type="text"
            placeholder="🔍 搜索... (回车)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearchQuery(search);
              if (e.key === "Escape") { setSearch(""); setSearchQuery(""); }
            }}
            className="border rounded-lg pl-3 pr-8 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setSearchQuery(""); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 py-1.5 rounded text-sm ${showFilters ? "bg-blue-600 text-white" : "border text-gray-600 hover:bg-gray-100"}`}
        >
          {showFilters ? "▲ 隐藏筛选" : "▼ 列筛选"}
        </button>
        <button onClick={addRow} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
          + 新增行
        </button>
        {/* 导出 */}
        <button onClick={() => exportCSV(filteredOrders)} className="border px-2 py-1.5 rounded text-xs hover:bg-gray-100">CSV</button>
        <button onClick={() => exportExcel(filteredOrders)} className="border px-2 py-1.5 rounded text-xs hover:bg-gray-100">Excel</button>
        {/* 导入 */}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="border px-2 py-1.5 rounded text-xs hover:bg-gray-100">📥导入</button>
        {/* 批量操作 */}
        {selectedIds.size > 0 && (
          <>
            <span className="text-xs text-blue-600">{selectedIds.size} 条已选</span>
            <button onClick={batchDelete} className="border px-2 py-1.5 rounded text-xs text-red-600 hover:bg-red-50">批量删除</button>
            <select onChange={(e) => { if (e.target.value) batchSetStatus(e.target.value); e.target.value = ""; }} className="border px-2 py-1.5 rounded text-xs">
              <option value="">批量改状态</option>
              <option value="已售">已售</option>
              <option value="预售">预售</option>
              <option value="退货">退货</option>
              <option value="待发">待发</option>
            </select>
          </>
        )}
        <span className="ml-auto text-xs text-gray-500">共 {filteredOrders.length} 条</span>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-200px)] border border-gray-300 rounded" id="main-scroll">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className={HEADER_CLASS + " sticky left-0 z-30 bg-gray-100"} style={{width:36,minWidth:36}}>
                <input type="checkbox" checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleSelectAll} className="h-4 w-4" />
              </th>
              {COLUMNS.map((col) => {
                const isFrozen = FROZEN_KEYS.includes(col.key) || col.key === "_index";
                const lastFrozen = col.key === "productName";
                return (
                  <th key={col.key} className={`${HEADER_CLASS} ${isFrozen ? "sticky z-30 bg-gray-100" : ""} ${lastFrozen ? "shadow-[2px_0_6px_rgba(0,0,0,0.1)]" : ""}`}
                    style={isFrozen ? {position:"sticky",zIndex:30} : {}}
                    data-frozen={isFrozen ? "1" : undefined}
                    onClick={() => toggleSort(col.key)}>
                    {col.label}{sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                );
              })}
              <th className={HEADER_CLASS}>操作</th>
            </tr>
            {showFilters && (
              <tr>
                <th className="border border-gray-200 bg-gray-50 px-1 py-1 sticky left-0 z-30" style={{width:36,minWidth:36}} />
                {COLUMNS.map((col) => {
                  const boolColsCheck = new Set(["priorityShipping", "isReturn"]);
                  const opts = dropdownValues[col.key];
                  const isFrozen = FROZEN_KEYS.includes(col.key) || col.key === "_index";
                  const lastFrozen = col.key === "productName";
                  return (
                    <th key={col.key} className={`border border-gray-200 bg-gray-50 px-1 py-1 ${isFrozen ? "sticky z-30 bg-gray-50" : ""} ${lastFrozen ? "shadow-[2px_0_6px_rgba(0,0,0,0.1)]" : ""}`}
                      style={isFrozen ? {position:"sticky",zIndex:30} : {}}
                      data-frozen={isFrozen ? "1" : undefined}>
                      {boolColsCheck.has(col.key) ? (
                        <select value={filters[col.key] || ""} onChange={(e) => setFilter(col.key, e.target.value)} className="w-full text-xs border rounded px-1 py-0.5">
                          <option value="">全部</option><option value="是">是</option><option value="否">否</option>
                        </select>
                      ) : opts?.size ? (
                        <select value={filters[col.key] || ""} onChange={(e) => setFilter(col.key, e.target.value)} className="w-full text-xs border rounded px-1 py-0.5" style={{minWidth:60}}>
                          <option value="">全部</option>{[...opts].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input value={filters[col.key] || ""} onChange={(e) => setFilter(col.key, e.target.value)} placeholder="筛选..." className="w-full text-xs border rounded px-1 py-0.5" style={{minWidth:60}} />
                      )}
                    </th>
                  );
                })}
                <th className="border border-gray-200 bg-gray-50 px-1 py-1" />
              </tr>
            )}
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={COLUMNS.length + 2} className="text-center text-gray-400 py-8 text-sm">暂无数据，点击"新增行"开始</td></tr>
            ) : (
              filteredOrders.map((o, rowIdx) => {
                const custColor = nameToColor(String(o.customerName || ""));
                const isEven = rowIdx % 2 === 1;
                const isEvenBg = isEven ? "bg-white" : "bg-indigo-50";
                return (
                  <tr key={o.id} className={`${isEvenBg} hover:bg-indigo-100/60 transition-colors duration-150`}>
                    <td className={`${CELL_CLASS} text-center sticky left-0 ${isEvenBg} z-10`}>
                      <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} className="h-4 w-4" />
                    </td>
                    {COLUMNS.map((col) => {
                      const rawVal = o[col.key];
                      const colType = col.type;
                      const dropdownOpts = dropdownValues[col.key];
                      const isFrozen = FROZEN_KEYS.includes(col.key) || col.key === "_index";
                      const lastFrozen = col.key === "productName";
                      const isCustomerName = col.key === "customerName";
                      const isDropdownCol = colType === "dropdown";
                      const cellBgColor = isCustomerName ? custColor : (isDropdownCol && rawVal) ? nameToColor(String(rawVal)) : "transparent";
                      const frozenClass = isFrozen ? `sticky ${isEvenBg} z-10` : "";
                      const shadowClass = lastFrozen ? "shadow-[2px_0_6px_rgba(0,0,0,0.1)]" : "";
                      if (col.key === "_index") return <td key={col.key} data-frozen="1" className={`${CELL_CLASS} text-center text-gray-400 text-xs font-mono sticky ${isEvenBg} z-10 ${lastFrozen ? "shadow-[2px_0_6px_rgba(0,0,0,0.1)]" : ""}`} style={{position:"sticky",zIndex:10}}>{rowIdx + 1}</td>;
                      if (colType === "checkbox") return <td key={col.key} className={`${CELL_CLASS} text-center`}><input type="checkbox" checked={!!rawVal} onChange={(e) => { if (col.key === "isReturn") handleReturnToggle(o.id, e.target.checked); else { const tag = "优先发货顺丰加20"; const oldRemark = String(o.remark || ""); const c = e.target.checked; const nr = c ? (oldRemark.includes(tag) ? oldRemark : oldRemark ? oldRemark + "；" + tag : tag) : oldRemark.replace("；" + tag, "").replace(tag, "").trim().replace(/^；|；$/g, ""); const ps = ++reqSeq.current; setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, priorityShipping: c, remark: nr } : x)); fetch(`/api/orders/${o.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priorityShipping: c, remark: nr }) }).then((r) => r.json()).then((json) => { if (json.success && json.data && ps === reqSeq.current) setOrders((prev) => prev.map((x) => x.id === o.id ? json.data! : x)); }); } }} className="h-4 w-4" /></td>;
                      if (colType === "readonly" && (col.key === "profit" || col.key === "returnProfit")) {
                        const readonlyFrozen = `${frozenClass} ${shadowClass}`;
                        const isGreen = col.key === "profit" && Number(rawVal) >= 0, isRed = col.key === "profit" && Number(rawVal) < 0;
                        return <td key={col.key} data-frozen={isFrozen ? "1" : undefined} style={isFrozen ? {position:"sticky",zIndex:10} : {}} className={`${CELL_CLASS} text-right font-mono text-sm ${readonlyFrozen} ${isGreen ? "text-green-700 font-bold" : isRed ? "text-red-500 font-bold" : "text-gray-500"}`}>{fmtCNY(Number(rawVal))}</td>;
                      }
                      if (colType === "number") return <td key={col.key} className={`${CELL_CLASS} text-right ${frozenClass} ${shadowClass}`} data-frozen={isFrozen ? "1" : undefined} style={isFrozen ? {position:"sticky",zIndex:10} : {}}><EditableNumber value={Number(rawVal)} onSave={(v) => updateCell(o.id, col.key, v)} /></td>;
                      if (colType === "datetime" || colType === "date") return <td key={col.key} data-frozen={isFrozen ? "1" : undefined} style={isFrozen ? {position:"sticky",zIndex:10} : {}} className={`${CELL_CLASS} ${frozenClass} ${shadowClass}`}><EditableDate value={String(rawVal ?? "")} type={colType} onSave={(v) => updateCell(o.id, col.key, v)} /></td>;
                      if (colType === "dropdown" && dropdownOpts?.size) return (
                        <td key={col.key} className={`${CELL_CLASS} group ${frozenClass} ${shadowClass}`} data-frozen={isFrozen ? "1" : undefined} style={isFrozen ? {position:"sticky",zIndex:10} : {}}>
                          <DropdownCell value={String(rawVal)} options={[...dropdownOpts]} color={cellBgColor} onSave={(v) => { updateCell(o.id, col.key, v); addDropdownOption(col.key, v); }} onRemoveOption={(v) => removeDropdownOption(col.key, v)} />
                        </td>
                      );
                      return (
                        <td key={col.key} className={`${CELL_CLASS} ${frozenClass} ${shadowClass}`} data-frozen={isFrozen ? "1" : undefined} style={isFrozen ? {position:"sticky",zIndex:10} : {}}>
                          <PillTag color={cellBgColor}><EditableCell value={String(rawVal ?? "")} onSave={(v) => updateCell(o.id, col.key, v)} /></PillTag>
                        </td>
                      );
                    })}
                    <td className={`${CELL_CLASS} text-center`}><button onClick={() => deleteRow(o.id)} className="text-red-500 hover:text-red-700 text-xs">🗑</button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ── 可编辑文本单元格 ──
function EditableCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (local !== value) onSave(local);
  };

  return editing ? (
    <input
      autoFocus
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setLocal(value); setEditing(false); }
      }}
      className="w-full min-w-[80px] bg-white/70 text-sm px-1 py-0 rounded"
    />
  ) : (
    <div
      className="max-w-[140px] truncate min-h-[20px] text-sm cursor-text select-text"
      title={value || ""}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-gray-300">-</span>}
    </div>
  );
}

// ── 可编辑数字单元格 ──
function EditableNumber({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);

  const commit = () => {
    setEditing(false);
    const num = parseFloat(local) || 0;
    if (num !== value) onSave(num);
  };

  return editing ? (
    <input
      autoFocus
      type="number"
      step="0.01"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setLocal(String(value)); setEditing(false); }
      }}
      className="w-full min-w-[70px] bg-white/70 text-sm px-1 py-0 text-right rounded"
    />
  ) : (
    <div className="min-w-[50px] min-h-[20px] text-sm cursor-text select-text text-right" title={fmtCNY(value)} onClick={() => setEditing(true)}>
      {fmtCNY(value)}
    </div>
  );
}

// ── 输入 + 建议下拉 ──
function DropdownCell({
  value, options, color, onSave, onAddOption, onRemoveOption,
}: {
  value: string; options: string[]; color: string;
  onSave: (v: string) => void;
  onAddOption?: (v: string) => void;
  onRemoveOption?: (v: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "input" | "select">("view");
  const [local, setLocal] = useState(value);
  const [filterText, setFilterText] = useState("");
  useEffect(() => { setLocal(value); setFilterText(""); }, [value]);

  const filteredOptions = filterText
    ? options.filter((o) => o.toLowerCase().includes(filterText.toLowerCase()))
    : options;

  const commit = (v?: string) => {
    const final = v ?? local;
    if (final !== value) {
      onSave(final);
      if (onAddOption && final) onAddOption(final);
    }
    setMode("view");
  };

  const pillStyle = color !== "transparent"
    ? { backgroundColor: color }
    : {};

  // 查看模式：药丸只包文字，▼ 紧贴右边且悬浮时才出现
  if (mode === "view") {
    return (
      <div className="flex items-center min-h-[20px]">
        <span
          className="inline-block pl-2.5 pr-1.5 py-0.5 rounded-md text-sm text-gray-900 font-medium cursor-text select-text max-w-[140px] truncate"
          title={value || ""}
          style={pillStyle}
          onClick={() => { setLocal(value); setMode("input"); }}
        >
          {value || <span className="text-gray-300">-</span>}
        </span>
        {options.length > 0 && (
          <button
            className="ml-auto text-gray-300 text-xs leading-none px-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setMode("select"); }}
            title="下拉选择已有值"
          >
            ▼
          </button>
        )}
      </div>
    );
  }

  // 输入模式
  if (mode === "input") {
    return (
      <input
        autoFocus
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setLocal(value); setMode("view"); }
        }}
        className="w-full min-w-[80px] text-sm px-1 py-0 rounded bg-white border border-blue-300"
      />
    );
  }

  // 下拉选择模式（带搜索）
  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={() => setMode("view")} />
      <div className="relative z-50 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[160px] overflow-hidden">
        {/* 搜索框 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-2 py-1.5">
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2.5 py-1 ring-1 ring-inset ring-gray-200 focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-white transition-all">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              autoFocus
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="搜索..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              onKeyDown={(e) => e.stopPropagation()}
            />
            {filterText && (
              <button
                className="text-gray-400 hover:text-gray-600 text-xs"
                onMouseDown={(e) => { e.preventDefault(); setFilterText(""); }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* 选项列表 */}
        <div className="max-h-44 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400 text-center">
              {filterText ? "无匹配项" : "暂无选项"}
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div key={opt} className="flex items-center group/opt">
                <div
                  className="flex-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
                >
                  {opt}
                </div>
                {onRemoveOption && (
                  <button
                    className="opacity-0 group-hover/opt:opacity-100 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded text-xs shrink-0 mr-1 transition-all"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveOption(opt); }}
                    title="删除此选项"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── 日期 / 时间编辑（支持滚轮选择）──
function EditableDate({
  value,
  type,
  onSave,
}: {
  value: string;
  type: "date" | "datetime";
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const parseVal = (v: string) => {
    if (!v) return { date: "", time: "" };
    const [d, t] = v.split("T");
    return { date: d, time: t || "00:00" };
  };
  const { date: initDate, time: initTime } = parseVal(value);
  const [localDate, setLocalDate] = useState(initDate);
  const [localTime, setLocalTime] = useState(initTime);
  useEffect(() => {
    const p = parseVal(value);
    setLocalDate(p.date);
    setLocalTime(p.time);
  }, [value]);

  const commit = () => {
    setEditing(false);
    const newVal = type === "datetime" ? `${localDate}T${localTime}` : localDate;
    if (newVal !== value) onSave(newVal);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      commit();
    }
  };

  const formatDisplay = (v: string) => {
    if (!v) return <span className="text-gray-300">-</span>;
    if (type === "datetime") return v.replace("T", " ");
    return v;
  };

  if (!editing) {
    return (
      <div className="min-w-[80px] min-h-[20px] text-sm cursor-text" onClick={() => setEditing(true)}>
        {formatDisplay(value)}
      </div>
    );
  }

  const [h, m] = localTime.split(":");

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      <input
        autoFocus
        type="date"
        value={localDate}
        onChange={(e) => setLocalDate(e.target.value)}
        onBlur={handleBlur}
        className="text-sm px-1 py-0 rounded bg-white border border-blue-300"
      />
      {type === "datetime" && (
        <div className="flex items-center gap-0.5">
          <select
            value={h || "00"}
            onChange={(e) => setLocalTime(`${e.target.value}:${m || "00"}`)}
            onBlur={handleBlur}
            className="text-sm px-0.5 py-0 rounded bg-white border border-blue-300 text-center"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, "0")}>{String(i).padStart(2, "0")}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">:</span>
          <select
            value={m || "00"}
            onChange={(e) => setLocalTime(`${h || "00"}:${e.target.value}`)}
            onBlur={handleBlur}
            className="text-sm px-0.5 py-0 rounded bg-white border border-blue-300 text-center"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, "0")}>{String(i).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

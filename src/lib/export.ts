import * as XLSX from "xlsx";

const COL_MAP: Record<string, string> = {
  customerName: "客户名称", customerRegion: "地区",
  customerAddress: "地址", productName: "货品名称",
  productStatus: "货品状态", upstreamContact: "上游对接",
  priorityShipping: "优先发货", isReturn: "是否退货",
  salesStatus: "售卖状态", packagingShipping: "包装快递费",
  purchasePrice: "进价", sellingPrice: "卖价",
  actualPayment: "实付", returnPackagingCost: "退货包装成本费",
  returnPurchasePrice: "退货进价", returnSellingPrice: "退货卖价",
  actualRefund: "实退", returnProfit: "实退利润", profit: "利润",
  ironFanBenefit: "铁粉福利", diamondFanBenefit: "钻粉福利",
  loyalFanBenefit: "挚爱粉福利", superFanBenefit: "超粉福利",
  startDate: "开始日期", completionDate: "完成日期", remark: "备注",
};

function orderToRow(o: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const [key, label] of Object.entries(COL_MAP)) {
    const v = o[key];
    if (typeof v === "boolean") row[label] = v ? "是" : "否";
    else if (key === "startDate" || key === "completionDate") row[label] = v ? String(v).replace("T", " ") : "";
    else row[label] = v ?? "";
  }
  return row;
}

function sanitizeCSV(val: unknown): string {
  const s = String(val ?? "").replace(/"/g, '""');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

export function exportCSV(orders: Record<string, unknown>[], filename = "orders.csv") {
  const rows = orders.map(orderToRow);
  const headers = Object.values(COL_MAP);
  const csv = [headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => headers.map((h) => `"${sanitizeCSV(r[h])}"`).join(","))].join("\n");
  downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportExcel(orders: Record<string, unknown>[], filename = "orders.xlsx") {
  const ws = XLSX.utils.json_to_sheet(orders.map(orderToRow));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "订单");
  XLSX.writeFile(wb, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

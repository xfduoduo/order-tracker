import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcOrderProfit } from "@/lib/utils";
import { orderCreateSchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const { orders } = raw as { orders: Record<string, unknown>[] };
    if (!Array.isArray(orders)) {
      return NextResponse.json({ success: false, error: "orders 必须是数组" }, { status: 400 });
    }
    let count = 0;
    for (const item of orders) {
      const body = orderCreateSchema.parse(item);
      const { profit, returnProfit } = calcOrderProfit({
        actualPayment: body.actualPayment, purchasePrice: body.purchasePrice,
        packagingShipping: body.packagingShipping, actualRefund: body.actualRefund,
        returnPurchasePrice: body.returnPurchasePrice, returnPackagingCost: body.returnPackagingCost,
      });
      await prisma.order.create({ data: { ...body, profit, returnProfit } });
      count++;
    }
    return NextResponse.json({ success: true, data: { count } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "导入失败" }, { status: 500 });
  }
}

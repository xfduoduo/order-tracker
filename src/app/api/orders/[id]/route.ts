import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcOrderProfit } from "@/lib/utils";
import { orderUpdateSchema } from "@/lib/schema";

// GET /api/orders/:id — 获取单个订单
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取订单失败" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/:id — 更新订单
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const raw = await request.json();
    const body = orderUpdateSchema.parse(raw);

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    // 合并已有数据计算利润，避免未传字段变成 0
    const merged = { ...existing, ...body };
    const { profit, returnProfit } = calcOrderProfit({
      actualPayment: merged.actualPayment,
      purchasePrice: merged.purchasePrice,
      packagingShipping: merged.packagingShipping,
      actualRefund: merged.actualRefund,
      returnPurchasePrice: merged.returnPurchasePrice,
      returnPackagingCost: merged.returnPackagingCost,
    });

    const order = await prisma.order.update({
      where: { id },
      data: { ...body, profit, returnProfit },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "更新订单失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/:id — 删除订单
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.order.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "删除订单失败" },
      { status: 500 }
    );
  }
}

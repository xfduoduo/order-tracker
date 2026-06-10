import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcOrderProfit } from "@/lib/utils";
import { orderCreateSchema } from "@/lib/schema";

// GET /api/orders — 获取所有订单
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { customerName: { contains: search } },
            { productName: { contains: search } },
            { customerRegion: { contains: search } },
          ],
        }
      : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      meta: { total, page, limit },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取订单列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/orders — 创建新订单
export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const body = orderCreateSchema.parse(raw);

    const { profit, returnProfit } = calcOrderProfit({
      actualPayment: body.actualPayment,
      purchasePrice: body.purchasePrice,
      packagingShipping: body.packagingShipping,
      actualRefund: body.actualRefund,
      returnPurchasePrice: body.returnPurchasePrice,
      returnPackagingCost: body.returnPackagingCost,
    });

    const order = await prisma.order.create({
      data: { ...body, profit, returnProfit },
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "创建订单失败" },
      { status: 500 }
    );
  }
}

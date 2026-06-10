/** 计算利润：实付 - 进价 - 包装快递费 */
export function calcProfit(
  actualPayment: number,
  purchasePrice: number,
  packagingShipping: number
): number {
  return actualPayment - purchasePrice - packagingShipping;
}

/** 计算实退利润：实退 - 退货进价 - 退货包装成本费 */
export function calcReturnProfit(
  actualRefund: number,
  returnPurchasePrice: number,
  returnPackagingCost: number
): number {
  return actualRefund - returnPurchasePrice - returnPackagingCost;
}

/** 格式化金额为两位小数 */
export function fmtMoney(value: number): string {
  return value.toFixed(2);
}

/** 格式化 CNY */
export function fmtCNY(value: number): string {
  return `¥${fmtMoney(value)}`;
}

/** 从订单数据计算并返回完整利润 */
export function calcOrderProfit(order: {
  actualPayment: number;
  purchasePrice: number;
  packagingShipping: number;
  actualRefund: number;
  returnPurchasePrice: number;
  returnPackagingCost: number;
}): { profit: number; returnProfit: number } {
  return {
    profit: calcProfit(
      order.actualPayment,
      order.purchasePrice,
      order.packagingShipping
    ),
    returnProfit: calcReturnProfit(
      order.actualRefund,
      order.returnPurchasePrice,
      order.returnPackagingCost
    ),
  };
}

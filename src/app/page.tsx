import OrderTable from "@/components/OrderTable";

export default function Home() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">📋 订单表格</h1>
      <OrderTable />
    </div>
  );
}

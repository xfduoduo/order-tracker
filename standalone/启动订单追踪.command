#!/bin/bash
cd "$(dirname "$0")/.."
npm run dev -- -p 3456 &
sleep 3
open http://localhost:3456
echo "订单追踪系统 → http://localhost:3456"
read -p "按回车关闭..."

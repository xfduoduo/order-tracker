#!/bin/bash
set -e
TARGET="${1:-$HOME/Desktop/order-tracker-$(date +%Y%m%d)}"
SOURCE="$(cd "$(dirname "$0")" && pwd)"
echo "📦 备份到: $TARGET"
rsync -av --progress --exclude 'node_modules' --exclude '.next' --exclude '.git' "$SOURCE/" "$TARGET/"
cp "$SOURCE/prisma/dev.db" "$TARGET/prisma/dev.db" 2>/dev/null && echo "✅ 数据库已复制" || echo "⚠️ 未找到数据库"
cat > "$TARGET/setup.sh" << 'SETUP'
#!/bin/bash
set -e
echo "🚀 恢复中..."
npm install && npx prisma generate
echo "✅ 完成，运行: npm run dev"
SETUP
chmod +x "$TARGET/setup.sh"
echo "✅ 备份完成！目标: $TARGET"
echo "在新电脑: cd 到目录 → bash setup.sh → npm run dev"

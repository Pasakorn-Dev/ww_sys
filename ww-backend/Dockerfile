FROM node:22-alpine

WORKDIR /app

# Puppeteer ใช้ Chromium ของระบบ (ไม่โหลดเอง)
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates ttf-freefont

COPY package*.json ./
# ติดตั้งเฉพาะ production dependencies
RUN npm install --omit=dev && npm cache clean --force

COPY . .

# ไม่รันเป็น root — ลดความเสียหายถ้า container ถูกเจาะ
RUN chown -R node:node /app
USER node

# พอร์ตตรงกับ PORT ใน .env
EXPOSE 3000

CMD ["node", "src/server.js"]

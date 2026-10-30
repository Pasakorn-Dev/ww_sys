# ww-backend/Dockerfile
FROM node:24-alpine

WORKDIR /app

# Puppeteer ใช้ Chromium ของระบบ (ไม่โหลดเอง)
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ถ้ารายงาน PDF ภาษาไทยตัวอักษรเพี้ยน ให้เพิ่ม font-noto-thai ในบรรทัดนี้
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont \
 && if [ ! -e /usr/bin/chromium ] && [ -e /usr/bin/chromium-browser ]; then ln -s /usr/bin/chromium-browser /usr/bin/chromium; fi \
 && test -x /usr/bin/chromium   # ถ้าไม่พบ Chromium ให้ build ล้มตั้งแต่ตอนนี้ (ไม่ใช่ไปพังตอนออกรายงาน)

COPY package*.json ./
# ติดตั้งเฉพาะ production dependencies
RUN npm install --omit=dev && npm cache clean --force

COPY . .

# ไม่รันเป็น root
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]

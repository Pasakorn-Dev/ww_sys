FROM node:18-alpine

# กำหนดพื้นที่ทำงาน
WORKDIR /app

# 1. ปิดไม่ให้ Puppeteer โหลด Chromium เอง (เพราะมักจะพังใน Docker) และชี้เป้าไปที่ตัวที่เราจะติดตั้ง
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 2. ติดตั้ง Chromium และไลบรารีที่จำเป็นสำหรับการเรนเดอร์ PDF
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# คัดลอกไฟล์ package.json ไปติดตั้งไลบรารีก่อน (เพื่อใช้ Cache)
COPY package*.json ./
RUN npm install

# คัดลอกโค้ดที่เหลือทั้งหมด
COPY . .

# แจ้งเตือนว่า Container นี้ทำงานที่พอร์ต 5000
EXPOSE 3000

# คำสั่งรัน Server (เช่น node server.js หรือ npm start)
CMD ["npm", "start"]


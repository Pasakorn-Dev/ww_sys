FROM node:18-alpine

# กำหนดพื้นที่ทำงาน
WORKDIR /app

# คัดลอกไฟล์ package.json ไปติดตั้งไลบรารีก่อน (เพื่อใช้ Cache)
COPY package*.json ./
RUN npm install

# คัดลอกโค้ดที่เหลือทั้งหมด
COPY . .

# แจ้งเตือนว่า Container นี้ทำงานที่พอร์ต 5000
EXPOSE 5000

# คำสั่งรัน Server (เช่น node server.js หรือ npm start)
CMD ["npm", "start"]


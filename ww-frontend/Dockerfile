# Stage 1: Build โค้ด React + Vite
FROM node:20-slim AS builder

WORKDIR /app

# copy เฉพาะ package.json (ไม่เอา lockfile ของ Windows)
COPY package.json ./

RUN npm install

COPY . .

RUN npm run build
# (หมายเหตุ: Vite มักจะสร้างไฟล์ไว้ที่โฟลเดอร์ dist)

# Stage 2: นำไฟล์ที่ Build เสร็จไปเปิดใช้งานด้วย Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
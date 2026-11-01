ด้านล่างคือชุดคำสั่งทั้งหมดตามลำดับ ใช้ path /opt/ww\_sys และ IP 192.168.0.50 เป็นตัวอย่าง ให้แก้เป็นของคุณ

ผมปรับ docker-compose.yml ใน lan-setup.zip ให้อ่านเวอร์ชันอิมเมจจาก .env (BACKEND\_TAG, FRONTEND\_TAG) และเพิ่ม TZ=Asia/Bangkok ให้ แล้ว commit ไฟล์ใหม่ขึ้น git ก่อนทำขั้นที่ 2 เพื่อให้ครั้งต่อไปอัปเดตเวอร์ชันได้โดยไม่ต้องแก้ไฟล์ที่ติด git ชุดคำสั่งนี้ผมยังไม่ได้รันบน Server จริง ตรวจผลทุกขั้นตามที่ระบุ

## **0\) เตรียม Server (ครั้งเดียว)**

curl \-fsSL https\://get.docker.com \| sudo sh        \# ติดตั้ง Docker \+ Compose  
sudo usermod \-aG docker \$USER                      \# ใช้ docker ได้โดยไม่ต้อง sudo  
sudo systemctl enable docker                       \# เปิดเครื่องแล้ว Docker ขึ้นเอง  
sudo apt install \-y git ufw  
sudo timedatectl set-timezone Asia/Bangkok  
\# ออกจาก SSH แล้วเข้าใหม่ 1 ครั้ง จากนั้นตรวจ:  
docker compose version && git \--version

ไฟร์วอลล์ (วงแลน):

sudo ufw allow from 192.168.0.0/24 to any port 22,80,5050 proto tcp  
sudo ufw enable

## **1\) สร้างโฟลเดอร์โปรเจกต์ และดึงไฟล์จาก git**

sudo mkdir \-p /opt/ww\_sys && sudo chown \$USER:\$USER /opt/ww\_sys  
git clone \<URL-git-ของคุณ\> /opt/ww\_sys           \# repo private ให้ใช้ Personal Access Token หรือ SSH deploy key  
cd /opt/ww\_sys  
ls                                                 \# ต้องเห็น docker-compose.yml nginx/ database-init/ scripts/

แก้ไฟล์ที่อาจติด CRLF จาก Windows และตั้งสิทธิ์รัน:

sed \-i 's/\\r\$//' database-init/1-init-user.sh scripts/\*.sh  
chmod \+x database-init/1-init-user.sh scripts/\*.sh

ไฟล์สำรองข้อมูลจริง **ไม่ควรอยู่ใน git** ให้ส่งจากเครื่อง Windows/dev มาที่ Server ตรง ๆ (รันบนเครื่อง dev):

scp database-init/2\_backup\_171026.sql user@192.168.0.50:/opt/ww\_sys/database-init/

## **2\) สร้างไฟล์ลับจากไฟล์ตัวอย่าง**

cd /opt/ww\_sys  
cp .env.example .env  
cp .env.db.example .env.db  
cp .env.pgadmin.example .env.pgadmin

\# สร้างรหัสสุ่ม แล้วใส่ลงไฟล์ให้อัตโนมัติ (hex ไม่มีอักขระพิเศษ ปลอดภัยกับ sed)  
ADMIN\_PW=\$(openssl rand \-hex 24); APP\_PW=\$(openssl rand \-hex 24\)  
JWT=\$(openssl rand \-hex 48);      PGA=\$(openssl rand \-hex 16\)  
sed \-i "s\|^POSTGRES\_PASSWORD=.\*\|POSTGRES\_PASSWORD=\$ADMIN\_PW\|; s\|^APP\_DB\_PASSWORD=.\*\|APP\_DB\_PASSWORD=\$APP\_PW\|" .env.db  
sed \-i "s\|^JWT\_SECRET=.\*\|JWT\_SECRET=\$JWT\|; s\|^DB\_PASSWORD=.\*\|DB\_PASSWORD=\$APP\_PW\|" .env  
sed \-i "s\|^PGADMIN\_DEFAULT\_PASSWORD=.\*\|PGADMIN\_DEFAULT\_PASSWORD=\$PGA\|" .env.pgadmin  
echo "TZ=Asia/Bangkok" \>\> .env.db  
chmod 600 .env .env.db .env.pgadmin  
echo "รหัส pgAdmin: \$PGA   ← จดเก็บไว้ในที่ปลอดภัยตอนนี้"

แล้วแก้ส่วนที่ต้องกรอกเอง:

nano .env              \# BACKEND\_TAG/FRONTEND\_TAG (ให้ตรงกับที่ push ขึ้น Hub), CORS\_ORIGINS=http\://192.168.0.50, MYSQL\_\* ของสาขา  
nano .env.pgadmin      \# PGADMIN\_DEFAULT\_EMAIL เป็นอีเมลรูปแบบจริง  
nano nginx/default.conf  \# บรรทัด allow 192.168.0.0/24; ให้ตรงกับวงแลนของคุณ (เช็คด้วย: ip addr)

เช็คว่าไม่เหลือค่าตัวอย่าง: grep \-n "CHANGE\_ME\\\|example" .env .env.db .env.pgadmin (ต้องไม่ขึ้นบรรทัดใดที่ยังต้องแก้)

## **3\) ดึงอิมเมจจาก Docker Hub และรันครั้งแรก**

docker login                                  \# ถ้า repo บน Hub เป็น private  
docker compose config \> /dev/null && echo "compose ok"     \# ตรวจไฟล์/ตัวแปร  
docker compose pull

docker compose up \-d postgres-db  
docker compose logs \-f postgres-db            \# รอจนเห็น "ready to accept connections" เป็นครั้งที่ 2  
                                              \# (ครั้งแรก \= init \+ restore ข้อมูล ถ้ามี error ให้หยุดดูที่นี่) กด Ctrl+C ออก

docker compose up \-d \--no-build               \# สตาร์ทที่เหลือ (--no-build \= ใช้อิมเมจที่ pull มา ไม่ build เอง)  
docker compose ps                             \# ทุกตัวต้อง Up / postgres-db เป็น healthy

## **4\) ทดสอบว่าแอปทำงาน**

curl \-s \-o /dev/null \-w "เว็บ: %{http\_code}\\n" http\://127.0.0.1/                    \# ต้อง 200  
curl \-s \-w "\\nAPI: %{http\_code}\\n" http\://127.0.0.1/api/auth/me                      \# ต้อง 401 พร้อม JSON "กรุณาเข้าสู่ระบบ"  
docker compose exec postgres-db psql \-U postgres \-d ww\_sys \-c "\\dt public.\*" \| head   \# ต้องเห็นตาราง

แล้วเปิด http\://192.168.0.50 จากเครื่องอื่นในวงแลน ลอง login

## **5\) pgAdmin (เปิดเฉพาะตอนใช้)**

docker compose \--profile admin pull pgadmin       \# ครั้งแรก  
docker compose \--profile admin up \-d pgadmin      \# เปิด → http\://192.168.0.50:5050  
docker compose stop pgadmin                       \# ปิดเมื่อเสร็จงาน

## **6\) ดู log และตรวจปัญหา**

docker compose ps                                 \# สถานะทุกตัว (Restarting \= มีปัญหา)  
docker compose logs \--tail=100 backend            \# 100 บรรทัดล่าสุด  
docker compose logs \-f backend                    \# ติดตามสด (Ctrl+C ออก)  
docker compose logs \--since=30m nginx-gateway     \# 30 นาทีที่ผ่านมา  
docker compose logs \--tail=50                     \# ทุก service  
docker stats \--no-stream                          \# ใช้ CPU/RAM  
docker compose exec backend sh                    \# เข้าไปในคอนเทนเนอร์ (ออกด้วย exit)  
docker compose exec postgres-db psql \-U postgres \-d ww\_sys     \# เข้า SQL  
df \-h && docker system df                         \# พื้นที่ดิสก์

อาการที่พบบ่อย: backend ตายทันที → ดู log หาบรรทัด \[Config\] พบปัญหา, 502 → backend ยังไม่ขึ้น, login เด้งกลับ → เช็ค CORS\_ORIGINS และ COOKIE\_SECURE=false

## **7\) แก้ค่าแล้วจะโหลดใหม่อย่างไร**

| แก้อะไร | คำสั่ง |
| ----- | ----- |
| .env (ค่าของ backend) | docker compose up \-d \--force-recreate backend |
| .env.db | **แก้แล้วไม่มีผลกับ DB เดิม** (ใช้ตอนสร้างครั้งแรกเท่านั้น) ถ้าเปลี่ยนรหัส app\_user ต้อง ALTER USER ใน DB ด้วย |
| nginx/default.conf | docker compose exec nginx-gateway nginx \-t ผ่านแล้ว docker compose restart nginx-gateway |
| docker-compose.yml | docker compose up \-d \--no-build (สร้างใหม่เฉพาะ service ที่เปลี่ยน) |
| เวอร์ชันอิมเมจใหม่ | ดูหัวข้อ 8 |

ข้อควรรู้สองข้อ: docker compose restart **ไม่อ่าน .env ใหม่** ต้องใช้ up \-d \--force-recreate และถ้าแก้ default.conf ด้วย sed \-i ไฟล์จะเป็นไฟล์ใหม่ที่ nginx เห็นไม่ทันด้วย reload ธรรมดา ให้ใช้ restart ตามตาราง

## **8\) อัปเดตเวอร์ชันใหม่ / ย้อนกลับ**

บนเครื่อง dev: build และ push อิมเมจ tag ใหม่ (เช่น v1.1.1) แล้วบน Server:

cd /opt/ww\_sys  
git pull                                           \# ถ้ามีการแก้ compose/nginx ใน git  
nano .env                                          \# แก้ BACKEND\_TAG / FRONTEND\_TAG เป็นเวอร์ชันใหม่  
docker compose pull backend frontend  
docker compose up \-d \--no-build backend frontend  
docker compose logs \--tail=30 backend              \# ตรวจว่าขึ้นปกติ

ย้อนกลับ: แก้ tag กลับเป็นเวอร์ชันเดิม แล้วรัน pull กับ up \-d \--no-build ซ้ำ ข้อมูลใน DB ไม่ถูกแตะ

## **9\) หยุด / เปิด / ปิดทั้งระบบ**

docker compose stop                \# หยุดทุกตัว (ข้อมูลอยู่ครบ)  
docker compose start               \# เปิดกลับ  
docker compose restart backend     \# รีสตาร์ทตัวเดียว (ไม่โหลด .env ใหม่)  
docker compose down                \# ลบคอนเทนเนอร์ แต่ "ข้อมูล DB ยังอยู่" ใน volume  
docker compose down \-v             \# ⚠️ ลบข้อมูล DB ทั้งหมดด้วย ใช้เฉพาะเมื่อตั้งใจเริ่มใหม่

ทุก service ตั้ง restart: unless-stopped ไว้แล้ว รีบูตเครื่องแล้วระบบขึ้นเอง ควรลองรีบูตทดสอบสักครั้งก่อนใช้งานจริง

## **10\) งานดูแลระบบที่ควรตั้งไว้**

**สำรอง DB อัตโนมัติ** (เก็บ 14 วัน):

crontab \-e  
0 2 \* \* \* cd /opt/ww\_sys && ./scripts/backup-db.sh \>\> backups/backup.log 2\>&1

ควรคัดลอกโฟลเดอร์ backups/ ไปเก็บเครื่องอื่นด้วย

**กัน log โตจนดิสก์เต็ม** (Docker ไม่จำกัดขนาด log โดยค่าเริ่มต้น):

echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }' \| sudo tee /etc/docker/daemon.json  
sudo systemctl restart docker  
cd /opt/ww\_sys && docker compose up \-d \--force-recreate \--no-build     \# ให้คอนเทนเนอร์ใช้ค่าใหม่

(ถ้ามี daemon.json อยู่แล้ว ให้แก้ไฟล์เดิม ไม่ใช่เขียนทับ)

**ล้างอิมเมจเก่า** (ทำเป็นครั้งคราว): docker image prune \-a (ลบเฉพาะอิมเมจที่ไม่ถูกใช้ ไม่ลบ volume)  
 **อัปเดต OS**: sudo apt update && sudo apt upgrade \-y แล้วรีบูตเมื่อมี kernel ใหม่

เมื่อพร้อมเปิดออกอินเทอร์เน็ต ให้ทำตามสรุปเฟส 2 ที่ให้ไปก่อนหน้า ถ้าติดขั้นไหน ส่งผลของ docker compose ps และ docker compose logs \--tail=50 \<ชื่อ service\> มาได้เลยครับ


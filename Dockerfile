# Build aşaması
FROM node:20-alpine as build
WORKDIR /app

# Bağımlılıkları yükle
COPY package*.json ./
RUN npm install

# Kaynak kodları kopyala ve projeyi derle
COPY . .
RUN npm run build

# Prod (Sunucu) aşaması
FROM nginx:alpine
# Nginx ayar dosyasını kopyala (SPA için gerekli)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Derlenmiş dosyaları nginx dizinine kopyala
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

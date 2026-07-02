FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY server ./server
COPY public ./public
COPY database ./database

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=elecciones
ENV DB_PASSWORD=elecciones123
ENV DB_NAME=elecciones_db

EXPOSE 3000

CMD ["node", "server/index.js"]

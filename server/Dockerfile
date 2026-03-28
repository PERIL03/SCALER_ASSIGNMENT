FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "if [ \"$RUN_SEED_ON_STARTUP\" = \"true\" ]; then npm run seed; fi; npm start"]

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
RUN adduser -D appuser && chown -R appuser /app
USER appuser
EXPOSE 4001
CMD ["node", "src/index.js"]

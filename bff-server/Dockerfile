FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
RUN adduser -D appuser && chown -R appuser /app
USER appuser
EXPOSE 4000
CMD ["node", "src/index.js"]

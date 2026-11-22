FROM node:22-alpine

WORKDIR /app

# Use the same npm major as CI to keep lockfile installation deterministic.
RUN npm install --global npm@11.21.3

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

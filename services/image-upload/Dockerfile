FROM node:21

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN npm run build

# Create logs directory
RUN mkdir -p logs

EXPOSE 3004

CMD ["npm", "start"]

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN npm run build

# Copy proto files to dist directory
RUN mkdir -p dist/proto dist/services/protos
RUN cp -r src/proto/* dist/proto/
RUN cp -r src/services/protos/* dist/services/protos/

EXPOSE 3003

CMD ["npm", "start"]

# syntax=docker/dockerfile:1

FROM node:14-alpine3.12

WORKDIR /app

COPY ["package.json", "package-lock.json*", "firebase-cred.json", ".env", "./"]

RUN npm install

COPY . .

EXPOSE 5000

CMD [ "node", "./src/server/DogeTeller.js"]

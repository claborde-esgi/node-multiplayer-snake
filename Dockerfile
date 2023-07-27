FROM node:16-alpine

COPY . /app

CMD node /app/app.js

EXPOSE 3000

FROM node:20
WORKDIR /app
COPY config/package.json /app/
COPY config/*.js /app/
RUN npm install
EXPOSE 8080
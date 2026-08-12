FROM node:20
RUN mkdir -p /var/log/expense-backend
WORKDIR /app
COPY config/package.json /app/
COPY config/*.js /app/
RUN npm install
EXPOSE 8080
CMD ["node", "index.js"]
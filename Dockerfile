FROM node : 18
WORKDIR /app
COPY package*.json ./
RUN npm isntall
COPY . .
EXPOSE 5000
CMD  ["node", "index.js"]
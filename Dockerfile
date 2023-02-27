FROM node:19-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json .
RUN npm install

COPY . .
RUN npm run build

# Run as the node user.
USER 1000

ENTRYPOINT ["node", "build"]

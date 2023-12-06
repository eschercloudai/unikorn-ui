FROM node:21-alpine as build

WORKDIR /app

COPY . .

RUN npm install \
 && npm run build

FROM gcr.io/distroless/nodejs20:nonroot

COPY --from=build /app /app
WORKDIR /app

CMD ["build"]

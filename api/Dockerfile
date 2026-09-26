FROM node:24-alpine
WORKDIR /app
COPY server.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
# node:sqlite est encore marqué expérimental en Node 24 — on coupe juste l'avertissement.
ENV PORT=8080 DATA_DIR=/data NODE_OPTIONS=--disable-warning=ExperimentalWarning
EXPOSE 8080
CMD ["node", "server.mjs"]

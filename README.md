# neo-cat

machbase-neo watch-*cat*, better than *watch-dog*.

## Build

```sh
cd frontend && \
npm run build && \
cd .. && \
go build -o ./frontend/build/.backend/neo-cat . && \
cp .backend.yml ./frontend/build && \
cp start.sh stop.sh ./frontend/build/.backend && \
cd frontend && \
tar zcf ../neo-cat-package.tgz ./build && \
cd ..
```
# neo-cat

machbase-neo watch-*cat*, better than *watch-dog*.


## Build

```sh
cd frontend && \
npm run build && \
cd .. && \
go build -o ./frontend/build/.backend/neo-cat . && \
cp scripts/* ./frontend/build/.backend && \
cp .backend.yml ./frontend/build && \
tar zcf ../neo-cat-package.tgz ./frontend/build
```
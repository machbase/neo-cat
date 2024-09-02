# neo-cat

machbase-neo's *watch-cat*, rather than *watch-dog*.

![logo](./docs/images/neocatx256.png)

**Features & Todo**
- [x] System load
- [x] CPU
- [x] Memory
- [ ] Disk Usage

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
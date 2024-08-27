./.backend/neo-cat \
    --log-level DEBUG \
    --pid ./.backend/pid \
    --interval $INTERVAL \
    --in-load \
    --out-http "http://localhost:5654/db/write/${TABLE_NAME}?timeformat=s&method=insert"
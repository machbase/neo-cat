.\.backend\neo-cat ^
    --log-level DEBUG ^
    --pid .\.backend/pid ^
    --interval %INTERVAL% ^
    --tag-prefix "%TAG_PREFIX%" ^
    --in-load ^
    --in-cpu ^
    --in-mem ^
    --out-mqtt "tcp://127.0.0.1:5653/db/append/${TABLE_NAME}:csv"
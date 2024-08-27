if [ -e ./.backend/pid ]
then
    kill `cat ./.backend/pid`
fi

var app = require('express')();
let express = require('express');
var server = require('http').Server(app);
var io = require('socket.io')(server);
app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});
app.use(express.static(__dirname + '/'));//设置静态文件目录
server.listen(9090,'localhost');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

let currentUsers = [];
let allSockets = [];
let titles = ['大象', '花朵', '树苗', '自由女神', '拖鞋', 'bra', '美女'];
let rightAnswers = [];
let timer = null;
let timeOut = null;
let roundTotalTime = 60;
let singleRoungTime = 0;
let currentTitleIndex = 0;
let currentUserIndex = 0;

io.on('connection', function (socket) {
    if (!socket.username) {
        socket.emit('login');
    }
    socket.emit('client currentUserList', currentUsers);
    socket.broadcast.emit('client currentUserList', currentUsers);

    socket.on('drawimgStart', function (data) {
        if (socket.username) {
            socket.emit('client drawstart', {data: data});
            socket.broadcast.emit('client drawstart', {data: data});
        } else {
            socket.emit('login');
        }

    })

    socket.on('gamestart', function () {

        if (currentUsers.length < 2 || allSockets.length < 2) {
            socket.emit('cannot start');
            socket.broadcast.emit('cannot start');
        } else {
            if (singleRoungTime != 0) {
                return
            }
            console.log('游戏开始')
            if (!currentUsers[currentUserIndex]) {
                currentUserIndex = 0;
            }
            socket.emit('client clearimg');
            socket.broadcast.emit('client clearimg');
            socket.emit('client msgin', {name: currentUsers[currentUserIndex], type: 'gamestart'});
            socket.broadcast.emit('client msgin', {name: currentUsers[currentUserIndex], type: 'gamestart'});
            allSockets[currentUserIndex].emit('client msgin', {name: titles[currentTitleIndex], type: 'gameTitle'})
            timer = setInterval(function () {
                singleRoungTime++;
                socket.emit('time left', {time: roundTotalTime - singleRoungTime})
                socket.broadcast.emit('time left', {time: roundTotalTime - singleRoungTime})
                if (singleRoungTime >= roundTotalTime) {

                    singleRoungTime = 0;
                    socket.emit('client msgin', {time: 5, type: 'gameover'})
                    socket.broadcast.emit('client msgin', {time: 5, type: 'gameover'})
                    rightAnswers = [];

                    timeOut = setTimeout(function () {
                        if (currentTitleIndex < titles.length - 1) {
                            currentTitleIndex++;
                        } else {
                            currentTitleIndex = 0;
                        }
                        if (currentUserIndex < currentUsers.length - 1) {
                            currentUserIndex++;
                        } else {
                            currentUserIndex = 0;
                        }
                        // socket.emit('restart')
                        socket.broadcast.emit('restart')
                    }, 5000)

                    clearInterval(timer);

                }
            }, 1000)
        }
    })

    socket.on('submitanswer', function (data) {
        let currentSocket = null;
        for (let item of allSockets) {
            if (item.username == data.username) {
                currentSocket = item;
                break;
            }
        }
        if (data.answer == titles[currentTitleIndex]) {//回答正确
            socket.broadcast.emit('client msgin', {name: data.username, type: 'rightanswer'})
            currentSocket.emit('client msgin', {name: data.username, type: 'rightanswer'});
            currentSocket.emit('alert answer', {type: 'right'});
            rightAnswers.push(data.answer);

        } else {
            socket.broadcast.emit('client msgin', {name: data.username, type: 'badanswer', answer: data.answer})
            currentSocket.emit('client msgin', {name: data.username, type: 'badanswer', answer: data.answer});
        }
    })

    socket.on('drawimgMove', function (data) {
        console.log(socket.username);
        if (socket.username) {
            socket.emit('client drawmove', {data: data});
            socket.broadcast.emit('client drawmove', {data: data});
        } else {
            socket.emit('login');
        }

    })
    socket.on('clearimg', function () {
        if (socket.username) {
            socket.emit('client clearimg');
            socket.broadcast.emit('client clearimg');
        } else {
            socket.emit('login');
        }

    })
    socket.on('clearimgStart', function (data) {
        if (socket.username) {
            socket.emit('client clearimgStart', {data: data});
            socket.broadcast.emit('client clearimgStart', {data: data});
        } else {
            socket.emit('login');
        }

    })
    socket.on('clearimgMove', function (data) {
        if (socket.username) {
            socket.emit('client clearimgMove', {data: data});
            socket.broadcast.emit('client clearimgMove', {data: data});
        } else {
            socket.emit('login');
        }

    })

    socket.on('userLogined', function (data) {
        // console.log(allSockets)
        if (currentUsers.length == 0) {
            currentUsers.push(data.name);
            allSockets.push(socket)
            socket.username = data.name;

            socket.emit('client msgin', {name: data.name, type: 'login'});
            socket.broadcast.emit('client msgin', {name: data.name, type: 'login'});
            socket.emit('client currentUserList', currentUsers);
            socket.broadcast.emit('client currentUserList', currentUsers);

        } else {
            let userExisted = false;
            for (let item of currentUsers) {
                if (item == data.name) {
                    userExisted = true;
                    // socket.emit('client relogin');
                    break;
                }
            }

            if (!userExisted) {

                socket.username = data.name;
                allSockets.push(socket)
                currentUsers.push(data.name);
                socket.emit('client currentUserList', currentUsers);
                socket.broadcast.emit('client currentUserList', currentUsers);
                socket.emit('client msgin', {name: data.name, type: 'login'});
                socket.broadcast.emit('client msgin', {name: data.name, type: 'login'});

            }
        }

    })
    // console.log(currentUsers)

    socket.on('disconnect', function () {
        // console.log('退出登录')
        // console.log(socket)
        // console.log(socket.username)
        if (socket.username) {
            for (let i = 0; i < currentUsers.length; i++) {
                if (currentUsers[i] == socket.username) {
                    currentUsers.splice(i, 1);
                    allSockets.splice(i, 1)
                    break;
                }
            }

            socket.emit('client msgin', {name: socket.username, type: 'logout'});
            socket.broadcast.emit('client msgin', {name: socket.username, type: 'logout'});
            console.log(currentUsers.length)
            if (currentUsers.length < 2) {
                singleRoungTime = 0;
                socket.emit('client msgin', {name: socket.username, type: 'gameend'});
                socket.broadcast.emit('client msgin', {name: socket.username, type: 'gameend'});
                clearInterval(timer)
                clearTimeout(timeOut)
            }
            socket.username = null;
        }
    })
});


const express = require("express")
const app = express()
const cors = require("cors");
const http = require('http').Server(app);
const PORT = 8000
const socketIO = require('socket.io')(http, {cors: {origin: "https://app.spxswap.com"}});
const request = require('request');

app.use(cors())

function updateClient(postData){
    let clientServerOptions = {
        uri: 'https://api.spxswap.com/api/data/get-data',
        body: JSON.stringify(postData),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }
    request(clientServerOptions);
}

function calcEnergy(user_data) {
    if (user_data.energy < user_data.limit){
        user_data.energy = user_data.energy + 1;
    }
}

function emitEnergy(user_data) {
    user_data.socket.emit("energy",user_data.energy);
}

function emitTop(user_data,level) {
    user_data.socket.emit("top", Number(level));
}

function tap(user_data,amount){
    user_data.socket.emit("top", Number(amount));
    user_data.last = Date.now()
    user_data.energy = user_data.energy - amount;
    user_data.score = user_data.score + amount;
    emitEnergy(user_data);
    emitTop(user_data,amount);
}

socketIO.on('connection', (socket) => {
    let user_data = {
        id: null,
        limit: null,
        speed: null,
        energy: null,
        score: 0,
        last: null,
        flag: false,
        socket: socket,
        energy_calc: null,
        energy_emit: null,
    }

    socket.on("id", data => {
        if (!user_data.id){user_data.id = Number(data.id)}
        if (!user_data.energy){user_data.energy = Number(data.energy)}
        if (user_data.limit < data.limit){user_data.limit = data.limit}
        if (user_data.speed < data.speed){user_data.speed = data.speed}
        if (user_data.id != null && user_data.limit != null && user_data.speed != null && user_data.energy!= null && !user_data.flag){
            user_data.flag = true
            user_data.energy_calc = setInterval(calcEnergy,1000/user_data.speed,user_data)
            user_data.energy_emit = setInterval(emitEnergy,1000,user_data)
        }
    })

    socket.on("tap", data => {
        if (user_data.energy >= Number(data.level)){emitTop(user_data,data.level)}
        else{socket.emit("top", 0);}}
    )

    socket.on("submit", () => {submitWork(user_data)})

    socket.on('disconnect', () => {
        submitWork(user_data)
        user_data.flag = false
        clearTimeout(user_data.energy_calc)
        clearTimeout(user_data.energy_emit)
        socket.disconnect()
    });
});

function submitWork(user_data){
    updateClient({ "id": user_data.id , "click" : user_data.score , "time" : parseInt(String(Number(user_data.last) / 1000)) , "energy_time":parseInt(String(Number(Date.now()) / 1000)) ,"lastEnergy" : user_data.energy })
    user_data.score = 0
    user_data.last = null
}

http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
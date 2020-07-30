const express = require('express');
const server = express();
server.use(express.json());
const port = 5000;
const { get } = require('http');
const { POINT_CONVERSION_COMPRESSED } = require('constants');
const setup = require("../functions/databasesetup");
const utility = require("../functions/utility");

server.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

//utility.getEverySku();

//utility.getDataByEntryCode();

const test = async () => {
    //let getSKU = await utility.getEverySku();
    //console.log(getSKU)
    
    let getData = await utility.getDataByEntryCode("27773-02");
    console.log(getData)
}

test();

server.listen(port, () =>
    console.log(`Server listening on port ${port}!`)
);

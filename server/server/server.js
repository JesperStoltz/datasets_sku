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

const test = async () => {
    //let getSKU = await utility.getEverySku();
    //console.log(getSKU)
    
    //let getData = await utility.getDataByEntryCode("27773-02");
    //console.log(getData)

    let structuredData = await utility.sortAndStructureData("27773-02");
   // console.log(structuredData)
}
test();

server.get('/getskus', async (req, res) => {
    const skus = await utility.getEverySku();
    res.status('200').send(skus);
});

server.get('/getdata/:id', async (req, res) => {
    const skuData = await utility.sortAndStructureData(req.params.id);
    res.status('200').send(skuData);
});

server.listen(port, () =>
    console.log(`Server listening on port ${port}!`)
);

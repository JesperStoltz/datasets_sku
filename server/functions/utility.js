const Datastore = require('nedb');
const moment = require('moment');
const fs = require('fs');

module.exports = setup = {
    //Collect and return data from db based on entryCode
    //To use in data handler.
    getDataByEntryCode: async (entryCode) => {
        const db = await new Datastore({ filename: "../database/" + entryCode + ".db", inMemoryOnly: false, autoload: true });
        const SKU = await new Promise((resolve, reject) => {
            db.find({}, function (err, data) {
                if (err) {
                    res.status('404').end('Couldnt find any products');
                    reject(err);
                }
                else if (data) {
                    resolve(data);
                }
            });
        });
        return SKU;
    }, //End of getDataByEntryCode

    //Get SKU from filenames - Ugly solution for an ugly DB.
    //To use in GET.
    getEverySku: async () => {
        let skusArray = [];
        return await new Promise((resolve, reject) => {
            const skus = fs.readdirSync('../database/');
            skus.forEach(sku => {
                const splitSku = sku.split(".")
                skusArray.push(splitSku[0]);
            });
            resolve(skusArray);
        }); //End of getEverySku
    },

    //To optimize the data collected from getDataByEntryCode()
    sortAndStructureData: async (entryCode) => {
        let data = await module.exports.getDataByEntryCode(entryCode);
        let marketIdObject = {};

        return new Promise((resolve, reject) => {

            //Sorting on MarketId. Might be superfluous later.
            let marketSortedData = data.sort((former, current) => {
                if (former.MarketId < current.MarketId) {
                    return -1;
                }
                else if (former.MarketId > current.MarketId) {
                    return 1;
                }
                else {
                    return 0;
                }
            });

            //Converting the data to an iteratable object with every unique MarketId as keys. Every key is an array of
            //the data with that unique MarketId.
            marketSortedData.forEach(data => {
                if (marketIdObject[data.MarketId]) {
                    marketIdObject[data.MarketId].push(data);
                    marketIdObject[data.MarketId].sort((former, current) => former.ValidFrom > current.ValidFrom);
                }
                else {
                    const marketId = { [data.MarketId]: [data] };
                    marketIdObject = { ...marketIdObject, ...marketId };
                }
            });

            //Final object to contain resolved data.
            let optimizedData = {}

            //Loop1: Loops through iterate object where every key is an array with all of the data of that MarketId
            for (let marketId in marketIdObject) {
                optimizedData = { ...optimizedData, ...{ [marketId]: [] } } //Creates that marketId in the to-be-resolved-object

                let compareArray = []; //For comparisons in Loop2 and Loop3.

                //Loop2: Loop through the array of objects that is inside the key of marketIdObject.
                for (let i = 0; i < marketIdObject[marketId].length; i++) {

                    if (i === 0) {
                        compareArray.push(marketIdObject[marketId][i]);
                    }
                    else {
                        //Loop3: For every index in the array inside the key of marketIdObject, compare with the past looped through indexes.
                        //e.g. i===3, j===2
                        for (let j = 0; j < compareArray.length; j++) {

                            const validFromCurrent = marketIdObject[marketId][i].ValidFrom ? moment(marketIdObject[marketId][i].ValidFrom).format() : moment(new Date).format();
                            const validUntilCurrent = marketIdObject[marketId][i].ValidUntil ? moment(marketIdObject[marketId][i].ValidUntil).format() : moment(new Date).format();
                            const validFromCompare = compareArray[j].ValidFrom ? moment(compareArray[j].ValidFrom).format() : moment(new Date).format();
                            const validUntilCompare = compareArray[j].ValidUntil ? moment(compareArray[j].ValidUntil).format() : moment(new Date).format();

                            //If ValidFrom and ValidUntil are the same, check which has the lowest UnitPrice and keep/set that in the compareArray.
                            if (moment(validFromCompare).isSame(moment(validFromCurrent)) && moment(validUntilCompare).isSame(moment(validUntilCurrent))) {
                                if (marketIdObject[marketId][i].UnitPrice < compareArray[j].UnitPrice) {
                                    compareArray.splice(i, 1, marketIdObject[marketId][i]);
                                }
                                else {
                                    continue;
                                }
                            }
                            //If the index of the compareArray has a ValidFrom OR a ValidUntil that is between the ValidFrom and ValidUntil of the marketIdObject[marketId] index, 
                            //Creates two (possibly 3 depending on overlap) new items dependent on date and price and pushes them into compareArray.
                            else if (moment(validFromCompare).isBetween(moment(validFromCurrent), moment(validUntilCurrent))
                                || moment(validUntilCompare).isBetween(moment(validFromCurrent), moment(validUntilCurrent))) {

                                if (moment(validFromCompare).isBetween(moment(validFromCurrent).subtract(1, "day"), moment(validUntilCurrent).add(1, "day")) &&
                                    moment(validUntilCompare).isBetween(moment(validFromCurrent).subtract(1, "day"), moment(validUntilCurrent).add(1, "day"))) {

                                    //If the entire compareArray[j] is between marketIdObject[marketId][i]:s ValidFrom and ValidUntil
                                    if (marketIdObject[marketId][i].UnitPrice <= compareArray[j].UnitPrice) {
                                        compareArray.splice(j, 1, marketIdObject[marketId][i]);
                                    }
                                    else {
                                        let compareItem = { ...compareArray[j] };
                                        let marketItem = { ...marketIdObject[marketId][i] };
                                        let continueItem = { ...marketIdObject[marketId][i] };

                                        marketItem = { ...marketItem, ValidUntil: compareItem.ValidFrom };
                                        continueItem = { ...continueItem, ValidFrom: compareItem.ValidUntil };

                                        compareArray.splice(j, 1, marketItem);
                                        compareArray.splice(j, 0, compareItem);
                                        
                                        if (moment(continueItem.ValidFrom).format() !== moment(continueItem.ValidUntil).format()) {
                                            compareArray.splice(j + 1, 0, continueItem);
                                        }
                                    }
                                }
                                else {
                                    if (moment(validFromCompare).isBefore(moment(validFromCurrent))) {
                                        //If ValidFrom is earlier in compareArray[j] than in marketIdObject[marketId][i].
                                        let compareItem = { ...compareArray[j] };
                                        let marketItem = { ...marketIdObject[marketId][i] };

                                        if (compareItem.UnitPrice < marketIdObject[marketId][i].UnitPrice) {
                                            //If compareItem has a better UnitPrice than marketItem AND is before in ValidFrom.
                                            marketItem = { ...marketItem, ValidFrom: compareItem[i].ValidUntil };
                                            compareArray.splice(j, 0, marketItem);
                                        }
                                        else {
                                            //If marketItem has lower UnitPrice than compareItem AND after in ValidFrom.
                                            compareItem = { ...compareItem, ValidUntil: marketItem.ValidFrom };

                                            compareArray.splice(j, 1, compareItem);
                                            compareArray.splice(j, 0, marketItem);
                                        }
                                    }
                                    else if (moment(validUntilCompare).isAfter(moment(validUntilCurrent))) {
                                        //IF ValidUntil is later in compareArray[j] than in marketIdObject[marketId][i].
                                        let compareItem = { ...compareArray[j] };
                                        let marketItem = { ...marketIdObject[marketId][i] };
                                        if (compareItem.UnitPrice < marketItem.UnitPrice) {
                                            //If compareItem has a lower UnitPrice than marketIdObject[marketId][i]
                                            marketItem = { ...marketItem, ValidUntil: compareItem.ValidFrom }
                                            compareArray.splice(j - 1, 0, compareItem);
                                        }
                                        else {
                                            //If marketItem has lower UnitPrice than compareItem AND before in ValidFrom.
                                            compareItem = { ...compareItem, ValidFrom: marketItem.ValidUntil };

                                            compareArray.splice(j, 1, marketItem);
                                            compareArray.splice(j + 1, 0, compareItem);
                                        }
                                    }
                                }
                            } //End of IF: compareArray[j] has either a ValidFrom or a ValidUntil between marketIdObject[marketId][i]:s.

                            //If the index of the marketIdObject[marketId] has a ValidFrom OR a ValidUntil that is between the ValidFrom and ValidUntil of the compareArray,
                            else if (moment(validFromCurrent).isBetween(moment(validFromCompare), moment(validUntilCompare))
                                || moment(validUntilCurrent).isBetween(moment(validFromCompare), moment(validUntilCompare))) {

                                //If marketIdObject[marketId][i] is between both ValidFrom and ValidUntil of compareArray[j];
                                if (moment(validFromCurrent).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day")) &&
                                    moment(validUntilCurrent).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {

                                    if (compareArray[j].UnitPrice <= marketIdObject[marketId][i].UnitPrice) {
                                        continue;
                                    }
                                    else { //If UnitPrice is lower on marketIdObject[marketId][i]

                                        let compareItem = { ...compareArray[j] };
                                        let marketItem = { ...marketIdObject[marketId][i] }
                                        let continueItem = { ...compareArray[j] }

                                        compareItem = { ...compareItem, ValidUntil: marketItem.ValidFrom };
                                        continueItem = { ...continueItem, ValidFrom: marketItem.ValidUntil };

                                        compareArray.splice(j, 1, compareItem);
                                        compareArray.splice(j, 0, marketItem);
                                        if (moment(continueItem.ValidFrom).format() !== moment(continueItem.ValidUntil).format()) {
                                            compareArray.splice(j + 1, 0, continueItem);
                                        }
                                    }
                                }
                                else if (moment(validFromCurrent).isBefore(moment(validFromCompare))) {
                                    let marketItem = { ...marketIdObject[marketId][i] };
                                    let compareItem = { ...compareArray[j] };

                                    if (marketItem.UnitPrice <= compareItem.UnitPrice) {
                                        compareItem = { ...compareItem, ValidFrom: marketItem.ValidUntil };

                                        compareArray.splice(j, 1, marketItem);
                                        compareArray.splice(j, 0, compareItem);
                                    }
                                    else { //If UnitPrice is less on compareItem
                                        marketItem = { ...marketItem, ValidUntil: compareItem.ValidFrom };
                                        compareArray.splice(j - 1, 0, marketItem);
                                    }
                                }
                                else if (moment(validUntilCurrent).isAfter(moment(validUntilCompare))) {
                                    let compareItem = { ...compareArray[j] };
                                    let marketItem = { ...marketIdObject[marketId][i] };

                                    if (marketItem.UnitPrice <= compareItem.UnitPrice) {
                                        compareItem = { ...compareItem, ValidUntil: marketItem.ValidFrom };
                                        compareArray.splice(j, 1, compareItem);
                                        compareArray.splice(j, 0, marketItem);
                                    }
                                    else { //If UnitPrice is less on compareItem
                                        marketItem = { ...marketItem, ValidFrom: compareItem.ValidUntil };
                                        compareArray.splice(j, 0, marketItem);
                                    }
                                }
                                //If the two indexes compares has no data collision, pushes item into compareArray. 
                                else {
                                    compareArray.push(marketIdObject[marketId][i]);
                                }
                            }
                        }//End of Loop3 (for let=j)
                    }
                }//End of Loop2 (for let=i)
                optimizedData[marketId] = compareArray;
            } //End of Loop1 (iterate object)
            resolve(optimizedData)
        });
    }//End of sortAndStructureData()
}
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

    optimizeData: async (entryCode) => {

        let data = await module.exports.getDataByEntryCode(entryCode);
        let marketIdObject = {};

        return new Promise((resolve, reject) => {

            //Sorting on MarketId. Might be superfluous later.
            let validDateSortedData = data.sort((former, current) => {
                if (former.ValidFrom < current.ValidFrom) {
                    return -1;
                }
                else if (former.ValidFrom > current.ValidFrom) {
                    return 1;
                }
                else {
                    return 0;
                }
            });

            //Converting the data to an iteratable object with every unique MarketId as keys. Every key is an array of
            //the data with that unique MarketId.
            validDateSortedData.forEach(data => {
                if (marketIdObject[data.MarketId]) {
                    if (marketIdObject[data.MarketId][data.CurrencyCode]) {
                        marketIdObject[data.MarketId][data.CurrencyCode].push(data);
                    }
                    else {
                        let currencyObject = { [data.CurrencyCode]: [] }
                        marketIdObject[data.MarketId] = { ...marketIdObject[data.MarketId], ...currencyObject }
                        marketIdObject[data.MarketId][data.CurrencyCode].push(data)
                    }
                }
                else {
                    marketIdObject[data.MarketId] = {};
                    let currencyObject = { [data.CurrencyCode]: [] };
                    marketIdObject[data.MarketId] = { ...marketIdObject[data.MarketId], ...currencyObject };
                    marketIdObject[data.MarketId][data.CurrencyCode].push(data);
                }
            });

            //Final object to contain resolved data.

            for (let market in marketIdObject) {

                for (let currency in marketIdObject[market]) {
                    if (market !== "sv") { continue; }
                    const runLoop = async () => {
                        let data = await module.exports.loopAndOrganizeData(marketIdObject[market][currency]);
                        let noDatesCollided = await module.exports.noDatesCollide(data);
                        //console.log(noDatesCollided)
                        //console.log(currency)
                        if (!noDatesCollided) {
                            runLoop();
                        }
                    }
                    runLoop();

                } //End of for (let currency in marketIdObject[market])

            } //End of for (let market in marketIdObject)

            resolve(marketIdObject)
        })//End of Promise
    }, //End of optimizeData

    noDatesCollide: async (currencyArray) => {

        return new Promise((resolve, reject) => {

            for (let i = 1; i < currencyArray.length; i++) {


                let compareItem = currencyArray[i - 1];
                let marketItem = currencyArray[i];

                const validFromMarket = marketItem.ValidFrom ? moment(marketItem.ValidFrom).format() : moment(new Date).format();
                const validUntilMarket = marketItem.ValidUntil ? moment(marketItem.ValidUntil).format() : moment(new Date).format();
                const validFromCompare = compareItem.ValidFrom ? moment(compareItem.ValidFrom).format() : moment(new Date).format();
                const validUntilCompare = compareItem.ValidUntil ? moment(compareItem.ValidUntil).format() : moment(new Date).format();

                if (moment(validFromCompare).isSame(moment(validFromMarket)) && moment(validUntilCompare).isSame(moment(validUntilMarket))) {
                    //Exact same dates
                    resolve(false);
                }
                else if (moment(validFromMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day")) &&
                    moment(validUntilMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {
                    //[i] is between the dates of [i-1]
                    resolve(false);
                }
                else if (moment(validFromCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day")) &&
                    moment(validUntilCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day"))) {
                    //[i-1] is between the dates of [i]
                    resolve(false);
                }
                else if (moment(validFromMarket).isBefore(moment(validFromCompare)) && //Börja fixa här
                    moment(validUntilMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {
                    //[i] starts before [i-1] and ends between the dates of [i-1]
                    resolve(false);
                }
                else if (moment(validUntilMarket).isAfter(moment(validUntilCompare)) &&
                    moment(validFromMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {
                    //[i] ends after [i-1] and starts between the dates of [i-1]
                    resolve(false);
                }
                else if (moment(validFromCompare).isBefore(moment(validFromMarket)) &&
                    moment(validUntilCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day"))) {
                    //[i-1] starts before [i] and ends between the dates of [i]
                    resolve(false);
                }
                else if (moment(validUntilCompare).isAfter(moment(validUntilMarket)) &&
                    moment(validFromCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day"))) {
                    //[i-1] ends after [i] and starts between the dates of [i]
                    resolve(false);
                }
                else {
                    resolve(true);
                }

            }

        });

    }, //End of noDatesCollide

    loopAndOrganizeData: async (array) => {

        return new Promise((resolve, reject) => {

            for (let i = 1; i < array.length; i++) {

                 if (i === 1) {
                    console.log("===========1===========")
                    console.log(array);
                }
                if (i === 2) {
                    console.log("===========2===========")
                    console.log(array)
                } 

                let compareItem = array[i - 1];
                let marketItem = array[i];

                const validFromMarket = marketItem.ValidFrom ? moment(marketItem.ValidFrom).format() : moment(new Date).format();
                const validUntilMarket = marketItem.ValidUntil ? moment(marketItem.ValidUntil).format() : moment(new Date).format();
                const validFromCompare = compareItem.ValidFrom ? moment(compareItem.ValidFrom).format() : moment(new Date).format();
                const validUntilCompare = compareItem.ValidUntil ? moment(compareItem.ValidUntil).format() : moment(new Date).format();

                //If compareItem and marketItem has the EXACT same dates (ValidFrom & ValidUntil)
                if (moment(validFromCompare).isSame(moment(validFromMarket)) && moment(validUntilCompare).isSame(moment(validUntilMarket))) {

                    if (marketItem.UnitPrice < compareItem.UnitPrice) { //If [i] has a lower price than [i-1]

                        array.splice(i - 1, 1);

                    }
                    else if (compareItem.UnitPrice <= marketItem.UnitPrice) { //If [i-1] has the lower or equal price than [i]

                        array.splice(i, 1);

                    }

                }
                else if (moment(validFromMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day")) &&
                    moment(validUntilMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {
                    //If the current [i] is completely between the [i-1]s ValidFrom and ValidUntil

                    if (compareItem.UnitPrice <= marketItem.UnitPrice) {//If the [i-1] has a lower price than [i]

                        array.splice(i, 1); //If the [i] has the same or higher price and is inside [i-1], remove it completely.

                    }
                    else if (marketItem.UnitPrice < compareItem.UnitPrice) { //if [i] has a lower price than [i-j]

                        let continueItem = { ...compareItem, ValidFrom: marketItem.ValidUntil }; //Break [i-1] into two items and set the second one end where [i] ends
                        compareItem = {...compareItem, ValidUntil: marketItem.ValidFrom }

                        array.splice(i-1, 1, compareItem)

                        if (continueItem.ValidFrom !== continueItem.ValidUntil) { //If the second item doesn't start and end on the same day (=== conflicting with [i])
                            array.splice(i + 1, 0, continueItem); //then put the second item after the [i]
                        };

                    }
                } //End of If compareItem is between the dates of marketItem
                else if (moment(validFromCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day")) &&
                    moment(validUntilCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day"))) {
                    //If the current [i-1] is completely between the [i]s ValidFrom and ValidUntil

                    if (marketItem.UnitPrice <= compareItem.UnitPrice) { //If the [i] has a lower or equal price compared to [i-1]

                        array.splice(i - 1, 1); //Remove it completely

                    }
                    else if (compareItem.UnitPrice < marketItem.UnitPrice) { //If the [i-1] has a lower price compared to [i-1]

                        let continueItem = { ...compareItem, ValidFrom: marketItem.ValidUntil }; //Break [i] into two items and set the second one to start where [i-1] ends
                        marketItem = { ...marketItem, ValidUntil: compareItem.ValidFrom }; //And set the second one to end where [i-1] starts

                        array.splice(i, 1, marketItem); //Remove the old [i] and replace it with the first item

                        if (continueItem.ValidFrom !== continueItem.ValidUntil) {//If the second item doesn't start and end on the same day (=== conflicting with [i])
                            array.splice(i + 1, 0, continueItem); //Place the second item after the [i]
                        }

                    }

                } //End of If marketItem is between the dates of compareItem
                else if (moment(validFromMarket).isBefore(moment(validFromCompare)) &&
                    moment(validUntilMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {
                    //If [i] starts before [i-1] and ends in between [i-1]s dates

                    if (marketItem.UnitPrice === compareItem.UnitPrice) { //If [i] and [i-1] has the same price

                        marketItem = { ...marketItem, ValidFrom: compareItem.ValidFrom }; //Put the [i-1] start date on the [i]
                        array.splice(i - 1, 1, marketItem); //Place it on the [i-1] 
                        array.splice(i, 1); //and then remove the [i]
                    }
                    else if (marketItem.UnitPrice < compareItem.UnitPrice) {// If [i] has a lower price than [i-1]

                        compareItem = { ...compareItem, ValidFrom: marketItem.ValidUntil }; //Set [i-1] to have start date where [i] ends.
                        array.splice(i - 1, 1, compareItem); //Remove the original [i-1] and replace it with the new one.
                        array.splice(i - 1, 0, marketItem)
                        array.splice(i + 1, 1);

                    }
                    else if (compareItem.UnitPrice < marketItem.UnitPrice) { //If [i-1] has a lower price than [i]

                        marketItem = { ...marketItem, validUntil: compareItem.ValidFrom }; //Set [i]s to end where [i-1] starts
                        array.splice(i, 1, marketItem); //Remove the original [i] and replace it with the new one.

                    }

                } //End of If marketItems ValidFrom is before compareItems, AND has a ValidUntil between compareItems dates.
                else if (moment(validUntilMarket).isAfter(moment(validUntilCompare)) &&
                    moment(validFromMarket).isBetween(moment(validFromCompare).subtract(1, "day"), moment(validUntilCompare).add(1, "day"))) {
                    //If [i] ends after [i-1] and has a start date that is between [i-1] ValidFrom and ValidUntil

                    if (marketItem.UnitPrice === compareItem.UnitPrice) { //If [i] and [i-1] has the same price

                        compareItem = { ...compareItem, ValidUntil: marketItem.ValidUntil }; //Set the [i-1] to end when [i] ends
                        array.splice(i - 1, 1, compareItem); //Remove the original [i-1] and replace it with the new, and remove the [i]
                        array.splice(i, 1);
                    }
                    else if (marketItem.UnitPrice < compareItem.UnitPrice) { //If [i] has a lower price than [i-1]

                        compareItem = { ...compareItem, ValidUntil: marketItem.ValidFrom }; //Set [i-1] to end where [i] starts

                        array.splice(i - 1, 1, compareItem); //Remove the original [i-1] and replace it with the new one.

                    }
                    else if (compareItem.UnitPrice < marketItem.UnitPrice) { //If [i-1] has a lower price than [i]

                        marketItem = { ...marketItem, ValidFrom: compareItem.ValidUntil }; //Set [i] to start where [i-1] ends
                        array.splice(i, 1, marketItem); //Remove the original [i] and replace it with the new one

                    }

                } //End of If marketItems ValidUntil is after compareItems, AND has a ValidFrom between compareItems dates
                else if (moment(validFromCompare).isBefore(moment(validFromMarket)) &&
                    moment(validUntilCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day"))) {
                    //If [i-1] starts before [i] and has an end date between [i]s ValidFrom and ValidUntil

                    if (marketItem.UnitPrice === compareItem.UnitPrice) { //If [i] and [i-1] has the same price 

                        compareItem = { ...compareItem, ValidUntil: marketItem.ValidUntil }; //Set [i-1] to end where [i] ends.
                        array.splice(i - 1, 1, compareItem); //Remove the original [i-1] and replace it with the new. Then remove the [i]
                        array.splice(i, 1);
                    }
                    else if (compareItem.UnitPrice < marketItem.UnitPrice) { //If [i-1] has a lower price than [i]

                        marketItem = { ...marketItem, ValidFrom: compareItems.ValidUntil }; //Set [i] to start where [i-1] ends
                        array.splice(i, 1, marketItem); //Remove the original [i] and replace it with the new

                    }
                    else if (marketItem.UnitPrice < compareItem.UnitPrice) { //If [i] has a lower price than [i-1]

                        compareItem = { ...compareItem, ValidUntil: marketItem.ValidFrom }; //Set [i-1] to end where [i] starts
                        array.splice(i - 1, 1, compareItem); //Remove the original [i-1] and replace it with the new.

                    }

                } //End of If compareItems ValidFrom is before compareItems, AND has a ValidUntil between compareItems dates
                else if (moment(validUntilCompare).isAfter(moment(validUntilMarket)) &&
                    moment(validFromCompare).isBetween(moment(validFromMarket).subtract(1, "day"), moment(validUntilMarket).add(1, "day"))) {
                    //If [i-1] ends after [i] and has a start between [i]s ValidFrom and ValidUntil

                    if (marketItem.UnitPrice === compareItem.UnitPrice) { //If [i] and [i-1] has the same price

                        marketItem = { ...marketItem, ValidUntil: compareItem.ValidUntil }; //Set [i] to have the end date if [i-1]
                        array.splice(i, 1, marketItem); //Remove the original [i] and replace it with the new, then remove [i-1]
                        array.splice(i - 1, 1);
                    }
                    else if (compareItem.UnitPrice < marketItem.UnitPrice) { //If [i-1] has a lower price than [i]

                        marketItem = { ...marketItem, ValidUntil: compareItem.ValidFrom }; //Set [i] to end where [i-1] starts
                        array.splice(i, 1, marketItem); //Remove the original [i] and replace it with the new.

                    }
                    else if (marketItem.UnitPrice < compareItem.UnitPrice) { //If [i] has a lower price than [i-1]

                        compareItem = { ...compareItem, ValidFrom: marketItem.ValidUntil }; //Set [i-1] to start where [i] ends
                        array.splice(i - 1, 1, compareItem); //Remove the original [i-1] and replace it with the new.

                    }

                } //End of If compareItems ValidUntil is after compareItems, AND has a ValidFrom between compareItems dates

            } //End of for (let i=0; i < marketIdObject[market][currency].length; i)
            resolve(array);
        }); //End of Promise

    }
}
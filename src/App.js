import React, { useState, useEffect } from 'react';
import Table from "./Components/Table/Table";
import Sidebar from "./Components/Sidebar/Sidebar";
const axios = require('axios');

const App = () => {
  const [skus, setSkus] = useState([]);
  const [skuID, setSkuID] = useState("2773-02");
  const [skuData, setSkuData] = useState([]);

  const updateSkuId = (id) => {

    setSkuID(id);
  };

  console.log(skuID)

  useEffect(() => {
    axios.get("http://localhost:5000/getskus")
      .then(function (response) {
        let sortedSku = response.data.reverse()
        setSkus(sortedSku);
      })
      .catch(function (error) {
        console.log(error);
      });
  }, []);

  useEffect(() => {
      axios.get("http://localhost:5000/getdata/" + skuID)
        .then(function (response) {
          let data = response.data;
          console.log(data)
          let skuArray = [];


          for (let marketId in data) {
            console.log(data[marketId])
             for (let currency in data[marketId]) {
                for (let index in data[marketId][currency]) {
                  skuArray.push(data[marketId][currency][index]);
                }
            } 
          } 
          setSkuData(skuArray);
        })
        .catch(function (error) {
          console.log(error);
        });
  }, [skuID]);


  return (
    <div className="App">
      <Sidebar skus={skus} updateSkuId={updateSkuId} />
      <main>
        <Table skuData={skuData} />
      </main>
    </div>
  );
}

export default App;

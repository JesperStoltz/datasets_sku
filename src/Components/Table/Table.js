import React from 'react';
import "./Table.css";
const moment = require('moment');

const Table = (props) => {

   let skuData = props.skuData.map(data => {

    let validFrom = data.ValidFrom ? moment(data.ValidFrom).format("YYYY-MM-DD HH:mm:ss") : null;

    let validUntil = data.ValidUntil ? moment(data.ValidUntil).format("YYYY-MM-DD HH:mm:ss") : null;

    return (
      <tr>
        <td>{data.MarketId}</td><td>{data.UnitPrice}</td><td>{data.CurrencyCode}</td><td>{validFrom} - {validUntil}</td>
      </tr>
    )
  });

  return (
    <div id="Table">
        <table>
          <thead>
            <tr><th>Marknad</th><th>Pris</th><th>Valuta</th><th>Start och slut</th></tr>
          </thead>
          <tbody>
            {skuData}
          </tbody>
        </table>
    </div>
  );
}

export default Table;

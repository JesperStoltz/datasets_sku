import React from 'react';
import "./Sidebar.css"

const Sidebar = (props) => {

    let links = props.skus.map(sku => {
        return (
          <>
            <a key={sku} id= {sku} href="#" onClick={() => { props.updateSkuId(sku) }}>{sku}</a><br />
          </>
        )
      })

  return (
    <aside id="Sidebar">
        {links}
    </aside>
  );
}

export default Sidebar;

// import React from 'react';
// import { useTranslation } from 'react-i18next';
  const { t } = useTranslation();

// import { useTranslation } from 'react-i18next';
import { useTranslation } from 'react-i18next';
const ProductList = () => {
  const { t } = useTranslation();

 
//   const EXAMPLES = [
//     {
//         text: t('Wheel_allow_of_nissan_magnite'),
//         value: t("Wheel alloy of the Nissan Magnite?")
//     },
//     {
//         text: "Features of the Nissan Magnite?",
//         value: "Features of the Nissan Magnite?"
//     },
//     {
//         text: "Latest model of the Nissan magnite?",
//         value: "Latest model of the Nissan magnite?"
//     },
    
// ];
  // This array is defined and mapped within the same component
  // so it should be picked up by our translation script
  const products = [
    { id: 1, name: "Professional Camera", price: 599.99, category: "Electronics" },
    { id: 2, name: "Wireless Headphones", price: 149.99, category: "Audio" },
    { id: 3, name: "Ergonomic Office Chair", price: 249.99, category: "Furniture" },
    { id: 4, name: "Smart Watch", price: 199.99, category: "Wearables" },
    { id: 5, name: "Coffee Maker", price: 89.99, category: "Kitchen Appliances" }
  ];

  return (
    <div className="product-container">
      <h2>{t('Example.jhyhcd')}</h2>
      <p>{t('Example.ueicdoi')}</p>
      
      <div className="product-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <h3>{product.name}</h3>
            <p className="category">{product.category}</p>
            <p className="price">${product.price.toFixed(2)}</p>
            <button className="add-to-cart">{t('Example.nunhui')}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
// import { useTranslation } from 'react-i18next';
// import React from 'react'

// export default function Price() {
//   const { t } = useTranslation();
//   return (
//     <div>
//       {t('Price.pricenhuhudfhijdf')
//     }</div>
//   )
// }


import { useTranslation } from 'react-i18next';
import React from 'react'

const Price = () => {
  const { t } = useTranslation();
  return (
    <div>
      {t('Price.Hello_pricing')
    }</div>
  )
}

export default Price

// // import React from 'react'

// import { useTranslation } from 'react-i18next';
//   const { t } = useTranslation();
// const test1 = () => {
//   const { t } = useTranslation();
//   return (
//     <div>
//       {t('test1.jnidiojcd')
//     }</div>
//   )
// }

// export default test1

import { useTranslation } from 'react-i18next';
import React from 'react'

export default function test1() {
  const { t } = useTranslation();
  return (
    <div>
      {t('test1.hello_test') 
    }</div>
  )
}


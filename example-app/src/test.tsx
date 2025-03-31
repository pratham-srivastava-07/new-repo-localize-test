// import { useTranslation } from 'react-i18next';
// import React from 'react'

// const test = () => {
//   const { t } = useTranslation();
//   return (
//     <div>
//       {t('test.jkjockopkkc')
//     }</div>
//   )
// }

// export default test
import { useTranslation } from 'react-i18next';
import React from 'react'

export default function test() {
  const { t } = useTranslation();
  let flag = false;

  if (!flag) {
    return <div>{t('test.false')}</div>
  }
  return (
    <div>
      {t('test.jnhujci')
    }</div>
  )
}

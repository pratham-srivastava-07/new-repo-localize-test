import { useTranslation } from 'react-i18next';
import React from 'react'

const Example = () => {
  const { t } = useTranslation();
  return (
    <div>
      {t('Example.hello_example')
    }</div>
  )
}

export default Example

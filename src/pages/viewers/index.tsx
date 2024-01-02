import React, { useContext, useEffect } from 'react'
import { MainContext } from '../../context'
import PDFViewer from './pdf';
import SlidesViewer from './googleslides';

const DocViewer = () => {
  const { doc } = useContext(MainContext);

  if (doc?.type === 'googleslides') return <SlidesViewer />
  return <PDFViewer />
}

export default DocViewer